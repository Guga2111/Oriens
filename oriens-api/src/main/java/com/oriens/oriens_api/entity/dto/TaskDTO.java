package com.oriens.oriens_api.entity.dto;

import com.oriens.oriens_api.entity.enums.Priority;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class TaskDTO {

    private String title;
    private String description;
    private LocalDate dueDate;
    private LocalTime startTime;
    private Priority priority;

    private LocationDTO location;

}
