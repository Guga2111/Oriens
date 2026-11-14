package com.oriens.oriens_api.security;

import com.oriens.oriens_api.repository.UserRepository;
import com.oriens.oriens_api.exception.WorkDomainException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkOwner {
    private final UserRepository users;
    public Long id(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal()))
            throw new WorkDomainException("UNAUTHENTICATED", null, "Entre novamente para continuar.");
        return users.findByEmail(authentication.getName()).orElseThrow(() ->
                new WorkDomainException("UNAUTHENTICATED", null, "Entre novamente para continuar.")).getId();
    }
    public Long matching(Authentication authentication, Long pathId) {
        Long id = id(authentication);
        if (!id.equals(pathId)) throw new WorkDomainException("NOT_FOUND", null, "Recurso não encontrado.");
        return id;
    }
}
