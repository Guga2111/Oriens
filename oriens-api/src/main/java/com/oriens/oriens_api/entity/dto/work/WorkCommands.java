package com.oriens.oriens_api.entity.dto.work;

import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.entity.embeddable.Location;
import java.time.*;
import java.util.List;

/** P0 write contracts. ownerId is supplied by the trusted caller, never by these bodies. */
public final class WorkCommands {
    private WorkCommands() {}
    public record NewObjective(String title, LocalDate dueDate) {}
    public record CreateProject(String title, ProjectMode mode, String description, String color,
                                List<NewObjective> objectives) {}
    public record CreateObjective(Long projectVersion, String title, LocalDate dueDate) {}
    public record CreateColumn(Long projectVersion, String name, Status kind) {}
    public record OrderColumns(Long projectVersion, List<Long> columnIds) {}
    public record BoardDefaults(Long projectVersion, Long pendingColumnId, Long completedColumnId) {}
    public record RemoveColumn(Long projectVersion, Long targetColumnId,
                               Long replacementPendingColumnId, Long replacementCompletedColumnId) {}
    public record CreateTask(String title, String description, Long projectId, Long projectVersion,
                             Long objectiveId, Long columnId, LocalDate plannedDate, LocalTime startTime,
                             LocalDate dueDate, Priority priority, Location location) {}
}
