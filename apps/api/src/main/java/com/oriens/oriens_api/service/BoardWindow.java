package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.exception.WorkDomainException;
import org.springframework.data.jpa.domain.Specification;
import java.time.LocalDate;

/**
 * Period shown by the project timeline. The bounds limit the board query; they are not task fields.
 * A task spans min(plannedDate, dueDate)..max(plannedDate, dueDate) and is included when that span
 * overlaps the window. A task with neither date has no position in time, so the window never excludes it.
 */
public record BoardWindow(LocalDate startDate, LocalDate endDate) {
    public static final int MAX_DAYS = 366;

    /** Returns null when neither bound is given, so callers keep the unwindowed board. */
    public static BoardWindow of(LocalDate startDate, LocalDate endDate) {
        if (startDate == null && endDate == null) return null;
        if (startDate == null) throw invalid("startDate", "Informe startDate e endDate juntos.");
        if (endDate == null) throw invalid("endDate", "Informe startDate e endDate juntos.");
        if (startDate.isAfter(endDate)) throw invalid("startDate", "startDate deve ser anterior ou igual a endDate.");
        if (endDate.isAfter(startDate.plusDays(MAX_DAYS - 1)))
            throw invalid("endDate", "A janela pode ter no máximo " + MAX_DAYS + " dias.");
        return new BoardWindow(startDate, endDate);
    }

    public boolean includes(LocalDate plannedDate, LocalDate dueDate) {
        if (plannedDate == null && dueDate == null) return true;
        LocalDate low = plannedDate == null ? dueDate : dueDate == null || plannedDate.isBefore(dueDate) ? plannedDate : dueDate;
        LocalDate high = plannedDate == null ? dueDate : dueDate == null || plannedDate.isAfter(dueDate) ? plannedDate : dueDate;
        return !low.isAfter(endDate) && !high.isBefore(startDate);
    }

    /**
     * Same rule as {@link #includes} in SQL. min(a,b) <= end is "a <= end or b <= end" and max(a,b) >= start is
     * "a >= start or b >= start"; a null date makes its comparison unknown, which leaves the other date to decide.
     */
    public Specification<Task> specification() {
        return (root, query, builder) -> {
            var planned = root.<LocalDate>get("plannedDate");
            var due = root.<LocalDate>get("dueDate");
            return builder.or(
                builder.and(builder.isNull(planned), builder.isNull(due)),
                builder.and(
                    builder.or(builder.lessThanOrEqualTo(planned, endDate), builder.lessThanOrEqualTo(due, endDate)),
                    builder.or(builder.greaterThanOrEqualTo(planned, startDate), builder.greaterThanOrEqualTo(due, startDate))));
        };
    }

    private static WorkDomainException invalid(String field, String message) {
        return new WorkDomainException("INVALID_REQUEST", field, message);
    }
}
