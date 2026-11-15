package com.oriens.oriens_api.controller;
import com.oriens.oriens_api.exception.WorkDomainException;
import org.springframework.data.domain.*;
import java.util.*;
final class WorkPagination {
    private WorkPagination() {}
    static Pageable of(int page, int size, String sort, Sort.Direction direction, String... allowed) {
        return of(page,size,sort,direction,100,allowed);
    }
    static Pageable of(int page, int size, String sort, Sort.Direction direction, int maxSize, String... allowed) {
        if (page < 0 || size < 1 || size > maxSize || !Arrays.asList(allowed).contains(sort))
            throw new WorkDomainException("INVALID_REQUEST", "page", "Paginação ou ordenação inválida (size: 1–"+maxSize+").");
        return PageRequest.of(page, size, Sort.by(direction, sort).and(Sort.by("id")));
    }
}
