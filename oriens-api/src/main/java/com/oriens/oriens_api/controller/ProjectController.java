package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.dto.work.*;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.*;
import com.oriens.oriens_api.entity.dto.work.WorkResponses.*;
import com.oriens.oriens_api.entity.enums.ProjectMode;
import com.oriens.oriens_api.repository.*;
import com.oriens.oriens_api.security.WorkOwner;
import com.oriens.oriens_api.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
@RequestMapping("/project")
@Transactional
public class ProjectController {
    private final ProjectWorkService work;
    private final WorkReadService read;
    private final WorkCreationService creation;
    private final WorkOwner owner;
    private final ProjectRepository projects;
    private final ObjectiveRepository objectives;
    private final ProjectColumnRepository columns;
    private final TaskRepository tasks;
    private final FileStorageProjectService files;

    public record ModeChange(Long version, ProjectMode mode) {}
    public record FavoriteChange(Long version, Boolean favorite) {}
    public record ArchiveChange(Long version, Boolean archived) {}

    @GetMapping({"/user/{userId}", "/user/{userId}/all"})
    @Transactional(readOnly = true)
    public Page<ProjectView> list(Authentication auth, @PathVariable Long userId,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size,
            @RequestParam(defaultValue="id") String sortBy, @RequestParam(defaultValue="DESC") Sort.Direction direction,
            @RequestParam(defaultValue="false") boolean includeArchived, @RequestParam(required=false) String search) {
        Long user = owner.matching(auth, userId);
        return projects.findAllFiltered(user, includeArchived, search, WorkPagination.of(page, size, sortBy, direction,
            "id", "title", "lastAccessed", "favorite", "archived")).map(p -> ProjectView.of(p, false));
    }
    @GetMapping("/user/{userId}/sidebar")
    @Transactional(readOnly = true)
    public java.util.List<SidebarProject> sidebar(Authentication auth, @PathVariable Long userId) {
        Long user = owner.matching(auth, userId);
        return projects.findSidebarByOwner(user).stream().map(SidebarProject::of).toList();
    }
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<ProjectView> get(Authentication auth, @PathVariable Long id) {
        ProjectView p = read.projectView(owner.id(auth), id); return WorkHttp.ok(p, p.version());
    }
    @PostMapping("/user/{userId}")
    public ResponseEntity<Object> create(Authentication auth, @PathVariable Long userId,
            @RequestHeader(value="Idempotency-Key", required=false) String key, @RequestBody CreateProject command) {
        Long user = owner.matching(auth, userId);
        return WorkHttp.created(creation.create(user, "project:create", key, command, () -> {
            Project p = work.createProject(user, command);
            ProjectView result = ProjectView.of(p, true); return new WorkCreationService.Created(result, result.version(), p.getId());
        }, id -> projects.findByIdAndUserId(id, user).isPresent()));
    }
    @PatchMapping("/{id}")
    public ResponseEntity<ProjectView> patch(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody PatchProject command) {
        WorkHttp.agree(match, command.getVersion());
        Project p = work.patchProject(owner.id(auth), id, command); return project(p);
    }
    @PatchMapping("/{id}/mode")
    public ResponseEntity<ProjectView> mode(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody ModeChange command) {
        WorkHttp.agree(match, command.version()); return project(work.convertProject(owner.id(auth), id, command.version(), command.mode()));
    }
    @PatchMapping("/{id}/favorite")
    public ResponseEntity<ProjectView> favorite(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody(required=false) FavoriteChange command) {
        if (command == null) throw WorkHttp.retired();
        WorkHttp.agree(match, command.version()); return project(work.setFavorite(owner.id(auth), id, command.version(), command.favorite()));
    }
    @PatchMapping("/{id}/archive")
    public ResponseEntity<ProjectView> archive(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody(required=false) ArchiveChange command) {
        if (command == null) throw WorkHttp.retired();
        WorkHttp.agree(match, command.version()); return project(work.setArchived(owner.id(auth), id, command.version(), command.archived()));
    }
    @PostMapping("/{id}/objectives")
    public ResponseEntity<Object> objective(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="Idempotency-Key", required=false) String key, @RequestBody CreateObjective command) {
        Long user = owner.id(auth);
        return WorkHttp.created(creation.create(user, "project:"+id+":objective:create", key, command, () -> {
            ObjectiveView result = ObjectiveView.of(work.createObjective(user, id, command));
            return new WorkCreationService.Created(new ObjectiveMutation(result, read.project(user, id).getVersion()), result.version(), result.id());
        }, resource -> objectives.findById(resource).filter(o -> o.getProject().getId().equals(id)).isPresent()));
    }
    @PatchMapping("/{id}/objectives/{objectiveId}")
    public ResponseEntity<ObjectiveMutation> patchObjective(Authentication auth, @PathVariable Long id, @PathVariable Long objectiveId,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody PatchObjective command) {
        WorkHttp.agree(match, command.getVersion());
        ObjectiveView result = ObjectiveView.of(work.patchObjective(owner.id(auth), id, objectiveId, command));
        return WorkHttp.ok(new ObjectiveMutation(result, read.project(owner.id(auth), id).getVersion()), result.version());
    }
    @DeleteMapping("/{id}/objectives/{objectiveId}")
    public ResponseEntity<ObjectiveDeletion> deleteObjective(Authentication auth, @PathVariable Long id, @PathVariable Long objectiveId,
            @RequestHeader(value="If-Match", required=false) String match, @RequestHeader(value="X-Project-Version", required=false) Long projectVersion) {
        Long user = owner.id(auth); read.project(user, id);
        long detached = tasks.countByObjectiveId(objectiveId);
        work.deleteObjective(user, id, objectiveId, WorkHttp.version(match), projectVersion);
        Project p = read.project(user, id);
        return WorkHttp.ok(new ObjectiveDeletion(id, p.getVersion(), detached), p.getVersion());
    }
    @PostMapping("/{id}/columns")
    public ResponseEntity<Object> column(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="Idempotency-Key", required=false) String key, @RequestBody CreateColumn command) {
        Long user = owner.id(auth);
        return WorkHttp.created(creation.create(user, "project:"+id+":column:create", key, command, () -> {
            ProjectColumn created = work.createColumn(user, id, command);
            BoardConfigMutation result = read.config(user, id);
            return new WorkCreationService.Created(result, result.projectVersion(), created.getId());
        }, resource -> columns.findById(resource).filter(c -> c.getProject().getId().equals(id)).isPresent()));
    }
    @PatchMapping("/{id}/columns/{columnId}")
    public ResponseEntity<BoardConfigMutation> patchColumn(Authentication auth, @PathVariable Long id, @PathVariable Long columnId,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody PatchColumn command) {
        WorkHttp.agree(match, command.getVersion());
        Long user = owner.id(auth); work.patchColumn(user, id, columnId, command);
        return config(user, id);
    }
    @PutMapping("/{id}/columns/order")
    public ResponseEntity<BoardConfigMutation> order(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody OrderColumns command) {
        WorkHttp.agree(match, command.projectVersion()); Long user = owner.id(auth); work.orderColumns(user, id, command); return config(user, id);
    }
    @PatchMapping("/{id}/board-defaults")
    public ResponseEntity<BoardConfigMutation> defaults(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody BoardDefaults command) {
        WorkHttp.agree(match, command.projectVersion()); Long user = owner.id(auth); work.setDefaults(user, id, command); return config(user, id);
    }
    @PostMapping("/{id}/columns/{columnId}/remove")
    public ResponseEntity<ColumnRemoval> removeColumn(Authentication auth, @PathVariable Long id, @PathVariable Long columnId,
            @RequestHeader(value="If-Match", required=false) String match, @RequestBody RemoveColumn command) {
        Long user = owner.id(auth); read.project(user, id);
        long moved = tasks.countByProjectIdAndColumnId(id, columnId);
        WorkHttp.agree(match, command.projectVersion());
        Project p = work.removeColumn(user, id, columnId, command);
        return WorkHttp.ok(new ColumnRemoval(id, p.getVersion(), moved, true), p.getVersion());
    }
    @GetMapping("/{id}/deletion-preview")
    @Transactional(readOnly = true)
    public ResponseEntity<DeletionPreview> preview(Authentication auth, @PathVariable Long id) {
        DeletionPreview preview = read.preview(owner.id(auth), id); return WorkHttp.ok(preview, preview.projectVersion());
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match) {
        work.deleteProject(owner.id(auth), id, WorkHttp.version(match)); return ResponseEntity.noContent().build();
    }
    @PutMapping("/{id}/picture")
    public ResponseEntity<ProjectView> picture(Authentication auth, @PathVariable Long id,
            @RequestHeader(value="If-Match", required=false) String match, @RequestParam("projectImage") MultipartFile file) throws java.io.IOException {
        Long user = owner.id(auth); read.project(user, id); Long version = WorkHttp.version(match);
        String filename = files.storeFile(file, id);
        try {
            String url = ServletUriComponentsBuilder.fromCurrentContextPath().path("/projects-pictures/").path(filename).toUriString();
            return project(work.setImage(user, id, version, url));
        } catch (RuntimeException e) { files.discard(filename); throw e; }
    }
    @RequestMapping(value={"/{id}/objective", "/{id}/objective/{index}", "/{id}/unarchive"}, method={RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE})
    public void retired() { throw WorkHttp.retired(); }
    @PutMapping("/{id}") public void retiredPut() { throw WorkHttp.retired(); }
    private ResponseEntity<BoardConfigMutation> config(Long user, Long id) {
        BoardConfigMutation result = read.config(user, id); return WorkHttp.ok(result, result.projectVersion());
    }
    private ResponseEntity<ProjectView> project(Project p) { return WorkHttp.ok(ProjectView.of(p, true), p.getVersion()); }
}
