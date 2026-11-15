package com.oriens.oriens_api.entity.dto.statistics;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public final class HabitViews {
    private HabitViews() {}
    public record Input(@NotBlank @Size(max=100) String name, @NotEmpty List<@Min(1) @Max(7) Integer> weekdays,
                        @NotNull LocalDate startDate, LocalDate endDate) {}
    public record Update(@NotNull Long version, @NotBlank @Size(max=100) String name,
                         @NotEmpty List<@Min(1) @Max(7) Integer> weekdays) {}
    public record Execution(@NotNull Long version, boolean completed) {}
    public record PauseInput(@NotNull Long version, @NotNull LocalDate startDate, @NotNull LocalDate endDate) {}
    public record Version(@NotNull Long version) {}
    public record Schedule(LocalDate startDate, LocalDate endDate, List<Integer> weekdays) {}
    public record Pause(LocalDate startDate, LocalDate endDate) {}
    public record Day(LocalDate date, String state) {}
    public record Habit(Long id, String name, LocalDate createdOn, LocalDate startDate, LocalDate endDate,
                        LocalDate archivedOn, long version, List<Schedule> schedules, List<Pause> pauses,
                        List<Day> days, long completed, long expected, long previousCompleted, long previousExpected) {}
    public record Summary(StatisticsViews.Period period, LocalDate coverageFrom, List<Habit> habits,
                          List<StatisticsViews.DayCount> days, List<StatisticsViews.DayCount> previousDays,
                          long completed, long expected, long previousCompleted, long previousExpected) {}
}
