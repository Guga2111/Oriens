package com.oriens.oriens_api.service;

import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.entity.dto.statistics.*;
import com.oriens.oriens_api.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;

/** Compatibility adapter for older clients. Analysis projections own all metric populations. */
@Service @RequiredArgsConstructor
public class StatisticsService {
    private final Clock clock;
    private final StatisticsReadService analysis;
    private final ProjectRepository projects;
    public StatisticsDashboardDTO getDashboardData(Long userId) {
        LocalDate today=LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE));
        var activity=analysis.activity(userId,today.withDayOfMonth(1),today);
        var plan=analysis.planning(userId,today.minusDays(today.getDayOfWeek().getValue()-1),today);
        var counts=plan.current();
        Map<String,KpiDataDTO> kpis=new LinkedHashMap<>();
        // Old DTO has no delta unit: never put percentage points into its generic percent field.
        kpis.put("completedTasks",metric(activity.total(),null,"Conclusões registradas neste mês","De "+activity.period().startDate()+" a "+today));
        kpis.put("productivityRate",metric(counts.planned()==0?0:Math.round(counts.completed()*100.0/counts.planned()),null,
            counts.planned()==0?"Nenhuma tarefa planejada":counts.completed()+" de "+counts.planned()+" planejadas",
            "Semana até "+today+"; taxa detalhada e pontos percentuais disponíveis na análise por período"));
        kpis.put("activeProjects",metric(projects.countActiveProjects(userId),null,"Projetos não arquivados","Estoque atual, sem avaliação de progresso"));
        kpis.put("overdueTasks",metric(plan.overdue(),null,"Tarefas abertas com prazo anterior a hoje","Estoque atual em "+today));
        var year=analysis.activity(userId,today.minusYears(1).plusDays(1),today);
        var chart=year.days().stream().filter(d->!d.date().isBefore(year.coverageFrom())||d.completed()>0)
            .map(d->new TasksCompletedByTimeRangeDTO(d.date(),d.completed())).toList();
        return StatisticsDashboardDTO.builder().kpi(KpiDTO.builder().kpis(kpis).build())
            .charts(ChartDTO.builder().tasksCompletedByTimeRangeDTOS(chart).build()).build();
    }
    private KpiDataDTO metric(long value,Double change,String description,String detail) {
        return KpiDataDTO.builder().value(Math.toIntExact(value)).change(change).description(description).additionalDescription(detail).build();
    }
}
