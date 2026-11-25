package com.oriens.oriens_api.entity.dto.statistics;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public final class HabitViews {
    private HabitViews() {}
    /** Frequency is either fixed {@code weekdays} or {@code weeklyTarget} executions per week on any day, never both. */
    public record Input(@NotBlank @Size(max=100) String name, List<@Min(1) @Max(7) Integer> weekdays,
                        @Min(1) @Max(7) Integer weeklyTarget, @NotNull LocalDate startDate, LocalDate endDate) {}
    public record Update(@NotNull Long version, @NotBlank @Size(max=100) String name,
                         List<@Min(1) @Max(7) Integer> weekdays, @Min(1) @Max(7) Integer weeklyTarget) {}
    public record Execution(@NotNull Long version, boolean completed) {}
    public record PauseInput(@NotNull Long version, @NotNull LocalDate startDate, @NotNull LocalDate endDate) {}
    public record Version(@NotNull Long version) {}
    public record Schedule(LocalDate startDate, LocalDate endDate, List<Integer> weekdays, Integer weeklyTarget) {}
    public record Pause(LocalDate startDate, LocalDate endDate) {}
    public record Day(LocalDate date, String state) {}
    public record Habit(Long id, String name, LocalDate createdOn, LocalDate startDate, LocalDate endDate,
                        LocalDate archivedOn, long version, List<Schedule> schedules, List<Pause> pauses,
                        List<Day> days, long completed, long expected, long previousCompleted, long previousExpected) {}
    public record Summary(StatisticsViews.Period period, LocalDate coverageFrom, List<Habit> habits,
                          List<StatisticsViews.DayCount> days, List<StatisticsViews.DayCount> previousDays,
                          long completed, long expected, long previousCompleted, long previousExpected) {}
}
