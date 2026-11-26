package com.oriens.oriens_api.entity.dto.statistics;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class KpiDataDTO {
    private int value;
    private Double change;
    private String description;
    private String additionalDescription;
}
