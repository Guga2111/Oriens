package com.oriens.oriens_api.exception;

public class ProjectNotFoundException extends RuntimeException {
    public ProjectNotFoundException (Long id) {
        super("The project with id: '" + id + "'does not belong to ours records!");
    }
}
