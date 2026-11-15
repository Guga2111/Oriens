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
    private final com.oriens.oriens_api.service.StatisticsReadService read;
    private final com.oriens.oriens_api.service.FinancialStatisticsService finance;

    @GetMapping("/user/{userId}/activity")
    public Object activity(org.springframework.security.core.Authentication auth, @PathVariable Long userId,
            @org.springframework.web.bind.annotation.RequestParam @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @org.springframework.web.bind.annotation.RequestParam @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        return read.activity(owner.matching(auth,userId),startDate,endDate);
    }
    @GetMapping("/user/{userId}/planning")
    public Object planning(org.springframework.security.core.Authentication auth, @PathVariable Long userId,
            @org.springframework.web.bind.annotation.RequestParam @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @org.springframework.web.bind.annotation.RequestParam @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        return read.planning(owner.matching(auth,userId),startDate,endDate);
    }
    @GetMapping("/user/{userId}/finance")
    public Object finance(org.springframework.security.core.Authentication auth, @PathVariable Long userId,
            @org.springframework.web.bind.annotation.RequestParam @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @org.springframework.web.bind.annotation.RequestParam @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        return finance.summary(owner.matching(auth,userId),startDate,endDate);
    }
    @GetMapping("/user/{userId}/tasks")
    public Object tasks(org.springframework.security.core.Authentication auth, @PathVariable Long userId,
            @org.springframework.web.bind.annotation.RequestParam String kind,
            @org.springframework.web.bind.annotation.RequestParam @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @org.springframework.web.bind.annotation.RequestParam @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate,
            @org.springframework.web.bind.annotation.RequestParam(required=false) Long projectId,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue="false") boolean unassigned,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue="0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue="20") int size) {
        return read.evidence(owner.matching(auth,userId),kind,startDate,endDate,projectId,unassigned,page,size);
    }

    @GetMapping("/user/{userId}/dashboard")
    public ResponseEntity<StatisticsDashboardDTO> getStatistics (org.springframework.security.core.Authentication auth, @PathVariable Long userId) {
        return new ResponseEntity<>(statisticsService.getDashboardData(owner.matching(auth, userId)), HttpStatus.OK);
    }
}
