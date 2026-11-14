package com.oriens.oriens_api.controller;
import com.oriens.oriens_api.exception.WorkDomainException;
import org.springframework.data.domain.*;
import java.util.*;
final class WorkPagination {
    private WorkPagination() {}
    static Pageable of(int page, int size, String sort, Sort.Direction direction, String... allowed) {
        if (page < 0 || size < 1 || size > 100 || !Arrays.asList(allowed).contains(sort))
            throw new WorkDomainException("INVALID_REQUEST", "page", "Paginação ou ordenação inválida (size: 1–100).");
        return PageRequest.of(page, size, Sort.by(direction, sort).and(Sort.by("id")));
    }
}
