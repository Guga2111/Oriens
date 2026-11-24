package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.dto.work.WorkHome.*;
import com.oriens.oriens_api.security.WorkOwner;
import com.oriens.oriens_api.service.WorkHomeService;
import com.oriens.oriens_api.service.WorkCreationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/work/home")
@RequiredArgsConstructor
public class WorkHomeController {
    private final WorkHomeService home;
    private final WorkCreationService creation;
    private final WorkOwner owner;

    @GetMapping("/quick-links")
    public List<LinkView> links(Authentication auth) { return home.links(owner.id(auth)); }
    @PostMapping("/quick-links")
    public ResponseEntity<Object> create(Authentication auth, @RequestHeader(value = "Idempotency-Key", required = false) String key,
            @RequestBody LinkInput input) {
        Long user = owner.id(auth);
        return WorkHttp.created(creation.create(user, "home:link:create", key, input, () -> {
            LinkView result = home.createLink(user, input);
            return new WorkCreationService.Created(result, result.version(), result.id());
        }, id -> home.linkExists(user, id)));
    }
    @PatchMapping("/quick-links/{id}")
    public ResponseEntity<LinkView> update(Authentication auth, @PathVariable Long id,
            @RequestHeader(value = "If-Match", required = false) String match, @RequestBody LinkInput input) {
        LinkView result = home.updateLink(owner.id(auth), id, WorkHttp.version(match), input);
        return WorkHttp.ok(result, result.version());
    }
    @DeleteMapping("/quick-links/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable Long id,
            @RequestHeader(value = "If-Match", required = false) String match) {
        home.deleteLink(owner.id(auth), id, WorkHttp.version(match));
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/recents")
    public List<RecentView> recents(Authentication auth) { return home.recents(owner.id(auth)); }
    @PostMapping("/recents")
    public ResponseEntity<Void> visit(Authentication auth, @RequestBody VisitInput input) {
        home.visit(owner.id(auth), input);
        return ResponseEntity.noContent().build();
    }
}
