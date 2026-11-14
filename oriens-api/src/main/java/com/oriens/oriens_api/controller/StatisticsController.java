package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.dto.statistics.StatisticsDashboardDTO;
import com.oriens.oriens_api.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/statistics")
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;
    private final com.oriens.oriens_api.security.WorkOwner owner;

    @GetMapping("/user/{userId}/dashboard")
    public ResponseEntity<StatisticsDashboardDTO> getStatistics (org.springframework.security.core.Authentication auth, @PathVariable Long userId) {
        return new ResponseEntity<>(statisticsService.getDashboardData(owner.matching(auth, userId)), HttpStatus.OK);
    }
}
