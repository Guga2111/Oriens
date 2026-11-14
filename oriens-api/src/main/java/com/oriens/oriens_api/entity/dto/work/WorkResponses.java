package com.oriens.oriens_api.entity.dto.work;

import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.entity.embeddable.Location;
import java.time.*;
import java.util.List;

/** Explicit wire projections: never serialize JPA entities or a User. Aggregates use the same authorized rows as their lists. */
public final class WorkResponses {
    private WorkResponses() {}
    public record ObjectiveView(Long id, Long projectId, String title, LocalDate dueDate, ObjectiveStatus status,
                                int position, long version, Long nonCancelledTasks, Long completedTasks, Long cancelledTasks) {
        public static ObjectiveView of(Objective o) { return new ObjectiveView(o.getId(), o.getProject().getId(), o.getTitle(), o.getDueDate(), o.getStatus(), o.getPosition(), o.getVersion(), null, null, null); }
    }
    public record ColumnView(Long id, Long projectId, String name, Status kind, int position, long version) {
        public static ColumnView of(ProjectColumn c) { return new ColumnView(c.getId(), c.getProject().getId(), c.getName(), c.getKind(), c.getPosition(), c.getVersion()); }
    }
    public record ProjectView(Long id, Long userId, String title, String description, String color, String imageUrl,
                              ProjectMode mode, boolean favorite, Boolean archived, Instant lastAccessed,
                              Long defaultPendingColumnId, Long defaultCompletedColumnId, long version,
                              List<ObjectiveView> objectives, ProjectSummary summary) {
    }
    public record ProjectSummary(long totalObjectives, long completedObjectives, Long totalTasks,
        Long nonCancelledTasks, Long completedTasks, Long cancelledTasks, Long plannedTodayCount,
        Long previousPlansCount, Long overdueTaskCount, Long dueTodayTaskCount, long overdueObjectiveCount,
        TaskView nextPlannedTask, ObjectiveView nextObjective) {}
    public record DayResponse(LocalDate date, String timezone, List<TaskView> planned,
        List<TaskView> previousPlans, List<TaskView> deadlineAttention, List<TaskView> completed) {}
    public record RangeResponse(LocalDate startDate, LocalDate endDate, String timezone, List<TaskView> tasks) {}
    public record PlanningCount(LocalDate date, long activeCount, long completedCount) {}
    public record TaskCounts(long totalTasks, long nonCancelledTasks, long completedTasks, long cancelledTasks) {}
    public record BoardColumn(Long id, Long projectId, String name, Status kind, int position, long version,
        long totalCount, long visibleCount) {}
    public record BoardResponse(Long projectId, long projectVersion, List<BoardColumn> columns,
        List<TaskView> tasks, TaskCounts total, TaskCounts visible, boolean filtered) {}
    public record ProjectTotals(long totalProjects, long activeProjects, long favoriteProjects, long archivedProjects) {}
    public record WeeklyResponse(LocalDate startDate, LocalDate endDate, String timezone, long completedTasks, long totalTasks) {}
    public record ProjectLink(Long id, String title, Boolean archived, long version) {}
    public record ObjectiveLink(Long id, String title) {}
    public record ColumnLink(Long id, String name, Status kind) {}
    public record TaskView(Long id, Long userId, String title, String description, Long projectId, Long objectiveId,
                           Long columnId, Integer position, LocalDate plannedDate, LocalTime startTime,
                           LocalDate dueDate, Priority priority, Status status, LocalDate completedAt,
                           Instant createdAt, Location location, long version, ProjectLink project,
                           ObjectiveLink objective, ColumnLink column) {}
    public record SidebarProject(Long id, String title, String color, ProjectMode mode, boolean favorite,
                                 Boolean archived, Instant lastAccessed, long version) {
        public static SidebarProject of(Project p) { return new SidebarProject(p.getId(), p.getTitle(), p.getColor(), p.getMode(), p.isFavorite(), p.getArchived(), p.getLastAccessed(), p.getVersion()); }
    }
    public record TaskDeletion(Long id, List<Long> affectedProjectIds, LocalDate previousPlannedDate) {}
    public record ObjectiveMutation(ObjectiveView objective, long projectVersion) {}
    public record ObjectiveDeletion(Long projectId, long projectVersion, long detachedTaskCount) {}
    public record BoardConfigMutation(Long projectId, long projectVersion, List<ColumnView> columns,
                                      Long defaultPendingColumnId, Long defaultCompletedColumnId) {}
    public record TaskMutation(TaskView task, List<Long> affectedProjectIds,
                               LocalDate previousPlannedDate, LocalDate plannedDate) {}
    public record DeletionPreview(long projectVersion, long objectiveCount, long columnCount, long taskCount) {}
    public record ColumnRemoval(Long projectId, long projectVersion, long movedTaskCount, boolean invalidateBoard) {}
}
