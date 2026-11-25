package com.oriens.oriens_api.work;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.ObjectMapper;
import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.dto.work.*;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.*;
import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.repository.*;
import com.oriens.oriens_api.service.ProjectWorkService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.*;

/** Run only through ops/postgres-tests.sh, against its disposable database migrated by Flyway. */
@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=${P1_JDBC_URL}", "spring.datasource.username=postgres",
        "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.show-sql=false", "spring.jpa.properties.hibernate.jdbc.time_zone=UTC"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "P1_JDBC_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/oriens_(p1|mcp)_proof")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({com.oriens.oriens_api.service.TaskLabelService.class, ProjectWorkService.class, ProjectWorkPostgresTest.FixedClock.class})
class ProjectWorkPostgresTest {
    @TestConfiguration static class FixedClock {
        @Bean Clock clock() { return Clock.fixed(Instant.parse("2026-11-14T02:30:00Z"), ZoneOffset.UTC); }
    }
    @Autowired ProjectWorkService service;
    @Autowired com.oriens.oriens_api.service.TaskLabelService taskLabels;
    @Autowired TaskLabelRepository labelRepository;
    @Autowired TaskLabelAssignmentRepository labelAssignments;
    @Autowired ProjectRepository projects;
    @Autowired ObjectiveRepository objectives;
    @Autowired ProjectColumnRepository columns;
    @Autowired TaskRepository tasks;
    @Autowired UserRepository users;
    @Autowired EntityManager em;
    @Autowired PlatformTransactionManager manager;
    Long owner;
    Long stranger;

    <T> T tx(Supplier<T> action) { return new TransactionTemplate(manager).execute(status -> action.get()); }
    void run(Runnable action) { tx(() -> { action.run(); return null; }); }
    @BeforeEach void fixture() {
        owner = tx(() -> user("A").getId());
        stranger = tx(() -> user("B").getId());
    }
    User user(String name) {
        User user = new User(); user.setName(name); user.setEmail(UUID.randomUUID() + "@example.invalid");
        user.setPassword("synthetic-not-a-login"); return users.save(user);
    }
    Project project(ProjectMode mode) {
        return service.createProject(owner, new CreateProject(" Meu projeto ", mode, null, null, List.of()));
    }
    Project current(Project project) { return projects.findById(project.getId()).orElseThrow(); }
    List<ProjectColumn> board(Project p) { return columns.findByProjectIdOrderByPositionAscIdAsc(p.getId()); }
    Task task(Project p, Long objective, LocalDate plan, LocalTime time, LocalDate due) {
        return service.createTask(owner, new CreateTask("Ação", null, p == null ? null : p.getId(),
                p == null ? null : current(p).getVersion(), objective, null, plan, time, due, null, null, List.of()));
    }
    PatchTask patch(Task task) { PatchTask p = new PatchTask(); p.setVersion(task.getVersion());
        if (task.getProjectId() != null) p.setProjectVersion(projects.findById(task.getProjectId()).orElseThrow().getVersion());
        return p; }
    PatchTask move(Task t, Project p, Long column) {
        PatchTask patch = patch(t); patch.setProjectVersion(current(p).getVersion()); patch.setColumnId(column); return patch;
    }
    void rejected(Runnable operation, String code) {
        assertThatThrownBy(operation::run).isInstanceOfSatisfying(WorkDomainException.class,
                error -> assertThat(error.getCode()).isEqualTo(code));
    }

    @Test void simpleAndDevelopmentHaveStableObjectivesAndExactlyTheDefaultBoard() {
        Project simple = project(ProjectMode.SIMPLE);
        assertThat(board(simple)).isEmpty();
        assertThat(simple.getDefaultPendingColumnId()).isNull();
        Objective objective = service.createObjective(owner, simple.getId(), new CreateObjective(simple.getVersion(), "Resultado", null));
        assertThat(objective.getId()).isPositive();
        Project converted = service.convertProject(owner, simple.getId(), current(simple).getVersion(), ProjectMode.DEVELOPMENT);
        assertThat(board(converted)).extracting(ProjectColumn::getName).containsExactly("Backlog", "To-Do", "In Progress", "Done", "Cancelled");
        assertThat(board(converted)).extracting(ProjectColumn::getKind)
            .containsExactly(Status.BACKLOG, Status.PENDING, Status.ON_DOING, Status.CONCLUDED, Status.CANCELLED);
        assertThat(objectives.findById(objective.getId())).isPresent();
        service.convertProject(owner, simple.getId(), current(simple).getVersion(), ProjectMode.DEVELOPMENT);
        assertThat(board(simple)).hasSize(5);
        assertThat(current(simple).getDefaultPendingColumnId()).isEqualTo(board(simple).get(0).getId());
        assertThat(current(simple).getDefaultCompletedColumnId()).isEqualTo(board(simple).get(3).getId());
        Project development = project(ProjectMode.DEVELOPMENT);
        assertThat(board(development)).hasSize(5);
        // A new project task lands in the backlog, a state of its own.
        assertThat(task(development, null, null, null, null).getStatus()).isEqualTo(Status.BACKLOG);
    }

    @Test void noPriorityAndUrgentAreStoredByTheDatabase() {
        Task task = task(null, null, null, null, null);
        assertThat(storedPriority(task)).isEqualTo("NONE");
        PatchTask patch = patch(task); patch.setPriority(Priority.URGENT);
        service.patchTask(owner, task.getId(), patch);
        assertThat(storedPriority(task)).isEqualTo("URGENT");
    }

    private Object storedPriority(Task task) {
        return em.createNativeQuery("select priority from tasks where id = ?1").setParameter(1, task.getId()).getSingleResult();
    }

    @Test void nullableDatesPriorityInstantAndPlanningAreIndependent() {
        Project project = project(ProjectMode.DEVELOPMENT);
        Task unscheduled = task(project, null, null, null, null);
        assertThat(unscheduled.getPlannedDate()).isNull(); assertThat(unscheduled.getStartTime()).isNull();
        assertThat(unscheduled.getDueDate()).isNull(); assertThat(unscheduled.getPriority()).isEqualTo(Priority.NONE);
        assertThat(unscheduled.getCreatedAt()).isNotNull();
        LocalDate due = LocalDate.of(2026, 11, 20);
        Task scheduled = task(null, null, due.minusDays(2), LocalTime.NOON, due);
        PatchTask patch = patch(scheduled); patch.setPlannedDate(null);
        Task removed = service.patchTask(owner, scheduled.getId(), patch);
        assertThat(removed.getStartTime()).isNull(); assertThat(removed.getDueDate()).isEqualTo(due);
        rejected(() -> task(null, null, null, LocalTime.NOON, null), "DOMAIN_VIOLATION");
        rejected(() -> task(project(ProjectMode.SIMPLE), null, null, null, null), "DOMAIN_VIOLATION");
    }

    @Test void completionUsesRecifeIsIdempotentAndNeverCompletesObjective() {
        Project project = project(ProjectMode.DEVELOPMENT);
        Objective objective = service.createObjective(owner, project.getId(), new CreateObjective(project.getVersion(), "Resultado", null));
        Task task = task(project, objective.getId(), null, null, null);
        PatchTask finish = patch(task); finish.setProjectVersion(current(project).getVersion()); finish.setStatus(Status.CONCLUDED);
        Task done = service.patchTask(owner, task.getId(), finish);
        assertThat(done.getCompletedAt()).isEqualTo(LocalDate.of(2026, 11, 13));
        ProjectColumn extra = service.createColumn(owner, project.getId(), new CreateColumn(current(project).getVersion(), "Entregue", Status.CONCLUDED));
        Task moved = service.patchTask(owner, done.getId(), move(done, project, extra.getId()));
        assertThat(moved.getCompletedAt()).isEqualTo(done.getCompletedAt());
        PatchTask again = patch(moved); again.setStatus(Status.CONCLUDED); again.setProjectVersion(current(project).getVersion());
        Task repeated = service.patchTask(owner, moved.getId(), again);
        assertThat(repeated.getCompletedAt()).isEqualTo(done.getCompletedAt());
        assertThat(objectives.findById(objective.getId()).orElseThrow().getStatus()).isEqualTo(ObjectiveStatus.PENDING);
        PatchTask reopen = patch(repeated); reopen.setProjectVersion(current(project).getVersion()); reopen.setStatus(Status.PENDING);
        Task reopened = service.patchTask(owner, task.getId(), reopen);
        assertThat(reopened.getCompletedAt()).isNull();
        // Asking for To-Do (not the backlog) finds the board's first To-Do column.
        assertThat(reopened.getStatus()).isEqualTo(Status.PENDING);
        assertThat(reopened.getColumnId()).isEqualTo(board(project).stream().filter(c -> c.getKind() == Status.PENDING).findFirst().orElseThrow().getId());
        PatchTask shelve = patch(reopened); shelve.setProjectVersion(current(project).getVersion()); shelve.setStatus(Status.BACKLOG);
        Task shelved = service.patchTask(owner, task.getId(), shelve);
        assertThat(shelved.getStatus()).isEqualTo(Status.BACKLOG);
        assertThat(shelved.getColumnId()).isEqualTo(project.getDefaultPendingColumnId());
        reopened = shelved;
        PatchTask cancel = patch(reopened); cancel.setProjectId(null); cancel.setStatus(Status.CANCELLED);
        cancel.setProjectVersion(current(project).getVersion());
        assertThat(service.patchTask(owner, task.getId(), cancel).getCompletedAt()).isNull();
    }

    @Test void editingObjectiveDoesNotToggleAndPatchPreservesAbsentFields() throws Exception {
        Project project = project(ProjectMode.SIMPLE);
        Objective objective = service.createObjective(owner, project.getId(), new CreateObjective(project.getVersion(), "Resultado", LocalDate.of(2028, 2, 29)));
        ObjectMapper mapper = JsonMapper.builder().build();
        PatchObjective patch = mapper.readValue("{\"version\":0,\"title\":\"Novo nome\"}", PatchObjective.class);
        Objective edited = service.patchObjective(owner, project.getId(), objective.getId(), patch);
        assertThat(edited.getStatus()).isEqualTo(ObjectiveStatus.PENDING);
        assertThat(edited.getDueDate()).isEqualTo(LocalDate.of(2028, 2, 29));
        PatchObjective clear = new PatchObjective(); clear.setVersion(edited.getVersion()); clear.setDueDate(null);
        Objective cleared = service.patchObjective(owner, project.getId(), objective.getId(), clear);
        assertThat(cleared.getDueDate()).isNull(); assertThat(cleared.getTitle()).isEqualTo("Novo nome");
        assertThatThrownBy(() -> mapper.readValue("{\"dueDate\":\"2026-02-29\"}", PatchObjective.class)).isInstanceOf(Exception.class);
    }

    @Test void columnsRenameOrderMoveAndRejectUnsafeMeaningOrMissingDestination() {
        Project project = project(ProjectMode.DEVELOPMENT);
        Task task = task(project, null, null, null, null);
        ProjectColumn source = board(project).get(0);
        PatchColumn occupied = new PatchColumn(); occupied.setVersion(source.getVersion());
        occupied.setProjectVersion(current(project).getVersion()); occupied.setKind(Status.CANCELLED);
        rejected(() -> service.patchColumn(owner, project.getId(), source.getId(), occupied), "DOMAIN_VIOLATION");
        rejected(() -> service.removeColumn(owner, project.getId(), source.getId(), source.getVersion(),
                new RemoveColumn(current(project).getVersion(), null, null, null)), "DOMAIN_VIOLATION");
        ProjectColumn backlog = service.createColumn(owner, project.getId(), new CreateColumn(current(project).getVersion(), "Triagem", Status.PENDING));
        PatchColumn rename = new PatchColumn(); rename.setVersion(backlog.getVersion());
        rename.setProjectVersion(current(project).getVersion()); rename.setName("Bloqueadas");
        service.patchColumn(owner, project.getId(), backlog.getId(), rename);
        List<Long> order = new ArrayList<>(board(project).stream().map(ProjectColumn::getId).toList());
        Collections.reverse(order);
        service.orderColumns(owner, project.getId(), new OrderColumns(current(project).getVersion(), order));
        assertThat(board(project)).extracting(ProjectColumn::getId).containsExactlyElementsOf(order);
        assertThat(tasks.findById(task.getId()).orElseThrow().getStatus()).isEqualTo(Status.BACKLOG);
        service.removeColumn(owner, project.getId(), source.getId(), columns.findById(source.getId()).orElseThrow().getVersion(),
                new RemoveColumn(current(project).getVersion(), backlog.getId(), backlog.getId(), null));
        Task moved = tasks.findById(task.getId()).orElseThrow();
        assertThat(moved.getColumnId()).isEqualTo(backlog.getId()); assertThat(moved.getStatus()).isEqualTo(Status.PENDING);
        assertThat(current(project).getDefaultPendingColumnId()).isEqualTo(backlog.getId());
        rejected(() -> service.removeColumn(owner, project.getId(), backlog.getId(),
                columns.findById(backlog.getId()).orElseThrow().getVersion(),
                new RemoveColumn(current(project).getVersion(), project.getDefaultCompletedColumnId(), project.getDefaultCompletedColumnId(), null)), "DOMAIN_VIOLATION");
    }

    @Test void deletionDetachesAndPreservesExecutionAndObjectiveDeletionOnlyClearsItsLink() {
        Project project = project(ProjectMode.DEVELOPMENT);
        Objective objective = service.createObjective(owner, project.getId(), new CreateObjective(project.getVersion(), "Resultado", null));
        Task task = task(project, objective.getId(), LocalDate.of(2026, 11, 12), LocalTime.NOON, LocalDate.of(2026, 11, 20));
        service.deleteObjective(owner, project.getId(), objective.getId(), objective.getVersion(), current(project).getVersion());
        Task detached = tasks.findById(task.getId()).orElseThrow();
        assertThat(detached.getObjectiveId()).isNull(); assertThat(detached.getColumnId()).isEqualTo(task.getColumnId());
        assertThat(detached.getVersion()).isGreaterThan(task.getVersion());
        service.deleteProject(owner, project.getId(), current(project).getVersion());
        Task survivor = tasks.findById(task.getId()).orElseThrow();
        assertThat(survivor.getProjectId()).isNull(); assertThat(survivor.getColumnId()).isNull(); assertThat(survivor.getPosition()).isNull();
        assertThat(survivor.getPlannedDate()).isEqualTo(task.getPlannedDate());
        assertThat(survivor.getDueDate()).isEqualTo(task.getDueDate()); assertThat(survivor.getStartTime()).isEqualTo(task.getStartTime());
        assertThat(survivor.getStatus()).isEqualTo(task.getStatus()); assertThat(survivor.getId()).isEqualTo(task.getId());
        assertThat(board(project)).isEmpty(); assertThat(projects.findById(project.getId())).isEmpty();
    }

    @Test void rollbackAfterDetachAndColumnMovementRestoresAllVersionsAndLinks() {
        Project project = project(ProjectMode.DEVELOPMENT);
        Task task = task(project, null, null, null, null);
        long version = current(project).getVersion();
        assertThatThrownBy(() -> run(() -> { service.deleteProject(owner, project.getId(), version); throw new IllegalStateException("injected after detach/delete"); }))
                .isInstanceOf(IllegalStateException.class);
        assertThat(current(project).getVersion()).isEqualTo(version);
        assertThat(tasks.findById(task.getId()).orElseThrow().getProjectId()).isEqualTo(project.getId());
        ProjectColumn source = board(project).get(0);
        ProjectColumn replacement = service.createColumn(owner, project.getId(), new CreateColumn(version, "Outro", Status.PENDING));
        long afterCreate = current(project).getVersion();
        assertThatThrownBy(() -> run(() -> {
            service.removeColumn(owner, project.getId(), source.getId(), source.getVersion(),
                    new RemoveColumn(afterCreate, replacement.getId(), replacement.getId(), null));
            throw new IllegalStateException("injected after move/delete");
        })).isInstanceOf(IllegalStateException.class);
        Task restored = tasks.findById(task.getId()).orElseThrow();
        assertThat(restored.getColumnId()).isEqualTo(source.getId()); assertThat(restored.getVersion()).isEqualTo(task.getVersion());
        assertThat(current(project).getVersion()).isEqualTo(afterCreate); assertThat(columns.findById(source.getId())).isPresent();
    }

    @Test void ownershipVersionsAndCompositeForeignKeysAreEnforced() {
        Project project = project(ProjectMode.DEVELOPMENT);
        Task task = task(project, null, null, null, null);
        rejected(() -> service.createColumn(stranger, project.getId(), new CreateColumn(current(project).getVersion(), "Invasão", Status.PENDING)), "NOT_FOUND");
        rejected(() -> service.patchTask(stranger, task.getId(), patch(task)), "NOT_FOUND");
        rejected(() -> service.createColumn(owner, project.getId(), new CreateColumn(null, "Sem versão", Status.PENDING)), "PRECONDITION_REQUIRED");
        PatchTask first = patch(task); first.setTitle("Primeira edição");
        Task updated = service.patchTask(owner, task.getId(), first);
        rejected(() -> service.patchTask(owner, task.getId(), first), "VERSION_CONFLICT");
        assertThat(updated.getVersion()).isGreaterThan(task.getVersion());
        assertThatThrownBy(() -> run(() -> em.createNativeQuery("update tasks set user_id=:owner where id=:id")
                .setParameter("owner", stranger).setParameter("id", task.getId()).executeUpdate())).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> run(() -> em.createNativeQuery("delete from project where id=:id")
                .setParameter("id", project.getId()).executeUpdate())).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> run(() -> em.createNativeQuery("update tasks set status='CONCLUDED' where id=:id")
                .setParameter("id", task.getId()).executeUpdate())).isInstanceOf(RuntimeException.class);
    }

    @Test void taskReorderingAndCrossProjectTransferAreAtomic() {
        Project project = project(ProjectMode.DEVELOPMENT);
        Task first = task(project, null, null, null, null);
        Task second = task(project, null, null, null, null);
        PatchTask reorder = move(second, project, second.getColumnId()); reorder.setBeforeTaskId(first.getId());
        service.patchTask(owner, second.getId(), reorder);
        assertThat(tasks.findByProjectIdAndColumnIdOrderByPositionAscIdAsc(project.getId(), first.getColumnId()))
                .extracting(Task::getId).containsExactly(second.getId(), first.getId());
        Project target = project(ProjectMode.DEVELOPMENT);
        Task reloaded = tasks.findById(first.getId()).orElseThrow();
        PatchTask transfer = patch(reloaded); transfer.setProjectId(target.getId());
        transfer.setProjectVersion(current(project).getVersion()); transfer.setTargetProjectVersion(current(target).getVersion());
        Task moved = service.patchTask(owner, first.getId(), transfer);
        assertThat(moved.getProjectId()).isEqualTo(target.getId()); assertThat(moved.getColumnId()).isEqualTo(target.getDefaultPendingColumnId());
        assertThat(moved.getPosition()).isZero(); assertThat(moved.getId()).isEqualTo(first.getId());
    }

    @Test void deletingSeveralTasksStillAppendsNewTasksAfterSurvivors() {
        Project project = project(ProjectMode.DEVELOPMENT);
        Task first = task(project, null, null, null, null);
        Task second = task(project, null, null, null, null);
        Task third = task(project, null, null, null, null);
        Task survivor = task(project, null, null, null, null);
        for (Task removed : List.of(first, second, third)) {
            Task latest = tasks.findById(removed.getId()).orElseThrow();
            service.deleteTask(owner, latest.getId(), latest.getVersion(), current(project).getVersion());
        }
        Task appended = task(project, null, null, null, null);
        assertThat(tasks.findByProjectIdAndColumnIdOrderByPositionAscIdAsc(project.getId(), survivor.getColumnId()))
                .extracting(Task::getId).containsExactly(survivor.getId(), appended.getId());
    }

    @Test void repeatedCompletionKeepsItsPositionAndEmptyColumnCanChangeMeaning() {
        Project project = project(ProjectMode.DEVELOPMENT);
        ProjectColumn empty = board(project).get(1);
        PatchColumn meaning = new PatchColumn(); meaning.setVersion(empty.getVersion());
        meaning.setProjectVersion(current(project).getVersion()); meaning.setKind(Status.CANCELLED);
        ProjectColumn cancelled = service.patchColumn(owner, project.getId(), empty.getId(), meaning);
        assertThat(cancelled.getKind()).isEqualTo(Status.CANCELLED);
        Task first = task(project, null, null, null, null);
        Task second = task(project, null, null, null, null);
        Task[] completed = new Task[2];
        int index = 0;
        for (Task task : List.of(first, second)) {
            PatchTask finish = patch(tasks.findById(task.getId()).orElseThrow()); finish.setStatus(Status.CONCLUDED);
            finish.setProjectVersion(current(project).getVersion());
            completed[index++] = service.patchTask(owner, task.getId(), finish);
        }
        PatchTask repeat = patch(completed[0]); repeat.setStatus(Status.CONCLUDED);
        repeat.setProjectVersion(current(project).getVersion());
        service.patchTask(owner, first.getId(), repeat);
        assertThat(tasks.findByProjectIdAndColumnIdOrderByPositionAscIdAsc(project.getId(), project.getDefaultCompletedColumnId()))
                .extracting(Task::getId).containsExactly(first.getId(), second.getId());
    }

    @Test void receiptUuidJsonAndInstantRoundTripWithoutResourceForeignKey() {
        UUID key = UUID.randomUUID();
        Instant created = Instant.parse("2026-11-13T15:00:00Z");
        Long id = tx(() -> {
            CreationReceipt receipt = CreationReceipt.builder().user(users.findById(owner).orElseThrow())
                    .operation("task:create").idempotencyKey(key).payloadSha256("a".repeat(64))
                    .resourceId(999999L).responseStatus(201).resourceVersion(7)
                    .responseBody(JsonMapper.builder().build().createObjectNode().put("id", 999999).put("version", 7))
                    .createdAt(created).expiresAt(created.plus(Duration.ofHours(24))).build();
            em.persist(receipt); em.flush(); return receipt.getId();
        });
        run(() -> {
            CreationReceipt read = em.find(CreationReceipt.class, id);
            assertThat(read.getIdempotencyKey()).isEqualTo(key);
            assertThat(read.getResponseBody().path("version").asLong()).isEqualTo(7);
            assertThat(read.getCreatedAt()).isEqualTo(created);
        });
    }

    @Test void projectLockSerializesConcurrentStructureAndStaleWriterConflicts() throws Exception {
        Project project = project(ProjectMode.DEVELOPMENT);
        long version = project.getVersion();
        CountDownLatch locked = new CountDownLatch(1), release = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> first = executor.submit(() -> run(() -> {
                projects.lockOwned(project.getId(), owner).orElseThrow(); locked.countDown();
                try { if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("timeout"); }
                catch (InterruptedException e) { throw new IllegalStateException(e); }
                service.createColumn(owner, project.getId(), new CreateColumn(version, "Primeira", Status.PENDING));
            }));
            assertThat(locked.await(5, TimeUnit.SECONDS)).isTrue();
            CountDownLatch attempted = new CountDownLatch(1);
            Future<?> second = executor.submit(() -> {
                attempted.countDown();
                service.createColumn(owner, project.getId(), new CreateColumn(version, "Segunda", Status.PENDING));
            });
            assertThat(attempted.await(5, TimeUnit.SECONDS)).isTrue();
            release.countDown(); first.get(10, TimeUnit.SECONDS);
            assertThatThrownBy(() -> second.get(10, TimeUnit.SECONDS)).hasCauseInstanceOf(WorkDomainException.class);
            assertThat(board(project)).extracting(ProjectColumn::getName).contains("Primeira").doesNotContain("Segunda");
        } finally { release.countDown(); executor.shutdownNow(); }
    }

    @Test void labelsAreOwnedVersionedAndPreservedAcrossTransfers() {
        TaskLabel red = taskLabels.create(owner, new LabelInput("Urgente", TaskLabelColor.RED));
        TaskLabel blue = taskLabels.create(owner, new LabelInput("Site", TaskLabelColor.BLUE));
        TaskLabel foreign = taskLabels.create(stranger, new LabelInput("Privada", TaskLabelColor.GRAY));
        Task standalone = task(null, null, LocalDate.of(2026,11,13), LocalTime.of(9,37), LocalDate.of(2026,11,20));
        PatchTask attach = patch(standalone); attach.setLabelIds(List.of(red.getId(), blue.getId()));
        Task tagged = service.patchTask(owner, standalone.getId(), attach);
        assertThat(tagged.getVersion()).isEqualTo(standalone.getVersion() + 1);
        assertThat(tasks.findById(tagged.getId()).orElseThrow().getVersion()).isEqualTo(tagged.getVersion());
        assertThat(taskLabels.forTasks(owner, List.of(tagged.getId())).get(tagged.getId())).extracting(v -> v.id())
            .containsExactlyInAnyOrder(red.getId(), blue.getId());
        PatchTask forbidden = patch(tagged); forbidden.setLabelIds(List.of(foreign.getId()));
        rejected(() -> service.patchTask(owner, tagged.getId(), forbidden), "NOT_FOUND");
        PatchTask invalid = patch(tagged); invalid.setLabelIds(null);
        rejected(() -> service.patchTask(owner, tagged.getId(), invalid), "INVALID_REQUEST");
        Project project = project(ProjectMode.DEVELOPMENT);
        PatchTask transfer = patch(tagged); transfer.setProjectId(project.getId()); transfer.setProjectVersion(project.getVersion());
        Task moved = service.patchTask(owner, tagged.getId(), transfer);
        assertThat(taskLabels.forTasks(owner, List.of(moved.getId())).get(moved.getId())).hasSize(2);
        PatchTask partial = patch(moved); partial.setTitle("Renomeada"); partial.setLabelIds(List.of(blue.getId()));
        Task updated = service.patchTask(owner, moved.getId(), partial);
        assertThat(updated.getVersion()).isEqualTo(moved.getVersion() + 1);
        assertThat(taskLabels.forTasks(owner, List.of(updated.getId())).get(updated.getId())).extracting(v -> v.id()).containsExactly(blue.getId());
        assertThat(updated.getStartTime()).isEqualTo(LocalTime.of(9,37));
        assertThat(updated.getDueDate()).isEqualTo(LocalDate.of(2026,11,20));
        service.deleteProject(owner, project.getId(), current(project).getVersion());
        Task detached = tasks.findById(updated.getId()).orElseThrow();
        assertThat(detached.getProjectId()).isNull();
        assertThat(taskLabels.forTasks(owner, List.of(detached.getId())).get(detached.getId())).extracting(v -> v.id()).containsExactly(blue.getId());
        taskLabels.delete(owner, blue.getId(), blue.getVersion());
        Task afterDelete = tasks.findById(updated.getId()).orElseThrow();
        assertThat(afterDelete.getVersion()).isEqualTo(detached.getVersion() + 1);
        assertThat(afterDelete.getStatus()).isEqualTo(updated.getStatus());
        assertThat(afterDelete.getPlannedDate()).isEqualTo(updated.getPlannedDate());
        assertThat(taskLabels.forTasks(owner, List.of(afterDelete.getId()))).isEmpty();
        rejected(() -> service.patchTask(owner, afterDelete.getId(), patch(detached)), "VERSION_CONFLICT");

    }

    @Test void labelCatalogRejectsForeignDuplicateAndStaleWrites() {
        TaskLabel label = taskLabels.create(owner, new LabelInput("  Backend  ", TaskLabelColor.GREEN));
        rejected(() -> taskLabels.create(owner, new LabelInput("backend", TaskLabelColor.RED)), "INVALID_REQUEST");
        rejected(() -> taskLabels.update(stranger, label.getId(), label.getVersion(), new LabelInput("Outra", TaskLabelColor.BLUE)), "NOT_FOUND");
        var fresh = taskLabels.update(owner, label.getId(), label.getVersion(), new LabelInput("API", TaskLabelColor.BLUE));
        assertThat(fresh.version()).isEqualTo(label.getVersion() + 1);
        rejected(() -> taskLabels.delete(owner, label.getId(), label.getVersion()), "VERSION_CONFLICT");
        Task withLabels = service.createTask(owner, new CreateTask("Nova", null, null, null, null, null, null, null, null, null, null, List.of(label.getId())));
        assertThat(taskLabels.forTasks(owner, List.of(withLabels.getId())).get(withLabels.getId())).extracting(v -> v.name()).containsExactly("API");
        service.deleteTask(owner, withLabels.getId(), withLabels.getVersion(), null);
        assertThat(labelAssignments.findByTaskIdAndUserId(withLabels.getId(), owner)).isEmpty();
        assertThat(labelRepository.findById(label.getId())).isPresent();
    }

    @Test void labelDeletionSerializesWithTaskAssignment() throws Exception {
        TaskLabel label = taskLabels.create(owner, new LabelInput("Concorrência", TaskLabelColor.ORANGE));
        Task task = task(null, null, null, null, null);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch assigned = new CountDownLatch(1), release = new CountDownLatch(1), deleting = new CountDownLatch(1);
        try {
            Future<?> writer = pool.submit(() -> run(() -> {
                PatchTask command = patch(task); command.setLabelIds(List.of(label.getId()));
                service.patchTask(owner, task.getId(), command); assigned.countDown();
                try { if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Assignment release timed out"); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
            }));
            assertThat(assigned.await(5, TimeUnit.SECONDS)).isTrue();
            Future<?> removal = pool.submit(() -> { deleting.countDown(); taskLabels.delete(owner, label.getId(), label.getVersion()); });
            assertThat(deleting.await(5, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> removal.get(150, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            release.countDown(); writer.get(5, TimeUnit.SECONDS); removal.get(5, TimeUnit.SECONDS);
            assertThat(taskLabels.forTasks(owner, List.of(task.getId()))).isEmpty();
            assertThat(tasks.findById(task.getId()).orElseThrow().getVersion()).isEqualTo(task.getVersion()+2);
        } finally { release.countDown(); pool.shutdownNow(); }
    }
}
