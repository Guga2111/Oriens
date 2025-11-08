package com.oriens.oriens_api.exception;

public class AccessUnauthorizedException extends RuntimeException {
    public AccessUnauthorizedException () {
        super("You don't have permission!");
    }
}
