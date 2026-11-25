package com.oriens.oriens_api.exception;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException (Long id) {
        super("The user with id: " + id + " was not found in our records.");
    }

    public UserNotFoundException (String email) {
        super("The user with email: " + email + " was not found in our records.");
    }
}
