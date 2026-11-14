package com.oriens.oriens_api.service;

import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.dto.work.*;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.*;
import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

/**
 * Transaction boundary for the v2 aggregate. P2 supplies ownerId from the principal.
 * Lock projects in ID order, then re-read/lock the task. Never cascade a project delete to tasks.
 * The SQL baseline owns composite FK/check enforcement; this service owns cross-row invariants.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ProjectWorkService {
    private final ProjectRepository projects;
    private final ObjectiveRepository objectives;
    private final ProjectColumnRepository columns;
    private final TaskRepository tasks;
    private final UserRepository users;
    private final EntityManager em;
    private final Clock clock;

    public Project createProject(Long ownerId, CreateProject command) {
        require(command.mode(), "mode");
        Project project = Project.builder().user(owner(ownerId)).title(title(command.title(), 200, "title"))
                .description(description(command.description())).color(command.color()).build();
        projects.saveAndFlush(project);
        if (command.objectives() != null) {
            for (NewObjective objective : command.objectives()) {
                require(objective, "objectives");
                addObjective(project, objective.title(), objective.dueDate());
            }
        }
        if (command.mode() == ProjectMode.DEVELOPMENT) initializeBoard(project);
        em.flush();
        return project;
    }

    public Project patchProject(Long ownerId, Long id, PatchProject command) {
        Project project = project(ownerId, id);
        version(project.getVersion(), command.getVersion());
        if (command.has("title")) project.setTitle(title(command.getTitle(), 200, "title"));
        if (command.has("description")) project.setDescription(description(command.getDescription()));
        if (command.has("color")) project.setColor(command.getColor());
        em.flush();
        return project;
    }

    public Project convertProject(Long ownerId, Long id, Long expectedVersion, ProjectMode mode) {
        Project project = project(ownerId, id);
        version(project.getVersion(), expectedVersion);
        if (mode != ProjectMode.DEVELOPMENT) invalid("mode", "A conversão permite apenas Desenvolvimento.");
        if (project.getMode() == ProjectMode.SIMPLE) initializeBoard(project);
        em.flush();
        return project;
    }

    private void initializeBoard(Project project) {
        project.setMode(ProjectMode.DEVELOPMENT);
        ProjectColumn pending = addColumn(project, "A fazer", Status.PENDING, 0);
        addColumn(project, "Fazendo", Status.ON_DOING, 1);
        ProjectColumn completed = addColumn(project, "Concluídas", Status.CONCLUDED, 2);
        project.setDefaultPendingColumnId(pending.getId());
        project.setDefaultCompletedColumnId(completed.getId());
    }

    public Objective createObjective(Long ownerId, Long projectId, CreateObjective command) {
        Project project = project(ownerId, projectId);
        version(project.getVersion(), command.projectVersion());
        Objective objective = addObjective(project, command.title(), command.dueDate());
        structuralChange(project);
        return objective;
    }

    private Objective addObjective(Project project, String title, LocalDate dueDate) {
        Objective objective = Objective.builder().project(project).title(title(title, 200, "title"))
                .dueDate(dueDate).position(project.getObjectives().stream()
                        .mapToInt(Objective::getPosition).max().orElse(-1) + 1).build();
        objectives.save(objective);
        project.getObjectives().add(objective);
        return objective;
    }

    public Objective patchObjective(Long ownerId, Long projectId, Long id, PatchObjective command) {
        project(ownerId, projectId);
        Objective objective = objective(projectId, id);
        version(objective.getVersion(), command.getVersion());
        if (command.has("title")) objective.setTitle(title(command.getTitle(), 200, "title"));
        if (command.has("dueDate")) objective.setDueDate(command.getDueDate());
        if (command.has("status")) objective.setStatus(require(command.getStatus(), "status"));
        em.flush();
        return objective;
    }

    public void deleteObjective(Long ownerId, Long projectId, Long id, Long expectedVersion, Long projectVersion) {
        Project project = project(ownerId, projectId);
        version(project.getVersion(), projectVersion);
        Objective objective = objective(projectId, id);
        version(objective.getVersion(), expectedVersion);
        for (Task task : tasks.findByObjectiveId(id)) task.setObjectiveId(null);
        em.flush(); // detach/version children before RESTRICT delete
        project.getObjectives().remove(objective);
        objectives.delete(objective);
        structuralChange(project);
    }

    public ProjectColumn createColumn(Long ownerId, Long projectId, CreateColumn command) {
        Project project = development(ownerId, projectId);
        version(project.getVersion(), command.projectVersion());
        ProjectColumn column = addColumn(project, command.name(), command.kind(),
                board(project).stream().mapToInt(ProjectColumn::getPosition).max().orElse(-1) + 1);
        structuralChange(project);
        return column;
    }

    private ProjectColumn addColumn(Project project, String name, Status kind, int position) {
        String normalized = title(name, 60, "name");
        uniqueName(project, normalized, null);
        return columns.saveAndFlush(ProjectColumn.builder().project(project).name(normalized)
                .kind(require(kind, "kind")).position(position).build());
    }

    public ProjectColumn patchColumn(Long ownerId, Long projectId, Long id, PatchColumn command) {
        Project project = development(ownerId, projectId);
        version(project.getVersion(), command.getProjectVersion());
        ProjectColumn column = column(project, id);
        version(column.getVersion(), command.getVersion());
        if (command.has("name")) {
            String name = title(command.getName(), 60, "name");
            uniqueName(project, name, id);
            column.setName(name);
        }
        if (command.has("kind") && command.getKind() != column.getKind()) {
            require(command.getKind(), "kind");
            if (!columnTasks(project, id).isEmpty()) invalid("kind", "Mova as tarefas antes de mudar o significado.");
            column.setKind(command.getKind());
            validateDefaults(project); // default meaning cannot silently change
        }
        structuralChange(project);
        return column;
    }

    public Project orderColumns(Long ownerId, Long projectId, OrderColumns command) {
        Project project = development(ownerId, projectId);
        version(project.getVersion(), command.projectVersion());
        List<ProjectColumn> board = board(project);
        List<Long> ids = require(command.columnIds(), "columnIds");
        if (ids.size() != board.size() || new HashSet<>(ids).size() != ids.size()
                || !new HashSet<>(ids).equals(new HashSet<>(board.stream().map(ProjectColumn::getId).toList()))) {
            invalid("columnIds", "Informe todas as colunas uma única vez.");
        }
        for (ProjectColumn column : board) column.setPosition(ids.indexOf(column.getId()));
        structuralChange(project);
        return project;
    }

    public Project setDefaults(Long ownerId, Long projectId, BoardDefaults command) {
        Project project = development(ownerId, projectId);
        version(project.getVersion(), command.projectVersion());
        project.setDefaultPendingColumnId(require(command.pendingColumnId(), "pendingColumnId"));
        project.setDefaultCompletedColumnId(require(command.completedColumnId(), "completedColumnId"));
        validateDefaults(project);
        structuralChange(project);
        return project;
    }

    public Project removeColumn(Long ownerId, Long projectId, Long id, Long columnVersion, RemoveColumn command) {
        Project project = development(ownerId, projectId);
        version(project.getVersion(), command.projectVersion());
        ProjectColumn source = column(project, id);
        version(source.getVersion(), columnVersion);
        List<Task> affected = columnTasks(project, id);
        if (Objects.equals(command.targetColumnId(), id)) invalid("targetColumnId", "Escolha outra coluna.");
        ProjectColumn target = command.targetColumnId() == null ? null : column(project, command.targetColumnId());
        if (!affected.isEmpty() && target == null) invalid("targetColumnId", "Escolha o destino das tarefas.");
        if (Objects.equals(project.getDefaultPendingColumnId(), id)) {
            project.setDefaultPendingColumnId(require(command.replacementPendingColumnId(), "replacementPendingColumnId"));
        }
        if (Objects.equals(project.getDefaultCompletedColumnId(), id)) {
            project.setDefaultCompletedColumnId(require(command.replacementCompletedColumnId(), "replacementCompletedColumnId"));
        }
        if (Objects.equals(project.getDefaultPendingColumnId(), id)
                || Objects.equals(project.getDefaultCompletedColumnId(), id)) invalid("defaults", "O padrão precisa de outra coluna.");
        validateDefaults(project);
        if (target != null) {
            List<Task> destination = columnTasks(project, target.getId());
            for (Task task : affected) {
                task.setColumnId(target.getId());
                transition(task, target.getKind());
                destination.add(task);
            }
            positions(destination);
        }
        em.flush(); // FK status + column is changed in one task UPDATE
        columns.delete(source);
        em.flush();
        List<ProjectColumn> remaining = board(project);
        for (int index = 0; index < remaining.size(); index++) remaining.get(index).setPosition(index);
        structuralChange(project);
        return project;
    }

    public Task createTask(Long ownerId, CreateTask command) {
        Project project = command.projectId() == null ? null : development(ownerId, command.projectId());
        if (project != null) version(project.getVersion(), command.projectVersion());
        Task task = Task.builder().user(owner(ownerId)).title(title(command.title(), 200, "title"))
                .description(description(command.description())).priority(command.priority() == null ? Priority.MEDIUM : command.priority())
                .plannedDate(command.plannedDate()).startTime(command.startTime()).dueDate(command.dueDate())
                .location(command.location()).build();
        validatePlanning(task);
        if (project == null) {
            if (command.columnId() != null || command.objectiveId() != null) invalid("projectId", "Vínculos exigem um projeto.");
        } else {
            ProjectColumn column = column(project, command.columnId() == null ? project.getDefaultPendingColumnId() : command.columnId());
            task.setProjectId(project.getId());
            task.setColumnId(column.getId());
            task.setObjectiveId(command.objectiveId());
            validateObjective(project, task.getObjectiveId());
            task.setPosition(columnTasks(project, column.getId()).stream()
                    .mapToInt(Task::getPosition).max().orElse(-1) + 1);
            transition(task, column.getKind());
        }
        tasks.saveAndFlush(task);
        if (project != null) structuralChange(project);
        return task;
    }

    public Task patchTask(Long ownerId, Long id, PatchTask command) {
        Task snapshot = tasks.findByIdAndUserId(id, ownerId).orElseThrow(ProjectWorkService::notFound);
        Long originalProjectId = snapshot.getProjectId();
        Long targetProjectId = command.has("projectId") ? command.getProjectId() : originalProjectId;
        Map<Long, Project> locked = lockProjects(ownerId, originalProjectId, targetProjectId);
        // Refresh after project locks: the initial observation is not a concurrency guarantee.
        Task task = tasks.lockOwned(id, ownerId).orElseThrow(ProjectWorkService::notFound);
        em.refresh(task, LockModeType.PESSIMISTIC_WRITE);
        if (!Objects.equals(task.getProjectId(), originalProjectId)) conflict("projectId");
        version(task.getVersion(), command.getVersion());
        boolean transfer = !Objects.equals(originalProjectId, targetProjectId);
        Long oldColumnId = task.getColumnId();
        Project target = targetProjectId == null ? null : locked.get(targetProjectId);
        if (target != null && target.getMode() != ProjectMode.DEVELOPMENT) invalid("projectId", "O projeto precisa ser Desenvolvimento.");
        boolean structural = transfer || command.has("columnId") || command.has("status") || command.has("beforeTaskId");
        if (structural) {
            if (originalProjectId != null) version(locked.get(originalProjectId).getVersion(), command.getProjectVersion());
            if (transfer && target != null) version(target.getVersion(), command.getTargetProjectVersion());
        }
        if (transfer) {
            task.setProjectId(targetProjectId);
            task.setObjectiveId(null);
            task.setColumnId(null);
            task.setPosition(targetProjectId == null ? null : 0);
        }
        if (command.has("objectiveId")) task.setObjectiveId(command.getObjectiveId());
        if (target == null) {
            if (task.getObjectiveId() != null || command.has("columnId") || command.has("beforeTaskId")) invalid("projectId", "Tarefa avulsa não tem vínculos de quadro.");
            if (command.has("status")) transition(task, require(command.getStatus(), "status"));
        } else {
            validateObjective(target, task.getObjectiveId());
            Long destinationId = task.getColumnId();
            if (command.has("columnId")) destinationId = require(command.getColumnId(), "columnId");
            else if (command.has("status")) {
                Status desired = require(command.getStatus(), "status");
                if (desired == Status.PENDING) destinationId = target.getDefaultPendingColumnId();
                else if (desired == Status.CONCLUDED) destinationId = target.getDefaultCompletedColumnId();
                else invalid("columnId", "Escolha a coluna para este estado.");
            } else if (transfer) {
                destinationId = switch (task.getStatus()) {
                    case PENDING -> target.getDefaultPendingColumnId();
                    case CONCLUDED -> target.getDefaultCompletedColumnId();
                    default -> throw failure("DOMAIN_VIOLATION", "columnId", "Escolha a coluna de destino.");
                };
            }
            ProjectColumn destination = column(target, destinationId);
            if (command.has("status") && command.getStatus() != destination.getKind()) invalid("status", "O estado deve corresponder à coluna.");
            task.setColumnId(destinationId);
            transition(task, destination.getKind());
            if (transfer || !Objects.equals(oldColumnId, destinationId)
                    || command.has("columnId") || command.has("beforeTaskId")) {
                insert(task, target, destinationId, command.getBeforeTaskId());
            }
        }
        if (command.has("title")) task.setTitle(title(command.getTitle(), 200, "title"));
        if (command.has("description")) task.setDescription(description(command.getDescription()));
        if (command.has("priority")) task.setPriority(require(command.getPriority(), "priority"));
        if (command.has("location")) task.setLocation(command.getLocation());
        LocalDate previousPlan = task.getPlannedDate();
        LocalTime previousTime = task.getStartTime();
        LocalDate previousDue = task.getDueDate();
        if (command.has("plannedDate")) {
            task.setPlannedDate(command.getPlannedDate());
            if (task.getPlannedDate() == null) task.setStartTime(null);
        }
        if (command.has("startTime")) task.setStartTime(command.getStartTime());
        if (command.has("dueDate")) task.setDueDate(command.getDueDate());
        validatePlanning(task);
        if (!Objects.equals(previousPlan, task.getPlannedDate()) || !Objects.equals(previousTime, task.getStartTime())) task.setReminderSent(false);
        if (!Objects.equals(previousDue, task.getDueDate())) task.setOverdueNotificationSent(false);
        if (structural && originalProjectId != null && (transfer || !Objects.equals(oldColumnId, task.getColumnId()))) {
            positions(columnTasks(locked.get(originalProjectId), oldColumnId).stream().filter(t -> !t.getId().equals(id)).toList());
        }
        em.flush();
        if (structural) for (Project project : locked.values()) structuralChange(project);
        return task;
    }

    public void deleteTask(Long ownerId, Long id, Long expectedVersion, Long projectVersion) {
        Task snapshot = tasks.findByIdAndUserId(id, ownerId).orElseThrow(ProjectWorkService::notFound);
        Long projectId = snapshot.getProjectId();
        Project project = projectId == null ? null : project(ownerId, projectId);
        Task task = tasks.lockOwned(id, ownerId).orElseThrow(ProjectWorkService::notFound);
        em.refresh(task, LockModeType.PESSIMISTIC_WRITE);
        if (!Objects.equals(projectId, task.getProjectId())) conflict("projectId");
        version(task.getVersion(), expectedVersion);
        if (project != null) version(project.getVersion(), projectVersion);
        Long columnId = task.getColumnId();
        tasks.delete(task);
        em.flush();
        if (project != null) {
            positions(columnTasks(project, columnId));
            structuralChange(project);
        }
    }

    public void deleteProject(Long ownerId, Long id, Long expectedVersion) {
        Project project = project(ownerId, id);
        version(project.getVersion(), expectedVersion);
        for (Task task : tasks.findByProjectIdOrderByPositionAscIdAsc(id)) {
            task.setProjectId(null); task.setObjectiveId(null); task.setColumnId(null); task.setPosition(null);
        }
        project.setDefaultPendingColumnId(null);
        project.setDefaultCompletedColumnId(null);
        em.flush();
        for (Objective objective : List.copyOf(project.getObjectives())) objectives.delete(objective);
        project.getObjectives().clear();
        for (ProjectColumn column : board(project)) columns.delete(column);
        em.flush();
        projects.delete(project);
        em.flush();
    }

    private void insert(Task task, Project project, Long columnId, Long beforeId) {
        if (Objects.equals(task.getId(), beforeId)) invalid("beforeTaskId", "Escolha outra tarefa.");
        List<Task> ordered = new ArrayList<>(columnTasks(project, columnId));
        ordered.removeIf(t -> t.getId().equals(task.getId()));
        int index = ordered.size();
        if (beforeId != null) {
            index = -1;
            for (int i = 0; i < ordered.size(); i++) if (ordered.get(i).getId().equals(beforeId)) index = i;
            if (index < 0) invalid("beforeTaskId", "A tarefa de referência não pertence ao destino.");
        }
        ordered.add(index, task);
        positions(ordered);
    }

    private void transition(Task task, Status status) {
        if (status == Status.CONCLUDED) {
            if (task.getStatus() != Status.CONCLUDED) task.setCompletedAt(LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE)));
        } else task.setCompletedAt(null);
        if ((task.getStatus() == Status.CONCLUDED || task.getStatus() == Status.CANCELLED)
                && (status == Status.PENDING || status == Status.ON_DOING)) {
            task.setReminderSent(false); task.setOverdueNotificationSent(false);
        }
        task.setStatus(status);
        if (status == Status.CONCLUDED || status == Status.CANCELLED) {
            task.setReminderSent(true); task.setOverdueNotificationSent(true);
        }
    }

    private void validatePlanning(Task task) {
        if (task.getStartTime() != null && task.getPlannedDate() == null) invalid("startTime", "Horário exige um dia planejado.");
    }
    private void positions(List<Task> ordered) {
        for (int index = 0; index < ordered.size(); index++) ordered.get(index).setPosition(index);
    }
    private Map<Long, Project> lockProjects(Long ownerId, Long... ids) {
        Map<Long, Project> result = new LinkedHashMap<>();
        Arrays.stream(ids).filter(Objects::nonNull).distinct().sorted().forEach(id -> result.put(id, project(ownerId, id)));
        return result;
    }
    private Project project(Long ownerId, Long id) {
        Project project = projects.lockOwned(id, ownerId).orElseThrow(ProjectWorkService::notFound);
        em.refresh(project, LockModeType.PESSIMISTIC_WRITE);
        return project;
    }
    private Project development(Long ownerId, Long id) {
        Project project = project(ownerId, id);
        if (project.getMode() != ProjectMode.DEVELOPMENT) invalid("projectId", "O projeto precisa ser Desenvolvimento.");
        validateDefaults(project);
        return project;
    }
    private User owner(Long id) { return users.findById(id).orElseThrow(ProjectWorkService::notFound); }
    private Objective objective(Long projectId, Long id) {
        Objective objective = objectives.findById(id).orElseThrow(ProjectWorkService::notFound);
        if (!objective.getProject().getId().equals(projectId)) throw notFound();
        return objective;
    }
    private void validateObjective(Project project, Long id) { if (id != null) objective(project.getId(), id); }
    private List<ProjectColumn> board(Project project) { return columns.findByProjectIdOrderByPositionAscIdAsc(project.getId()); }
    private List<Task> columnTasks(Project project, Long id) { return tasks.findByProjectIdAndColumnIdOrderByPositionAscIdAsc(project.getId(), id); }
    private ProjectColumn column(Project project, Long id) {
        if (id == null) throw notFound();
        ProjectColumn column = columns.findById(id).orElseThrow(ProjectWorkService::notFound);
        if (!column.getProject().getId().equals(project.getId())) throw notFound();
        return column;
    }
    private void validateDefaults(Project project) {
        if (column(project, project.getDefaultPendingColumnId()).getKind() != Status.PENDING
                || column(project, project.getDefaultCompletedColumnId()).getKind() != Status.CONCLUDED) {
            invalid("defaults", "Padrões devem apontar para colunas A fazer e Concluídas do projeto.");
        }
    }
    private void uniqueName(Project project, String name, Long exceptId) {
        if (board(project).stream().anyMatch(c -> !Objects.equals(c.getId(), exceptId) && c.getName().trim().equalsIgnoreCase(name))) {
            invalid("name", "Já existe uma coluna com este nome.");
        }
    }
    private void structuralChange(Project project) {
        em.flush();
        em.lock(project, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
    }
    private static String title(String value, int max, String field) {
        if (value == null || value.trim().isEmpty() || value.trim().length() > max) invalid(field, "Informe entre 1 e " + max + " caracteres.");
        return value.trim();
    }
    private static String description(String value) {
        if (value != null && value.length() > 10000) invalid("description", "Use até 10000 caracteres.");
        return value;
    }
    private static <T> T require(T value, String field) {
        if (value == null) invalid(field, "Campo obrigatório.");
        return value;
    }
    private static void version(long current, Long expected) {
        if (expected == null) throw failure("PRECONDITION_REQUIRED", "version", "Informe a versão lida.");
        if (expected < 0) invalid("version", "Versão inválida.");
        if (current != expected) conflict("version");
    }
    private static void conflict(String field) { throw failure("VERSION_CONFLICT", field, "Os dados mudaram. Recarregue antes de salvar."); }
    private static void invalid(String field, String message) { throw failure("DOMAIN_VIOLATION", field, message); }
    private static WorkDomainException notFound() { return failure("NOT_FOUND", null, "Recurso não encontrado."); }
    private static WorkDomainException failure(String code, String field, String message) { return new WorkDomainException(code, field, message); }
}
