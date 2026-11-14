package com.oriens.oriens_api.entity.dto.work;

import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.entity.embeddable.Location;
import java.time.*;

public class PatchObjective extends PatchFields {
    private Long version;
    public Long getVersion() { return version; }
    public void setVersion(Long value) { supplied("version"); version = value; }
    private String title;
    public String getTitle() { return title; }
    public void setTitle(String value) { supplied("title"); title = value; }
    private LocalDate dueDate;
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate value) { supplied("dueDate"); dueDate = value; }
    private ObjectiveStatus status;
    public ObjectiveStatus getStatus() { return status; }
    public void setStatus(ObjectiveStatus value) { supplied("status"); status = value; }
}
