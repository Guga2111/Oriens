package com.oriens.oriens_api.entity.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WeeklySummaryDTO {

    private int completedTasks;
    private int totalTasks;
}
