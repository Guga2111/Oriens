package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.dto.WeeklySummaryDTO;
import com.oriens.oriens_api.entity.dto.work.*;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.*;
import com.oriens.oriens_api.entity.dto.work.WorkResponses.*;
import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.repository.*;
import com.oriens.oriens_api.security.WorkOwner;
import com.oriens.oriens_api.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/task")
@Transactional
public class TaskController {
    private final ProjectWorkService work;
    private final WorkReadService read;
    private final WorkCreationService creation;
    private final WorkOwner owner;
    private final TaskRepository tasks;
    private final UserRepository users;
    private final TaskServiceImpl legacyReads;

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<TaskView> get(Authentication auth, @PathVariable Long id) {
        TaskView result = read.taskView(owner.id(auth), id); return WorkHttp.ok(result, result.version());
    }
    @PostMapping("/user/{userId}")
    public ResponseEntity<Object> create(Authentication auth, @PathVariable Long userId,
            @RequestHeader(value="Idempotency-Key", required=false) String key, @RequestBody CreateTask command) {
        Long user = owner.matching(auth, userId);
        return WorkHttp.created(creation.create(user, "task:create", key, command, () -> {
            Task t = work.createTask(user, command);
            TaskView result = read.view(user, t);
            TaskMutation response = new TaskMutation(result, ids(null, t.getProjectId()), null, t.getPlannedDate());
            return new WorkCreationService.Created(response, t.getVersion(), t.getId());
        }, id -> tasks.findByIdAndUserId(id, user).isPresent()));
    }
    @PatchMapping("/{id}")
    public ResponseEntity<TaskMutation> patch(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody PatchTask command) {
        Long user = owner.id(auth); WorkHttp.agree(match, command.getVersion());
        Task before = read.task(user, id); Long project = before.getProjectId(); LocalDate planned = before.getPlannedDate();
        Task after = work.patchTask(user, id, command);
        TaskMutation result = new TaskMutation(read.view(user, after), ids(project, after.getProjectId()), planned, after.getPlannedDate());
        return WorkHttp.ok(result, after.getVersion());
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<TaskDeletion> delete(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match, @RequestHeader(value="X-Project-Version", required=false) Long projectVersion) {
        Long user = owner.id(auth); TaskView before = read.taskView(user, id);
        work.deleteTask(user, id, WorkHttp.version(match), projectVersion);
        return ResponseEntity.ok(new TaskDeletion(id, ids(null, before.projectId()), before.plannedDate()));
    }
    @PutMapping("/{id}") public void retiredPut() { throw WorkHttp.retired(); }

    // P2 secures existing collection reads and their projections. Agenda semantics move in P3.
    @GetMapping("/user/{userId}")
    @Transactional(readOnly = true)
    public List<TaskView> day(Authentication auth, @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date) {
        Long user = owner.matching(auth, userId);
        return tasks.findByUserAndDueDate(users.findById(user).orElseThrow(), date).stream().map(t -> read.view(user, t)).toList();
    }
    @GetMapping("/user/{userId}/range")
    @Transactional(readOnly = true)
    public List<TaskView> range(Authentication auth, @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Long user = owner.matching(auth, userId);
        return tasks.findByUserAndDueDateBetweenOrderByDueDateAscStartTimeAsc(users.findById(user).orElseThrow(), startDate, endDate)
            .stream().map(t -> read.view(user, t)).toList();
    }
    @GetMapping("/user/{userId}/all")
    @Transactional(readOnly = true)
    public Page<TaskView> all(Authentication auth, @PathVariable Long userId,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size,
            @RequestParam(defaultValue="dueDate") String sortBy, @RequestParam(defaultValue="DESC") Sort.Direction direction,
            @RequestParam(required=false) Status status, @RequestParam(required=false) Priority priority,
            @RequestParam(required=false) String search,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Long user = owner.matching(auth, userId);
        return tasks.findAllFiltered(user, status, priority, search, startDate, endDate,
            WorkPagination.of(page,size,sortBy,direction,"id","title","dueDate","plannedDate","startTime","priority","status","createdAt"))
            .map(t -> read.view(user, t));
    }
    @GetMapping("/user/{userId}/summary/weekly-counts")
    @Transactional(readOnly = true)
    public WeeklySummaryDTO weekly(Authentication auth, @PathVariable Long userId) {
        return legacyReads.retrieveDoneTasksAndTasksNumbersByDateRange(owner.matching(auth, userId));
    }
    private static List<Long> ids(Long first, Long second) {
        return java.util.stream.Stream.of(first, second).filter(Objects::nonNull).distinct().sorted().toList();
    }
}
