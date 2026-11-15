package com.oriens.oriens_api.security;

public class SecurityConstants {
    public static final int TOKEN_EXPIRATION = 57600000; // 57600000 milliseconds = 576000 seconds = 16 hours.
    public static final String BEARER = "Bearer ";
    public static final String AUTHORIZATION = "Authorization";
    public static final String REGISTER_PATH = "/user/register";
}
