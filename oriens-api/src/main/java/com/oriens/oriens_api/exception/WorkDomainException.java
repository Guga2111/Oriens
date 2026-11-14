package com.oriens.oriens_api.exception;

import lombok.Getter;

/** Transport-independent failure; P2 maps code/field to the frozen HTTP error envelope. */
@Getter
public class WorkDomainException extends RuntimeException {
    private final String code;
    private final String field;
    public WorkDomainException(String code, String field, String message) {
        super(message); this.code = code; this.field = field;
    }
}
