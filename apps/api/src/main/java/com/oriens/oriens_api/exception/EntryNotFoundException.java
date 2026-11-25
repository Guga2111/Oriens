package com.oriens.oriens_api.exception;

public class EntryNotFoundException extends RuntimeException {
    public EntryNotFoundException (Long id) {
        super ("The id " + id + " was not found in ours records");
    }
}
