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
        YearMonth actualMonth = YearMonth.now();
        YearMonth previousMonth = actualMonth.minusMonths(1);

        long tasksThisMonth = taskRepository.countCompletedTasksInDateRange(userId, actualMonth.atDay(1), actualMonth.atEndOfMonth());
        long tasksLastMonth = taskRepository.countCompletedTasksInDateRange(userId, previousMonth.atDay(1), previousMonth.atEndOfMonth());

        double change = calculatePercentageChange(tasksLastMonth, tasksThisMonth);
        int tasksConcluded = (int) tasksThisMonth;
        String description = "Ritmo normal";

        if (change > 0) {
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

        LocalDate now = LocalDate.now();
        LocalDate startOfThisWeek = now.minusDays(now.getDayOfWeek().getValue() - 1);
        LocalDate startOfLastWeek = startOfThisWeek.minusWeeks(1);

        long completedThisWeek = taskRepository.countCompletedTasksInDateRange(userId, startOfThisWeek, now);
        long totalDueThisWeek = taskRepository.countTotalTasksInDateRange(userId, startOfThisWeek, now.plusDays(1));
        double rateThisWeek = (totalDueThisWeek == 0) ? 0 : ((double) completedThisWeek / totalDueThisWeek) * 100;

        long completedLastWeek = taskRepository.countCompletedTasksInDateRange(userId, startOfLastWeek, startOfThisWeek.minusDays(1));
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
                .additionalDescription("Média da última semana")
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

        YearMonth actualMonth = YearMonth.now();
        YearMonth previousMonth = actualMonth.minusMonths(1);

        long overdueTaskThisMonth = taskRepository.countOverdueTasksInDateRange(userId, actualMonth.atDay(1), actualMonth.atEndOfMonth());
        long overdueTaskLastMonth = taskRepository.countOverdueTasksInDateRange(userId, previousMonth.atDay(1), previousMonth.atEndOfMonth());

        double change = calculatePercentageChange(overdueTaskLastMonth, overdueTaskThisMonth);
        String description = "Tranquilo nas pendências";
        String additionalDescription = "Ritmo mantido";

        if (change > 0) {
            description = "Melhora de %" + change + " nas pendências";
            additionalDescription = "Continue com o ritmo assim";
        } else if (change < 0) {
            description = "Piora de %" + change + " nas pendências";
            additionalDescription = "Resolva para manter o ritmo";
        }

        return KpiDataDTO.builder()
                .value((int) overdueTaskThisMonth)
                .change(change)
                .description(description)
                .additionalDescription(additionalDescription)
                .build();
    }

    private ChartDTO buildChartDTO (Long userId) {
        LocalDate startDate = LocalDate.now().minusYears(1);

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

    private double calculatePercentageChange(long oldValue, long newValue) {
        if (oldValue == 0) {
            return (newValue > 0) ? 100.0 : 0.0;
        }
        return ((double) (newValue - oldValue) / oldValue) * 100.0;
    }
}
