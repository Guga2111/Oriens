package com.oriens.oriens_api.entity.dto.statistics;

import lombok.*;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class KpiDTO {
    private Map<String, KpiDataDTO> kpis;
}
