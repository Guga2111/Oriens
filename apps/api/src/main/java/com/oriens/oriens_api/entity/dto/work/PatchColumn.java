package com.oriens.oriens_api.entity.dto.work;

import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.entity.embeddable.Location;
import java.time.*;

public class PatchColumn extends PatchFields {
    private Long version;
    public Long getVersion() { return version; }
    public void setVersion(Long value) { supplied("version"); version = value; }
    private Long projectVersion;
    public Long getProjectVersion() { return projectVersion; }
    public void setProjectVersion(Long value) { supplied("projectVersion"); projectVersion = value; }
    private String name;
    public String getName() { return name; }
    public void setName(String value) { supplied("name"); name = value; }
    private Status kind;
    public Status getKind() { return kind; }
    public void setKind(Status value) { supplied("kind"); kind = value; }
}
