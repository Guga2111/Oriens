package com.oriens.oriens_api.entity.dto.statistics;

import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class TasksCompletedByTimeRangeDTO {
    private LocalDate date;
    private int completed;

    public TasksCompletedByTimeRangeDTO (LocalDate date, Long count) {
        this.completed = count.intValue();
        this.date = date;
    }
}
