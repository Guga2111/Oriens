package com.oriens.oriens_api.exception;

public class NotificationNotFoundException extends RuntimeException {
    public NotificationNotFoundException (Long id) {
        super ("The notification with id: " + id + "does not belong to ours records!");
    }
}
