package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.exception.WorkDomainException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.dao.*;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;

@RestControllerAdvice(assignableTypes = {ProjectController.class, TaskController.class, TaskLabelController.class, StatisticsController.class, HabitController.class, FinancialEntryController.class, TagController.class, NotificationController.class, SupportController.class})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class WorkExceptionHandler {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(WorkExceptionHandler.class);
    public record FieldError(String field, String message) {}
    public record Error(String code, String message, List<FieldError> fieldErrors, String requestId) {}
    @ExceptionHandler(WorkDomainException.class)
    public ResponseEntity<Error> domain(WorkDomainException e, HttpServletRequest request) {
        int status = switch(e.getCode()) {
            case "NOT_FOUND" -> 404;
            case "UNAUTHENTICATED" -> 401;
            case "PRECONDITION_REQUIRED" -> 428;
            case "VERSION_CONFLICT", "IDEMPOTENCY_CONFLICT" -> 409;
            case "CLIENT_UPGRADE_REQUIRED", "RESOURCE_GONE" -> 410;
            case "INVALID_REQUEST" -> 400;
            default -> 422;
        };
        return response(status, e.getCode(), e.getMessage(), e.getField(), request);
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
        org.springframework.web.bind.MissingServletRequestParameterException.class,
        org.springframework.web.multipart.support.MissingServletRequestPartException.class,
        org.springframework.web.bind.ServletRequestBindingException.class})
    public ResponseEntity<Error> malformed(Exception e, HttpServletRequest request) {
        return response(400, "INVALID_REQUEST", "Verifique o JSON, os tipos e as datas informados.", null, request);
    }
    @ExceptionHandler({OptimisticLockingFailureException.class, PessimisticLockingFailureException.class,
        jakarta.persistence.OptimisticLockException.class, jakarta.persistence.PessimisticLockException.class,
        DataIntegrityViolationException.class})
    public ResponseEntity<Error> conflict(Exception e, HttpServletRequest request) {
        return response(409, "VERSION_CONFLICT", "Os dados mudaram. Recarregue antes de salvar.", null, request);
    }
    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<Error> validation(org.springframework.web.bind.MethodArgumentNotValidException e, HttpServletRequest request) {
        var field=e.getBindingResult().getFieldErrors().stream().findFirst();
        return response(400,"INVALID_REQUEST",field.map(org.springframework.validation.FieldError::getDefaultMessage).orElse("Verifique os campos."),field.map(org.springframework.validation.FieldError::getField).orElse(null),request);
    }
    @ExceptionHandler({com.oriens.oriens_api.exception.BusinessException.class})
    public ResponseEntity<Error> business(RuntimeException e,HttpServletRequest request) {
        return response(422,"DOMAIN_VIOLATION",e.getMessage(),null,request);
    }
    @ExceptionHandler({com.oriens.oriens_api.exception.EntryNotFoundException.class,com.oriens.oriens_api.exception.TagNotFoundException.class})
    public ResponseEntity<Error> missing(RuntimeException e,HttpServletRequest request) {return response(404,"NOT_FOUND","Recurso não encontrado.",null,request);}
    /** Role checks (@PreAuthorize) must stay 403; without this the catch-all below turns them into 500. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Error> forbidden(AccessDeniedException e, HttpServletRequest request) {
        return response(403, "FORBIDDEN", "Você não tem permissão para esta ação.", null, request);
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Error> internal(Exception e, HttpServletRequest request) {
        return response(500, "INTERNAL_ERROR", "Não foi possível concluir a operação.", null, request);
    }
    private ResponseEntity<Error> response(int status, String code, String message, String field, HttpServletRequest request) {
        Object current = request.getAttribute("work.requestId");
        String id = current == null ? UUID.randomUUID().toString() : current.toString();
        if (status >= 500) log.error("Work request failed requestId={} code={}", id, code);
        return ResponseEntity.status(status).header("X-Request-Id", id).body(new Error(code, message,
            field == null ? List.of() : List.of(new FieldError(field, message)), id));
    }
}
