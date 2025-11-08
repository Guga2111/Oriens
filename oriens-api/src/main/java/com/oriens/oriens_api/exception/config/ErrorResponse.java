package com.oriens.oriens_api.exception.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Getter
@Setter

public class ErrorResponse {
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy hh:mm:ss")
    private Instant timestamp;
    private List<String> message;

    public ErrorResponse(List<String> message) {
        this.timestamp = Instant.now();
        this.message = message;
    }
}
