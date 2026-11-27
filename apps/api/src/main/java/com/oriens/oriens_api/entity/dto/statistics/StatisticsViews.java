package com.oriens.oriens_api.entity.dto.statistics;

import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.exception.WorkDomainException;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.List;

public final class StatisticsViews {
    private StatisticsViews() {}
    public record Period(LocalDate startDate, LocalDate endDate, LocalDate previousStartDate,
                         LocalDate previousEndDate, LocalDate today, String timezone, boolean partial) {
        public static Period of(LocalDate start, LocalDate end, Clock clock) {
            LocalDate today = LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE));
            if (start == null || end == null || start.isAfter(end) || end.isAfter(today)
                    || ChronoUnit.DAYS.between(start, end) >= 366)
                throw new WorkDomainException("INVALID_REQUEST", "endDate", "Escolha um intervalo de até 366 dias, com início anterior ao fim e sem datas futuras.");
            long days = ChronoUnit.DAYS.between(start, end) + 1;
            return new Period(start, end, start.minusDays(days), start.minusDays(1), today,
                ProductClockConfiguration.ZONE.getId(), end.equals(today));
        }
    }
    public record DayCount(LocalDate date, long completed) {}
    public record Streak(LocalDate today, Long days, LocalDate startDate, LocalDate throughDate,
                         boolean lowerBound, LocalDate coverageFrom) {}
    public record Activity(Period period, LocalDate coverageFrom, long total, long previousTotal,
                           List<DayCount> days, List<DayCount> previousDays) {}
    public record PlanCounts(long planned, long completed) {}
    public record OverdueGroup(Long projectId, String title, long total) {}
    public record Planning(Period period, PlanCounts current, PlanCounts previous, long overdue,
                           List<OverdueGroup> overdueByProject) {}
    public record TaskEvidence(Long id, String title, LocalDate completedAt, LocalDate plannedDate,
                               LocalDate dueDate, String status, Long projectId, String projectTitle, String projectImageUrl) {}
    public record Money(@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal income, @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal expenses, @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal result, long entries,
                        /** Net investment transfers (withdrawals minus contributions): move the balance, never income or expenses. */
                        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal investmentTransfers) {}
    public record MoneyDay(LocalDate date, @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal income, @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal expenses) {}
    public record Category(Long tagId, String name, @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount, long entries) {}
    public record Finance(Period period, Money current, Money previous, List<MoneyDay> days,
                          List<Category> categories, long automaticEntries) {}
}
