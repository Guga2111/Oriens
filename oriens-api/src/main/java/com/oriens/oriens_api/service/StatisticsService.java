package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.dto.statistics.*;
import com.oriens.oriens_api.entity.enums.Status;
import com.oriens.oriens_api.repository.ProjectRepository;
import com.oriens.oriens_api.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final java.time.Clock clock;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;

    public StatisticsDashboardDTO getDashboardData (Long userId) {

        KpiDTO kpiDto = buildKpiDTO(userId);

        ChartDTO chartDTO = buildChartDTO(userId);

        return StatisticsDashboardDTO.builder()
                .kpi(kpiDto)
                .charts(chartDTO)
                .build();
    }

    private KpiDTO buildKpiDTO (Long userId) {
        Map<String, KpiDataDTO> kpiMap = new HashMap<>();

        kpiMap.put("completedTasks", getCompletedTasksInActualMonth(userId));
        kpiMap.put("productivityRate", getActualWeekProductivePercentage(userId));
        kpiMap.put("activeProjects", getActiveProjects(userId));
        kpiMap.put("overdueTasks", getOverdueTasksKpi(userId));

        return KpiDTO.builder().kpis(kpiMap).build();
    }

    private KpiDataDTO getCompletedTasksInActualMonth (Long userId) {
        YearMonth actualMonth = YearMonth.from(today());
        YearMonth previousMonth = actualMonth.minusMonths(1);

        long tasksThisMonth = taskRepository.countCompletedTasksInDateRange(userId, actualMonth.atDay(1), actualMonth.atEndOfMonth());
        long tasksLastMonth = taskRepository.countCompletedTasksInDateRange(userId, previousMonth.atDay(1), previousMonth.atEndOfMonth());

        Double change = calculatePercentageChange(tasksLastMonth, tasksThisMonth);
        int tasksConcluded = (int) tasksThisMonth;
        String description = "Ritmo normal";

        if (change == null) {
            description = "Primeiras conclusões neste mês";
        } else if (change > 0) {
            description = "Ritmo forte este mês";
        } else if (change < 0) {
            description = "Ritmo fraco este mês";
        }

        return KpiDataDTO.builder()
                .value(tasksConcluded)
                .change(change)
                .description(description)
                .additionalDescription("Comparado ao mês anterior")
                .build();

    }

    private KpiDataDTO getActualWeekProductivePercentage (Long userId) {

        LocalDate now = today();
        LocalDate startOfThisWeek = now.minusDays(now.getDayOfWeek().getValue() - 1);
        LocalDate startOfLastWeek = startOfThisWeek.minusWeeks(1);

        long completedThisWeek = taskRepository.countCompletedPlanned(userId, startOfThisWeek, now);
        long totalDueThisWeek = taskRepository.countTotalTasksInDateRange(userId, startOfThisWeek, now);
        double rateThisWeek = (totalDueThisWeek == 0) ? 0 : ((double) completedThisWeek / totalDueThisWeek) * 100;

        long completedLastWeek = taskRepository.countCompletedPlanned(userId, startOfLastWeek, startOfThisWeek.minusDays(1));
        long totalDueLastWeek = taskRepository.countTotalTasksInDateRange(userId, startOfLastWeek, startOfThisWeek.minusDays(1));
        double rateLastWeek = (totalDueLastWeek == 0) ? 0 : ((double) completedLastWeek / totalDueLastWeek) * 100;

        double change = rateThisWeek - rateLastWeek;
        String description = "Mantendo as metas em dia";

        if (change > 0) {
            description = "Aumentando as metas";
        } else if (change < 0) {
            description = "Metas cairam de rendimento";
        }

        return KpiDataDTO.builder()
                .value((int) rateThisWeek)
                .change(change)
                .description(description)
                .additionalDescription("Concluídas / planejadas de " + startOfThisWeek + " a " + now)
                .build();
    }

    private KpiDataDTO getActiveProjects (Long userId) {

        long activeProjects = projectRepository.countActiveProjects(userId);

        return KpiDataDTO.builder()
                .value((int) activeProjects)
                .change(null)
                .description("Projetos NÃO arquivados")
                .additionalDescription("Total de projetos ativos")
                .build();
    }

    private KpiDataDTO getOverdueTasksKpi (Long userId) {

        LocalDate today = today();
        long overdue = taskRepository.countOverdueTasksInDateRange(userId, LocalDate.of(1, 1, 1), today.minusDays(1));

        return KpiDataDTO.builder()
                .value((int) overdue)
                .change(null)
                .description("Prazos ultrapassados em tarefas abertas")
                .additionalDescription("Prazo final anterior a " + today)
                .build();
    }

    private ChartDTO buildChartDTO (Long userId) {
        LocalDate startDate = today().minusYears(1);

        List<Object[]> rawChartData =
                taskRepository.findTasksCompletedByDay(userId, startDate);

        List<TasksCompletedByTimeRangeDTO> chartData = rawChartData.stream()
                .map(row -> new TasksCompletedByTimeRangeDTO(
                        (LocalDate) row[0],
                        (Long) row[1]
                ))
                .collect(Collectors.toList());

        return ChartDTO.builder()
                .tasksCompletedByTimeRangeDTOS(chartData)
                .build();
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(com.oriens.oriens_api.configuration.ProductClockConfiguration.ZONE));
    }

    private Double calculatePercentageChange(long oldValue, long newValue) {
        if (oldValue == 0) {
            return (newValue > 0) ? null : 0.0;
        }
        return ((double) (newValue - oldValue) / oldValue) * 100.0;
    }
}
