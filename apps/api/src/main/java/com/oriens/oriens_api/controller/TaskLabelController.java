package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.TaskLabel;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.LabelInput;
import com.oriens.oriens_api.entity.dto.work.WorkResponses.LabelView;
import com.oriens.oriens_api.repository.TaskLabelRepository;
import com.oriens.oriens_api.security.WorkOwner;
import com.oriens.oriens_api.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequiredArgsConstructor @RequestMapping("/task-labels")
public class TaskLabelController {
    private final TaskLabelService labels;
    private final TaskLabelRepository repository;
    private final WorkCreationService creation;
    private final WorkOwner owner;

    @GetMapping("/user/{userId}")
    public List<LabelView> list(Authentication auth, @PathVariable Long userId) {
        return labels.list(owner.matching(auth, userId));
    }
    @PostMapping("/user/{userId}")
    public ResponseEntity<Object> create(Authentication auth, @PathVariable Long userId,
            @RequestHeader(value="Idempotency-Key", required=false) String key, @RequestBody LabelInput input) {
        Long user = owner.matching(auth, userId);
        return WorkHttp.created(creation.create(user, "task-label:create", key, input, () -> {
            TaskLabel label = labels.create(user, input);
            return new WorkCreationService.Created(TaskLabelService.view(label), label.getVersion(), label.getId());
        }, id -> repository.findByIdAndUserId(id, user).isPresent()));
    }
    @PutMapping("/{id}")
    public ResponseEntity<LabelView> update(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody LabelInput input) {
        LabelView result = labels.update(owner.id(auth), id, WorkHttp.version(match), input);
        return WorkHttp.ok(result, result.version());
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match) {
        labels.delete(owner.id(auth), id, WorkHttp.version(match));
        return ResponseEntity.noContent().build();
    }
}
