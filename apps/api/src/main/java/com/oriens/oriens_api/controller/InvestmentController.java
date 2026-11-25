package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.dto.financial.InvestmentViews.*;
import com.oriens.oriens_api.security.WorkOwner;
import com.oriens.oriens_api.service.InvestmentService;
import com.oriens.oriens_api.service.WorkCreationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

/** Manual portfolio. Writes take Idempotency-Key; updates and deletes also take If-Match. */
@RestController @RequiredArgsConstructor @RequestMapping("/financial/user/{userId}/investments")
public class InvestmentController {
    private final InvestmentService investments;
    private final WorkOwner owner;

    @GetMapping public Page<Investment> list(Authentication auth, @PathVariable Long userId,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="50") int size) {
        return investments.page(owner.matching(auth, userId), pageable(page, size));
    }
    @GetMapping("/summary") public Summary summary(Authentication auth, @PathVariable Long userId) {
        return investments.summary(owner.matching(auth, userId));
    }
    @GetMapping("/movements") public Page<Movement> movements(Authentication auth, @PathVariable Long userId,
            @RequestParam(required=false) Long investmentId, @RequestParam(required=false) MovementType type,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="50") int size) {
        return investments.movements(owner.matching(auth, userId), investmentId, type, startDate, endDate, pageable(page, size));
    }
    @GetMapping("/{id}") public ResponseEntity<Investment> get(Authentication auth, @PathVariable Long userId, @PathVariable Long id) {
        Investment view = investments.get(owner.matching(auth, userId), id);
        return WorkHttp.ok(view, view.version());
    }
    @PostMapping public ResponseEntity<Object> create(Authentication auth, @PathVariable Long userId,
            @RequestHeader(value="Idempotency-Key", required=false) String key, @Valid @RequestBody Create input) {
        return created(investments.create(owner.matching(auth, userId), key, input));
    }
    @PatchMapping("/{id}") public ResponseEntity<Object> patch(Authentication auth, @PathVariable Long userId, @PathVariable Long id,
            @RequestHeader(value="Idempotency-Key", required=false) String key, @RequestHeader(value="If-Match", required=false) String match,
            @Valid @RequestBody Patch input) {
        return ok(investments.patch(owner.matching(auth, userId), key, id, WorkHttp.version(match), input));
    }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(Authentication auth, @PathVariable Long userId, @PathVariable Long id,
            @RequestHeader(value="Idempotency-Key", required=false) String key, @RequestHeader(value="If-Match", required=false) String match) {
        investments.delete(owner.matching(auth, userId), key, id, WorkHttp.version(match));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/valuations") public Page<Valuation> valuations(Authentication auth, @PathVariable Long userId, @PathVariable Long id,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="50") int size) {
        return investments.valuations(owner.matching(auth, userId), id, pageable(page, size));
    }
    @PostMapping("/{id}/valuations") public ResponseEntity<Object> addValuation(Authentication auth, @PathVariable Long userId, @PathVariable Long id,
            @RequestHeader(value="Idempotency-Key", required=false) String key, @Valid @RequestBody ValuationInput input) {
        return created(investments.addValuation(owner.matching(auth, userId), key, id, input));
    }
    @PutMapping("/{id}/valuations/{valuationId}") public ResponseEntity<Object> replaceValuation(Authentication auth, @PathVariable Long userId,
            @PathVariable Long id, @PathVariable Long valuationId, @RequestHeader(value="Idempotency-Key", required=false) String key,
            @RequestHeader(value="If-Match", required=false) String match, @Valid @RequestBody ValuationInput input) {
        return ok(investments.replaceValuation(owner.matching(auth, userId), key, id, valuationId, WorkHttp.version(match), input));
    }
    @DeleteMapping("/{id}/valuations/{valuationId}") public ResponseEntity<Void> deleteValuation(Authentication auth, @PathVariable Long userId,
            @PathVariable Long id, @PathVariable Long valuationId, @RequestHeader(value="Idempotency-Key", required=false) String key,
            @RequestHeader(value="If-Match", required=false) String match) {
        investments.deleteValuation(owner.matching(auth, userId), key, id, valuationId, WorkHttp.version(match));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/movements") public ResponseEntity<Object> addMovement(Authentication auth, @PathVariable Long userId, @PathVariable Long id,
            @RequestHeader(value="Idempotency-Key", required=false) String key, @Valid @RequestBody MovementInput input) {
        return created(investments.addMovement(owner.matching(auth, userId), key, id, input));
    }
    @PutMapping("/{id}/movements/{movementId}") public ResponseEntity<Object> replaceMovement(Authentication auth, @PathVariable Long userId,
            @PathVariable Long id, @PathVariable Long movementId, @RequestHeader(value="Idempotency-Key", required=false) String key,
            @RequestHeader(value="If-Match", required=false) String match, @Valid @RequestBody MovementInput input) {
        return ok(investments.replaceMovement(owner.matching(auth, userId), key, id, movementId, WorkHttp.version(match), input));
    }
    @DeleteMapping("/{id}/movements/{movementId}") public ResponseEntity<Void> deleteMovement(Authentication auth, @PathVariable Long userId,
            @PathVariable Long id, @PathVariable Long movementId, @RequestHeader(value="Idempotency-Key", required=false) String key,
            @RequestHeader(value="If-Match", required=false) String match) {
        investments.deleteMovement(owner.matching(auth, userId), key, id, movementId, WorkHttp.version(match));
        return ResponseEntity.noContent().build();
    }

    // Ordering is fixed per listing; "id" only satisfies the shared validator.
    private static Pageable pageable(int page, int size) { return WorkPagination.of(page, size, "id", Sort.Direction.DESC, "id"); }
    private static ResponseEntity<Object> created(WorkCreationService.Completed result) { return WorkHttp.created(result.result()); }
    private static ResponseEntity<Object> ok(WorkCreationService.Completed result) { return WorkHttp.ok(result.result().body(), result.result().version()); }
}
