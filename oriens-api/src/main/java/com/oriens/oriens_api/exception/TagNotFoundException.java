package com.oriens.oriens_api.exception;

public class TagNotFoundException extends RuntimeException {
    public TagNotFoundException (Long id) {
        super("The id " + id + " was not found in ours records");
    }
}
