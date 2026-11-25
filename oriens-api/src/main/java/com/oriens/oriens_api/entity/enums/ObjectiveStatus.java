package com.oriens.oriens_api.entity.enums;

public enum ObjectiveStatus {
    BACKLOG, PENDING, ON_DOING, PAUSED, CONCLUDED, CANCELLED;

    public boolean isActive() {
        return this != CONCLUDED && this != CANCELLED;
    }
}
