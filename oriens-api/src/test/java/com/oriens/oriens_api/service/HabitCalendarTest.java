package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.dto.statistics.HabitViews.Pause;
import com.oriens.oriens_api.entity.dto.statistics.HabitViews.Schedule;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/** Weeks used here: 2026-11-02 (Mon) … 2026-11-08 (Sun) and 2026-11-09 (Mon) … 2026-11-15 (Sun). */
class HabitCalendarTest {
    static final List<Integer> EVERY_DAY = List.of(1, 2, 3, 4, 5, 6, 7);
    static LocalDate d(String value) { return value == null ? null : LocalDate.parse(value); }
    static Schedule weekly(int target, String start, String end) { return new Schedule(d(start), d(end), EVERY_DAY, target); }
    static Schedule fixed(List<Integer> weekdays, String start, String end) { return new Schedule(d(start), d(end), weekdays, null); }
    static Set<LocalDate> done(String... days) { return new HashSet<>(Arrays.stream(days).map(LocalDate::parse).toList()); }
    static HabitCalendar calendar(List<Schedule> schedules, Set<LocalDate> executions, String today) {
        return new HabitCalendar(d("2026-11-02"), null, schedules, List.of(), executions, d(today));
    }
    static List<String> week(HabitCalendar calendar, String monday) {
        return d(monday).datesUntil(d(monday).plusDays(7)).map(calendar::state).toList();
    }

    // Regression: a "5x per week" habit used to be bound to fixed weekdays, so training on any
    // other day counted as a missed occurrence and the real execution was not counted.
    @Test void weeklyTargetAcceptsAnyDaysAndNeverMissesAMetWeek() {
        var calendar = calendar(List.of(weekly(5, "2026-11-02", null)),
            done("2026-11-02", "2026-11-04", "2026-11-05", "2026-11-07", "2026-11-08",
                 "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-14", "2026-11-15"), "2026-11-16");
        assertThat(week(calendar, "2026-11-02")).containsExactly("DONE", "OPTIONAL", "DONE", "DONE", "OPTIONAL", "DONE", "DONE");
        assertThat(week(calendar, "2026-11-09")).containsExactly("OPTIONAL", "DONE", "DONE", "DONE", "OPTIONAL", "DONE", "DONE");
    }

    @Test void anOpenWeekIsNotMissedWhileTheTargetIsStillReachable() {
        var calendar = calendar(List.of(weekly(5, "2026-11-02", null)), done("2026-11-09", "2026-11-10"), "2026-11-12");
        assertThat(week(calendar, "2026-11-09").subList(0, 4)).containsExactly("DONE", "DONE", "OPTIONAL", "PENDING");
    }

    @Test void onlyTheShortfallIsMissedOnceTheWeekCanNoLongerReachTheTarget() {
        var closed = calendar(List.of(weekly(5, "2026-11-02", null)), done("2026-11-02", "2026-11-03"), "2026-11-12");
        assertThat(week(closed, "2026-11-02")).containsExactly("DONE", "DONE", "OPTIONAL", "OPTIONAL", "MISSED", "MISSED", "MISSED");

        var late = calendar(List.of(weekly(5, "2026-11-02", null)), done("2026-11-09"), "2026-11-14");
        assertThat(week(late, "2026-11-09").subList(0, 6)).containsExactly("DONE", "OPTIONAL", "OPTIONAL", "MISSED", "MISSED", "PENDING");
    }

    @Test void executionsBeyondTheTargetAreDoneAndLeaveNothingPending() {
        var calendar = calendar(List.of(weekly(2, "2026-11-02", null)), done("2026-11-09", "2026-11-10", "2026-11-11"), "2026-11-12");
        assertThat(week(calendar, "2026-11-09").subList(0, 4)).containsExactly("DONE", "DONE", "DONE", "OPTIONAL");
    }

    @Test void aShortenedWeekProratesTheTargetRoundingUp() {
        // Starts on Wednesday: 5 of 7 days in force, so 5 × 5/7 → 4 expected.
        var started = new HabitCalendar(d("2026-11-04"), null, List.of(weekly(5, "2026-11-04", null)), List.of(), Set.of(), d("2026-11-12"));
        assertThat(week(started, "2026-11-02")).containsExactly("OUTSIDE", "OUTSIDE", "OPTIONAL", "MISSED", "MISSED", "MISSED", "MISSED");
        // A two-day pause on a daily target leaves 5 required days.
        var paused = new HabitCalendar(d("2026-11-02"), null, List.of(weekly(7, "2026-11-02", null)),
            List.of(new Pause(d("2026-11-02"), d("2026-11-03"))), Set.of(), d("2026-11-12"));
        assertThat(week(paused, "2026-11-02")).containsExactly("PAUSED", "PAUSED", "MISSED", "MISSED", "MISSED", "MISSED", "MISSED");
    }

    @Test void fixedWeekdaysKeepTheirOriginalBehaviour() {
        var calendar = calendar(List.of(fixed(List.of(1, 5), "2026-11-02", null)), done("2026-11-02"), "2026-11-13");
        assertThat(week(calendar, "2026-11-02")).containsExactly("DONE", "OFF", "OFF", "OFF", "MISSED", "OFF", "OFF");
        assertThat(calendar.state(d("2026-11-13"))).isEqualTo("PENDING");
    }

    @Test void aMidWeekSwitchJudgesEachPartByItsOwnSchedule() {
        // Fixed Mon–Wed until Wednesday, then 3x/week: Thu–Sun is 4/7 of a week, so 2 are expected.
        var calendar = calendar(List.of(fixed(List.of(1, 2, 3), "2026-11-02", "2026-11-11"), weekly(3, "2026-11-12", null)),
            done("2026-11-09", "2026-11-12"), "2026-11-15");
        assertThat(week(calendar, "2026-11-09")).containsExactly("DONE", "MISSED", "MISSED", "DONE", "OPTIONAL", "OPTIONAL", "PENDING");
    }
}
