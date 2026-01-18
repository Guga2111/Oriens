package com.oriens.oriens_api.entity.dto;

import com.oriens.oriens_api.entity.embeddable.Location;
import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.entity.enums.Status;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponseDTO {
    private Long id;
    private String title;
    private String description;
    private LocalTime startTime;
    private LocalDate dueDate;
    private LocalDate completedAt;
    private Priority priority;
    private Status status;
    private LocalDateTime createdAt;
    private Location location;
}
