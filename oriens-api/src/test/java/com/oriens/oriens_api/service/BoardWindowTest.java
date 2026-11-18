package com.oriens.oriens_api.service;

import com.oriens.oriens_api.exception.WorkDomainException;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BoardWindowTest {
    static LocalDate d(String value) { return value == null ? null : LocalDate.parse(value); }
    final BoardWindow window = BoardWindow.of(d("2026-11-10"), d("2026-11-20"));

    boolean includes(String planned, String due) { return window.includes(d(planned), d(due)); }

    @Test void withoutBoundsTheBoardIsNotWindowed() {
        assertThat(BoardWindow.of(null, null)).isNull();
    }

    @Test void includesTasksWhoseSpanOverlapsTheWindow() {
        assertThat(includes("2026-11-12", "2026-11-15")).as("inside").isTrue();
        assertThat(includes("2026-11-05", "2026-11-10")).as("crosses the start, touching it").isTrue();
        assertThat(includes("2026-11-20", "2026-11-28")).as("crosses the end, touching it").isTrue();
        assertThat(includes("2026-11-01", "2026-11-30")).as("covers the whole window").isTrue();
        assertThat(includes("2026-11-25", "2026-11-15")).as("planned after due spans due..planned").isTrue();
        assertThat(includes("2026-11-15", null)).as("only planned").isTrue();
        assertThat(includes(null, "2026-11-15")).as("only due").isTrue();
        assertThat(includes(null, null)).as("no dates has no position in time").isTrue();
    }

    @Test void excludesTasksEntirelyOutsideTheWindow() {
        assertThat(includes("2026-11-01", "2026-11-09")).as("entirely before").isFalse();
        assertThat(includes("2026-11-21", "2026-11-30")).as("entirely after").isFalse();
        assertThat(includes("2026-11-30", "2026-11-21")).as("inverted and after").isFalse();
        assertThat(includes("2026-11-09", null)).as("only planned, before").isFalse();
        assertThat(includes(null, "2026-11-21")).as("only due, after").isFalse();
    }

    @Test void rejectsIncompleteInvertedOrTooLongWindows() {
        assertInvalid(d("2026-11-10"), null, "endDate");
        assertInvalid(null, d("2026-11-10"), "startDate");
        assertInvalid(d("2026-11-20"), d("2026-11-10"), "startDate");
        assertInvalid(d("2026-01-01"), d("2027-01-02"), "endDate");
        assertThat(BoardWindow.of(d("2026-01-01"), d("2027-01-01"))).as("366 days is the limit").isNotNull();
        assertThat(BoardWindow.of(d("2026-11-10"), d("2026-11-10"))).as("one day").isNotNull();
    }

    static void assertInvalid(LocalDate start, LocalDate end, String field) {
        assertThatThrownBy(() -> BoardWindow.of(start, end)).isInstanceOfSatisfying(WorkDomainException.class, e -> {
            assertThat(e.getCode()).isEqualTo("INVALID_REQUEST");
            assertThat(e.getField()).isEqualTo(field);
        });
    }
}
