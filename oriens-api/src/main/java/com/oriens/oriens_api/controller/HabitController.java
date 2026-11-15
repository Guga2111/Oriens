package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.dto.statistics.HabitViews.*;
import com.oriens.oriens_api.security.WorkOwner;
import com.oriens.oriens_api.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController @RequiredArgsConstructor @RequestMapping("/habits/user/{userId}")
public class HabitController {
    private final HabitService habits;
    private final WorkOwner owner;
    private final WorkCreationService creation;
    @GetMapping public Summary summary(Authentication auth,@PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return habits.summary(owner.matching(auth,userId),startDate,endDate);
    }
    @PostMapping public org.springframework.http.ResponseEntity<Object> create(Authentication auth,@PathVariable Long userId,
            @RequestHeader(value="Idempotency-Key",required=false) String key,@Valid @RequestBody Input input) {
        Long user=owner.matching(auth,userId);
        return WorkHttp.created(creation.create(user,"habit:create",key,input,()->{
            Habit h=habits.create(user,input);return new WorkCreationService.Created(h,h.version(),h.id());
        },id->habits.exists(user,id)));
    }
    @PutMapping("/{id}") public Habit update(Authentication auth,@PathVariable Long userId,@PathVariable Long id,@Valid @RequestBody Update input) {
        return habits.update(owner.matching(auth,userId),id,input);
    }
    @PutMapping("/{id}/executions/{date}") public Habit execution(Authentication auth,@PathVariable Long userId,@PathVariable Long id,
            @PathVariable @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date,@Valid @RequestBody Execution input) {
        return habits.execute(owner.matching(auth,userId),id,date,input);
    }
    @PostMapping("/{id}/pauses") public Habit pause(Authentication auth,@PathVariable Long userId,@PathVariable Long id,@Valid @RequestBody PauseInput input) {
        return habits.pause(owner.matching(auth,userId),id,input);
    }
    @PostMapping("/{id}/archive") public Habit archive(Authentication auth,@PathVariable Long userId,@PathVariable Long id,@Valid @RequestBody Version input) {
        return habits.archive(owner.matching(auth,userId),id,input.version());
    }
}
