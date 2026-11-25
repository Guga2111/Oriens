package com.oriens.oriens_api.entity.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class SupportDashboardStatsDTO {

    private long totalTickets;
    private long openTickets;
    private long inProgressTickets;
    private long closedTickets;
    private double averageResolutionTime;
}
