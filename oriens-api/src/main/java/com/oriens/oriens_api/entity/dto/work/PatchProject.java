package com.oriens.oriens_api.entity.dto.work;

import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.entity.embeddable.Location;
import java.time.*;

public class PatchProject extends PatchFields {
    private Long version;
    public Long getVersion() { return version; }
    public void setVersion(Long value) { supplied("version"); version = value; }
    private String title;
    public String getTitle() { return title; }
    public void setTitle(String value) { supplied("title"); title = value; }
    private String description;
    public String getDescription() { return description; }
    public void setDescription(String value) { supplied("description"); description = value; }
    private String color;
    public String getColor() { return color; }
    public void setColor(String value) { supplied("color"); color = value; }
}
