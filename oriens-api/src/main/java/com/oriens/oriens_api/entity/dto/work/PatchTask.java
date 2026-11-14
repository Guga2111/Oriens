package com.oriens.oriens_api.entity.dto.work;

import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.entity.embeddable.Location;
import java.time.*;

public class PatchTask extends PatchFields {
    private Long version;
    public Long getVersion() { return version; }
    public void setVersion(Long value) { supplied("version"); version = value; }
    private Long projectVersion;
    public Long getProjectVersion() { return projectVersion; }
    public void setProjectVersion(Long value) { supplied("projectVersion"); projectVersion = value; }
    private Long targetProjectVersion;
    public Long getTargetProjectVersion() { return targetProjectVersion; }
    public void setTargetProjectVersion(Long value) { supplied("targetProjectVersion"); targetProjectVersion = value; }
    private String title;
    public String getTitle() { return title; }
    public void setTitle(String value) { supplied("title"); title = value; }
    private String description;
    public String getDescription() { return description; }
    public void setDescription(String value) { supplied("description"); description = value; }
    private Long projectId;
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long value) { supplied("projectId"); projectId = value; }
    private Long objectiveId;
    public Long getObjectiveId() { return objectiveId; }
    public void setObjectiveId(Long value) { supplied("objectiveId"); objectiveId = value; }
    private Long columnId;
    public Long getColumnId() { return columnId; }
    public void setColumnId(Long value) { supplied("columnId"); columnId = value; }
    private Status status;
    public Status getStatus() { return status; }
    public void setStatus(Status value) { supplied("status"); status = value; }
    private LocalDate plannedDate;
    public LocalDate getPlannedDate() { return plannedDate; }
    public void setPlannedDate(LocalDate value) { supplied("plannedDate"); plannedDate = value; }
    private LocalTime startTime;
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime value) { supplied("startTime"); startTime = value; }
    private LocalDate dueDate;
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate value) { supplied("dueDate"); dueDate = value; }
    private Priority priority;
    public Priority getPriority() { return priority; }
    public void setPriority(Priority value) { supplied("priority"); priority = value; }
    private Location location;
    public Location getLocation() { return location; }
    public void setLocation(Location value) { supplied("location"); location = value; }
    private Long beforeTaskId;
    public Long getBeforeTaskId() { return beforeTaskId; }
    public void setBeforeTaskId(Long value) { supplied("beforeTaskId"); beforeTaskId = value; }
}
