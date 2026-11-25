package com.oriens.oriens_api.entity.enums;

public enum Status {
    /** Captured but not committed to; distinct from PENDING (to do). */
    BACKLOG,
    PENDING,
    ON_DOING,
    CANCELLED,
    CONCLUDED;

    /** Work still to be done: it plans, reminds and becomes overdue. */
    public boolean open() {
        return this == BACKLOG || this == PENDING || this == ON_DOING;
    }
}
