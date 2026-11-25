package com.oriens.oriens_api.entity.dto.statistics;

import lombok.*;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class ChartDTO {
    private List<TasksCompletedByTimeRangeDTO> tasksCompletedByTimeRangeDTOS;
}
