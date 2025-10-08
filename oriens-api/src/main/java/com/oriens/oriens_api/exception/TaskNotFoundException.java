package com.oriens.oriens_api.exception;

public class TaskNotFoundException extends RuntimeException {
    public TaskNotFoundException (Long id) {
        super("The task with id: " + id + " was not found in our records.");
    }
}
