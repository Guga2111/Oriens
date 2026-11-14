package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.exception.WorkDomainException;
import org.springframework.http.ResponseEntity;

final class WorkHttp {
    private WorkHttp() {}
    static Long version(String value) {
        if (value == null) throw new WorkDomainException("PRECONDITION_REQUIRED", "If-Match", "Informe a versão lida em If-Match.");
        if (!value.matches("\"[0-9]+\"")) throw new WorkDomainException("INVALID_REQUEST", "If-Match", "Use ETag forte com uma versão inteira.");
        try { return Long.parseLong(value.substring(1, value.length()-1)); }
        catch (NumberFormatException e) { throw new WorkDomainException("INVALID_REQUEST", "If-Match", "Versão inválida."); }
    }
    static void agree(String header, Long body) {
        if (header != null && !version(header).equals(body)) throw new WorkDomainException("INVALID_REQUEST", "version", "Versões de header e corpo divergem.");
    }
    static <T> ResponseEntity<T> ok(T body, long version) { return ResponseEntity.ok().eTag(Long.toString(version)).body(body); }
    static ResponseEntity<Object> created(com.oriens.oriens_api.service.WorkCreationService.Created result) {
        return ResponseEntity.status(201).eTag(Long.toString(result.version())).body(result.body());
    }
    static WorkDomainException retired() { return new WorkDomainException("CLIENT_UPGRADE_REQUIRED", null, "Atualize o aplicativo para usar operações por ID e versão."); }
}
