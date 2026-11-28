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
        if (!Arrays.asList(allowed).contains(sort)) throw invalid(maxSize);
        return fixed(page, size, maxSize, Sort.by(direction, sort).and(Sort.by("id")));
    }
    static Pageable fixed(int page, int size, int maxSize, Sort sort) {
        if (page < 0 || size < 1 || size > maxSize || (long) page * size > Integer.MAX_VALUE) throw invalid(maxSize);
        return PageRequest.of(page, size, sort);
    }
    private static WorkDomainException invalid(int maxSize) {
        return new WorkDomainException("INVALID_REQUEST", "page", "Paginação ou ordenação inválida (size: 1–"+maxSize+").");
    }
}
