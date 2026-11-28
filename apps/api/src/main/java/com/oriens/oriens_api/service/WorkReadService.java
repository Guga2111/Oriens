package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.dto.work.WorkResponses.*;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.repository.*;
import lombok.RequiredArgsConstructor;
import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.entity.enums.*;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WorkReadService {
    private final Clock clock;
    private final TaskLabelService taskLabels;
    private final ProjectRepository projects;
    private final ProjectActivityRepository projectActivity;
    private final TaskRepository tasks;
    private final TaskDescriptionCodec descriptions;
    private final ObjectiveRepository objectives;
    private final ProjectColumnRepository columns;
    public Project project(Long owner, Long id) {
        return projects.findByIdAndUserId(id, owner).orElseThrow(WorkReadService::missing);
    }
    public Task task(Long owner, Long id) {
        return tasks.findByIdAndUserId(id, owner).orElseThrow(WorkReadService::missing);
    }
    public TaskView taskView(Long owner, Long id) { return view(owner, task(owner, id)); }
    public ProjectView projectView(Long owner, Long id) { return projectViews(owner, List.of(project(owner, id)), true).get(0); }
    public ProjectActivityPage projectActivity(Long owner, Long id, Pageable page) {
        Project owned = project(owner, id);
        var slice = projectActivity.findByProjectIdAndProjectUserIdOrderByOccurredAtDescIdDesc(id, owner, page);
        return new ProjectActivityPage(slice.getNumber(), slice.hasNext(), owned.getUser().getName(),
            slice.map(event -> new ProjectActivityView(event.getId(), event.getKind(), event.getOccurredAt(),
                event.getSubjectId(), event.getSubjectTitle())).getContent());
    }
    public TaskView view(Long owner, Task task) { return views(owner, List.of(task), true).get(0); }

    /** Bounded batch projection: one query per link type, never one query per task. */
    public List<TaskView> views(Long owner, List<Task> source) {
        return views(owner, source, false);
    }

    private List<TaskView> views(Long owner, List<Task> source, boolean includeDocument) {
        Set<Long> projectIds = source.stream().map(Task::getProjectId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Project> ps = projects.findAllById(projectIds).stream()
            .filter(p -> p.getUser().getId().equals(owner)).collect(Collectors.toMap(Project::getId, Function.identity()));
        Map<Long, Objective> os = objectives.findAllById(source.stream().map(Task::getObjectiveId).filter(Objects::nonNull).distinct().toList())
            .stream().collect(Collectors.toMap(Objective::getId, Function.identity()));
        Map<Long, ProjectColumn> cs = columns.findAllById(source.stream().map(Task::getColumnId).filter(Objects::nonNull).distinct().toList())
            .stream().collect(Collectors.toMap(ProjectColumn::getId, Function.identity()));
        Map<Long, List<LabelView>> labels = taskLabels.forTasks(owner, source.stream().map(Task::getId).toList());
        return source.stream().map(t -> {
            if (!t.getUser().getId().equals(owner)) throw missing();
            Project p = ps.get(t.getProjectId());
            Objective o = os.get(t.getObjectiveId()); ProjectColumn c = cs.get(t.getColumnId());
            if (t.getProjectId() != null && p == null) throw missing();
            var document = descriptions.read(t.getDescriptionDoc());
            String descriptionText = document == null ? null : TaskDescriptionCodec.plainText(document.content());
            return new TaskView(t.getId(), owner, t.getTitle(), t.getDescription(), t.getProjectId(), t.getObjectiveId(), t.getColumnId(),
                t.getPosition(), t.getPlannedDate(), t.getStartTime(), t.getDueDate(), t.getPriority(), t.getStatus(), t.getCompletedAt(),
                t.getCreatedAt(), t.getLocation(), t.getVersion(), p == null ? null : new ProjectLink(p.getId(), p.getTitle(), p.getArchived(), p.getVersion(), p.getImageUrl()),
                o == null ? null : new ObjectiveLink(o.getId(), o.getTitle()), c == null ? null : new ColumnLink(c.getId(), c.getName(), c.getKind()),
                labels.getOrDefault(t.getId(), List.of()), descriptionText, includeDocument ? document : null);
        }).toList();
    }
    private LocalDate today() { return LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE)); }
    private static boolean active(TaskView t) { return t.status().open(); }
    private static final Comparator<TaskView> PRIORITY = Comparator.comparingInt((TaskView t) -> switch(t.priority()) {
        case URGENT -> 0; case HIGH -> 1; case MEDIUM -> 2; case LOW -> 3; case NONE -> 4;
    }).thenComparing(TaskView::id);
    private static final Comparator<TaskView> DAY_ORDER = Comparator
        .comparing(TaskView::startTime, Comparator.nullsFirst(Comparator.naturalOrder())).thenComparing(PRIORITY);
    private static final Comparator<TaskView> PLAN_ORDER = Comparator.comparing(TaskView::plannedDate)
        .thenComparing(TaskView::startTime, Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(PRIORITY);
    public DayResponse day(Long owner, LocalDate date) {
        boolean recovery = date.equals(today());
        List<TaskView> all = views(owner, tasks.findDay(owner, date, recovery));
        List<TaskView> planned = all.stream().filter(WorkReadService::active).filter(t -> date.equals(t.plannedDate())).sorted(DAY_ORDER).toList();
        List<TaskView> previous = all.stream().filter(WorkReadService::active)
            .filter(t -> recovery && t.plannedDate() != null && t.plannedDate().isBefore(date))
            .sorted(Comparator.comparing(TaskView::plannedDate).thenComparing(PRIORITY)).toList();
        Set<Long> classified = new HashSet<>();
        planned.forEach(t -> classified.add(t.id())); previous.forEach(t -> classified.add(t.id()));
        List<TaskView> attention = all.stream().filter(WorkReadService::active).filter(t -> recovery && !classified.contains(t.id())
            && t.dueDate() != null && !t.dueDate().isAfter(date)).sorted(Comparator.comparing(TaskView::dueDate).thenComparing(PRIORITY)).toList();
        return new DayResponse(date, ProductClockConfiguration.ZONE.getId(), planned, previous, attention,
            all.stream().filter(t -> t.status() == Status.CONCLUDED && date.equals(t.plannedDate())).sorted(DAY_ORDER).toList());
    }
    public static void interval(LocalDate start, LocalDate end) {
        if (start != null && end != null && start.isAfter(end))
            throw new WorkDomainException("INVALID_REQUEST", "endDate", "O fim deve ser igual ou posterior ao início.");
    }
    public RangeResponse range(Long owner, LocalDate start, LocalDate end) {
        interval(start, end);
        return new RangeResponse(start, end, ProductClockConfiguration.ZONE.getId(),
            views(owner, tasks.findPlannedRange(owner, start, end)).stream().sorted(PLAN_ORDER).toList());
    }
    public PlanningCount planningCount(Long owner, LocalDate date, Long exclude) {
        if (exclude != null) task(owner, exclude);
        List<TaskView> values = range(owner, date, date).tasks().stream().filter(t -> !t.id().equals(exclude)).toList();
        return new PlanningCount(date, values.stream().filter(WorkReadService::active).count(),
            values.stream().filter(t -> t.status() == Status.CONCLUDED).count());
    }
    public WeeklyResponse weekly(Long owner, LocalDate start, LocalDate end) {
        if (start == null && end == null) {
            start = today().with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY)); end = start.plusDays(6);
        } else if (start == null || end == null) throw new WorkDomainException("DOMAIN_VIOLATION", "startDate", "Informe início e fim.");
        List<TaskView> values = range(owner, start, end).tasks();
        return new WeeklyResponse(start, end, ProductClockConfiguration.ZONE.getId(),
            values.stream().filter(t -> t.status() == Status.CONCLUDED).count(), values.size());
    }
    public void validateTaskFilterLinks(Long owner, Long projectId, Long labelId) {
        if (projectId != null) project(owner, projectId);
        if (labelId != null) taskLabels.owned(owner, labelId);
    }

    public BoardResponse board(Long owner, Long id, Long objectiveId, String planning, boolean overdue, boolean open,
            TaskReadFilters filters) {
        Project p = project(owner, id);
        if (p.getMode() != ProjectMode.DEVELOPMENT) throw new WorkDomainException("DOMAIN_VIOLATION", "projectId", "Projeto simples não possui quadro.");
        if (planning != null && !Set.of("today", "unscheduled").contains(planning))
            throw new WorkDomainException("INVALID_REQUEST", "planning", "Filtro de planejamento inválido.");
        validateTaskFilterLinks(owner, null, filters.labelId());
        // The timeline uses an overlap window. Explicit date fields filter tasks by a single calendar date.
        BoardWindow window = filters.dateField() == null ? BoardWindow.of(filters.startDate(), filters.endDate()) : null;
        if (filters.dateField() != null) filters.validateDateField();
        if (objectiveId != null && objectives.findById(objectiveId).filter(o -> o.getProject().getId().equals(id)).isEmpty()) throw missing();
        List<TaskView> all = views(owner, tasks.findByUserIdAndProjectIdOrderByPositionAscIdAsc(owner, id));
        LocalDate date = today();
        List<TaskView> visible = all.stream().filter(t -> objectiveId == null || objectiveId.equals(t.objectiveId()))
            .filter(t -> planning == null || ("today".equals(planning) ? date.equals(t.plannedDate()) : t.plannedDate() == null))
            .filter(t -> !open || active(t))
            .filter(t -> !overdue || active(t) && t.dueDate() != null && t.dueDate().isBefore(date))
            .filter(t -> window == null || window.includes(t.plannedDate(), t.dueDate()))
            .filter(filters::matches).toList();
        return new BoardResponse(id, p.getVersion(), columns.findByProjectIdOrderByPositionAscIdAsc(id).stream().map(c -> {
            List<TaskView> rows = visible.stream().filter(t -> c.getId().equals(t.columnId())).toList();
            return new BoardColumn(c.getId(), id, c.getName(), c.getKind(), c.getPosition(), c.getVersion(),
                all.stream().filter(t -> c.getId().equals(t.columnId())).count(), rows.size());
        }).toList(), visible, counts(all), counts(visible), objectiveId != null || planning != null || overdue || open || window != null || filters.isActive());
    }
    private static TaskCounts counts(List<TaskView> rows) {
        return new TaskCounts(rows.size(), rows.stream().filter(t -> t.status() != Status.CANCELLED).count(),
            rows.stream().filter(t -> t.status() == Status.CONCLUDED).count(),
            rows.stream().filter(t -> t.status() == Status.CANCELLED).count());
    }
    public ProjectTotals totals(Long owner) {
        List<Project> all = projects.findByUserId(owner);
        return new ProjectTotals(all.size(), all.stream().filter(p -> !Boolean.TRUE.equals(p.getArchived())).count(),
            all.stream().filter(p -> p.isFavorite() && !Boolean.TRUE.equals(p.getArchived())).count(),
            all.stream().filter(p -> Boolean.TRUE.equals(p.getArchived())).count());
    }
    public List<ProjectView> projectViews(Long owner, List<Project> source, boolean detail) {
        List<Long> ids = source.stream().map(Project::getId).toList();
        if (ids.isEmpty()) return List.of();
        Map<Long, List<Objective>> os = objectives.findByProjectIdIn(ids).stream()
            .collect(Collectors.groupingBy(o -> o.getProject().getId()));
        Map<Long, List<TaskView>> ts = views(owner, tasks.findByUserIdAndProjectIdIn(owner, ids)).stream()
            .collect(Collectors.groupingBy(TaskView::projectId));
        LocalDate date = today();
        return source.stream().map(p -> {
            if (!p.getUser().getId().equals(owner)) throw missing();
            List<TaskView> rows = ts.getOrDefault(p.getId(), List.of());
            List<ObjectiveView> goals = os.getOrDefault(p.getId(), List.of()).stream().map(o -> new ObjectiveView(
                o.getId(), p.getId(), o.getTitle(), o.getDueDate(), o.getStatus(), o.getPosition(), o.getVersion(),
                p.getMode() == ProjectMode.DEVELOPMENT ? rows.stream().filter(t -> o.getId().equals(t.objectiveId()) && t.status() != Status.CANCELLED).count() : null,
                p.getMode() == ProjectMode.DEVELOPMENT ? rows.stream().filter(t -> o.getId().equals(t.objectiveId()) && t.status() == Status.CONCLUDED).count() : null,
                p.getMode() == ProjectMode.DEVELOPMENT ? rows.stream().filter(t -> o.getId().equals(t.objectiveId()) && t.status() == Status.CANCELLED).count() : null, o.getDescription(), o.getStartDate(), o.isFavorite()))
                .sorted(Comparator.comparingInt(ObjectiveView::position).thenComparing(ObjectiveView::id)).toList();
            boolean dev = p.getMode() == ProjectMode.DEVELOPMENT;
            // Cancelled objectives leave the denominator, as cancelled tasks do.
            ProjectSummary summary = new ProjectSummary(goals.stream().filter(o -> o.status() != ObjectiveStatus.CANCELLED).count(), goals.stream().filter(o -> o.status() == ObjectiveStatus.CONCLUDED).count(),
                dev ? (long) rows.size() : null, dev ? rows.stream().filter(t -> t.status() != Status.CANCELLED).count() : null,
                dev ? rows.stream().filter(t -> t.status() == Status.CONCLUDED).count() : null,
                dev ? rows.stream().filter(t -> t.status() == Status.CANCELLED).count() : null,
                dev ? rows.stream().filter(WorkReadService::active).filter(t -> date.equals(t.plannedDate())).count() : null,
                dev ? rows.stream().filter(WorkReadService::active).filter(t -> t.plannedDate() != null && t.plannedDate().isBefore(date)).count() : null,
                dev ? rows.stream().filter(WorkReadService::active).filter(t -> t.dueDate() != null && t.dueDate().isBefore(date)).count() : null,
                dev ? rows.stream().filter(WorkReadService::active).filter(t -> date.equals(t.dueDate())).count() : null,
                goals.stream().filter(o -> o.status().isActive() && o.dueDate() != null && o.dueDate().isBefore(date)).count(),
                rows.stream().filter(WorkReadService::active).filter(t -> t.plannedDate() != null && !t.plannedDate().isBefore(date)).min(PLAN_ORDER).orElse(null),
                goals.stream().filter(o -> o.status().isActive() && o.dueDate() != null)
                    .min(Comparator.comparing(ObjectiveView::dueDate).thenComparing(ObjectiveView::id)).orElse(null));
            return new ProjectView(p.getId(), owner, p.getTitle(), p.getDescription(), p.getColor(), p.getImageUrl(), p.getMode(),
                p.isFavorite(), p.getArchived(), p.getLastAccessed(), p.getDefaultPendingColumnId(), p.getDefaultCompletedColumnId(), p.getVersion(),
                detail ? goals : null, summary, detail ? descriptions.read(p.getDescriptionDoc()) : null);
        }).toList();
    }
    public BoardConfigMutation config(Long owner, Long id) {
        Project p = project(owner, id);
        return new BoardConfigMutation(id, p.getVersion(), columns.findByProjectIdOrderByPositionAscIdAsc(id).stream()
            .map(ColumnView::of).toList(), p.getDefaultPendingColumnId(), p.getDefaultCompletedColumnId());
    }
    public DeletionPreview preview(Long owner, Long id) {
        Project p = project(owner, id);
        return new DeletionPreview(p.getVersion(), p.getObjectives().size(), columns.countByProjectId(id), tasks.countByProjectId(id));
    }
    private static WorkDomainException missing() { return new WorkDomainException("NOT_FOUND", null, "Recurso não encontrado."); }
}
