package com.oriens.oriens_api.entity.dto;

import com.oriens.oriens_api.entity.embeddable.Objective;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDTO {
    private Long id;
    private String title;
    private String description;
    private String imageUrl;
    private String color;
    private boolean favorite;
    private Boolean archived;
    private Instant lastAccessed;
    private int progress;
    private long totalObjectives;
    private List<Objective> objectives;
}
