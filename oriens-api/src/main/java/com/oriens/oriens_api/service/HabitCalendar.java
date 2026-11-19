package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.dto.statistics.HabitViews.Pause;
import com.oriens.oriens_api.entity.dto.statistics.HabitViews.Schedule;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

/**
 * Day states of one habit, computed in memory from its already loaded definition.
 *
 * <p>A fixed-weekday schedule expects one execution on each programmed weekday. A flexible schedule
 * ({@code weeklyTarget}) expects that many executions per ISO week (Monday–Sunday) on any day. Its
 * unmet quota is charged to the days that remain open in the week (today first, then the latest days),
 * so a day becomes {@code MISSED} only once the week can no longer reach the target; the other open days
 * are {@code OPTIONAL}. A day's state depends only on its week, never on the queried window.
 *
 * @param from first day in force (inclusive)
 * @param until last day in force (inclusive), or {@code null} while the habit has no end
 */
record HabitCalendar(LocalDate from, LocalDate until, List<Schedule> schedules, List<Pause> pauses,
                     Set<LocalDate> executions, LocalDate today) {
    /** States counted in the expected occurrences (the adherence denominator). */
    static final Set<String> EXPECTED = Set.of("DONE", "PENDING", "MISSED");
    /** States on which an execution may be recorded or removed. */
    static final Set<String> EXECUTABLE = Set.of("DONE", "PENDING", "MISSED", "OPTIONAL");

    String state(LocalDate day) {
        if (!inForce(day)) return "OUTSIDE";
        if (paused(day)) return "PAUSED";
        Schedule schedule = schedule(day);
        if (schedule == null) return "OFF";
        if (schedule.weeklyTarget() == null) {
            if (!schedule.weekdays().contains(day.getDayOfWeek().getValue())) return "OFF";
            if (executions.contains(day)) return "DONE";
            return day.equals(today) ? "PENDING" : "MISSED";
        }
        if (executions.contains(day)) return "DONE";
        if (!charged(day)) return "OPTIONAL";
        return day.equals(today) ? "PENDING" : "MISSED";
    }

    /** Whether the unmet weekly quota of a flexible day's week falls on that open day. */
    private boolean charged(LocalDate day) {
        LocalDate monday = day.with(DayOfWeek.MONDAY);
        List<LocalDate> week = monday.datesUntil(monday.plusDays(7)).filter(this::flexible).toList();
        int target = schedule(week.get(week.size() - 1)).weeklyTarget();
        // Pauses, start/end dates and mid-week schedule changes shrink the week: prorate, rounding up.
        long quota = (target * week.size() + 6) / 7;
        long remaining = quota - week.stream().filter(executions::contains).count();
        if (remaining <= 0) return false;
        List<LocalDate> open = week.stream().filter(d -> !executions.contains(d))
            .sorted(Comparator.comparing((LocalDate d) -> !d.equals(today)).thenComparing(Comparator.reverseOrder()))
            .toList();
        return open.indexOf(day) < remaining;
    }

    private boolean flexible(LocalDate day) {
        if (!inForce(day) || paused(day)) return false;
        Schedule schedule = schedule(day);
        return schedule != null && schedule.weeklyTarget() != null;
    }

    private boolean inForce(LocalDate day) {
        return !day.isBefore(from) && (until == null || !day.isAfter(until));
    }

    private boolean paused(LocalDate day) {
        return pauses.stream().anyMatch(p -> !day.isBefore(p.startDate()) && !day.isAfter(p.endDate()));
    }

    private Schedule schedule(LocalDate day) {
        return schedules.stream()
            .filter(s -> !day.isBefore(s.startDate()) && (s.endDate() == null || !day.isAfter(s.endDate())))
            .findFirst().orElse(null);
    }
}
