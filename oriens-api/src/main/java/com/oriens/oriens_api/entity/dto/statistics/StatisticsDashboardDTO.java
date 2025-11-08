package com.oriens.oriens_api.entity.dto.statistics;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class StatisticsDashboardDTO {
    private KpiDTO kpi;
    private ChartDTO charts;
}
