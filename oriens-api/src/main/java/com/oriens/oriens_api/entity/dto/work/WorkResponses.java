package com.oriens.oriens_api.entity.dto.work;

import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.entity.embeddable.Location;
import java.time.*;
import java.util.List;

/** Explicit wire projections: never serialize JPA entities or a User. Aggregates arrive in P3. */
public final class WorkResponses {
    private WorkResponses() {}
    public record ObjectiveView(Long id, Long projectId, String title, LocalDate dueDate, ObjectiveStatus status,
                                int position, long version) {
        public static ObjectiveView of(Objective o) { return new ObjectiveView(o.getId(), o.getProject().getId(), o.getTitle(), o.getDueDate(), o.getStatus(), o.getPosition(), o.getVersion()); }
    }
    public record ColumnView(Long id, Long projectId, String name, Status kind, int position, long version) {
        public static ColumnView of(ProjectColumn c) { return new ColumnView(c.getId(), c.getProject().getId(), c.getName(), c.getKind(), c.getPosition(), c.getVersion()); }
    }
    public record ProjectView(Long id, Long userId, String title, String description, String color, String imageUrl,
                              ProjectMode mode, boolean favorite, Boolean archived, Instant lastAccessed,
                              Long defaultPendingColumnId, Long defaultCompletedColumnId, long version,
                              List<ObjectiveView> objectives) {
        public static ProjectView of(Project p, boolean detail) {
            return new ProjectView(p.getId(), p.getUser().getId(), p.getTitle(), p.getDescription(), p.getColor(), p.getImageUrl(), p.getMode(),
                p.isFavorite(), p.getArchived(), p.getLastAccessed(), p.getDefaultPendingColumnId(), p.getDefaultCompletedColumnId(),
                p.getVersion(), detail ? p.getObjectives().stream().map(ObjectiveView::of).toList() : null);
        }
    }
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
