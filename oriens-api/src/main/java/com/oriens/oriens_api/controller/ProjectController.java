package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.Project;
import com.oriens.oriens_api.entity.dto.ObjectiveStatusUpdateDTO;
import com.oriens.oriens_api.entity.dto.ProjectDTO;
import com.oriens.oriens_api.entity.embeddable.Objective;
import com.oriens.oriens_api.service.FileStorageProjectService;
import com.oriens.oriens_api.service.ProjectServiceImpl;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@AllArgsConstructor
@RequestMapping("/project")
public class ProjectController {

    private final ProjectServiceImpl projectService;
    private final FileStorageProjectService fileStorageProjectService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<ProjectDTO>> getProjectsByUser (@PathVariable Long userId, @PageableDefault(size = 6, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return new ResponseEntity<>(projectService.findProjectsByUserIdAndPagination(userId, pageable), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/sidebar")
    public ResponseEntity<List<ProjectDTO>> getProjectsOrderByFavAndTimestampDesc (@PathVariable Long userId) {
        return new ResponseEntity<>(projectService.findProjectsOrderByFavoriteDescAndLastAccessDesc(userId), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDTO> getProjectById (@PathVariable Long id) {
        return new ResponseEntity<>(projectService.getProjectById(id), HttpStatus.OK);
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<Project> createProject (@PathVariable Long userId, @RequestBody ProjectDTO projectDTO) {
        return new ResponseEntity<>(projectService.createProject(projectDTO, userId), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectDTO> updateProject (@PathVariable Long id, @RequestBody ProjectDTO projectDTO) {
        return new ResponseEntity<>(projectService.updateProject(id, projectDTO), HttpStatus.OK);
    }

    @PatchMapping("/{id}/favorite")
    public ResponseEntity<ProjectDTO> toggleFavorite (@PathVariable Long id) {
        return new ResponseEntity<>(projectService.toggleFavorite(id), HttpStatus.OK);
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<ProjectDTO> archiveProject (@PathVariable Long id) {
        return new ResponseEntity<>(projectService.archiveProject(id), HttpStatus.OK);
    }

    @PutMapping("/{id}/picture")
    public ResponseEntity<?> uploadProjectPicture (
            @PathVariable Long id,
            @RequestParam("projectImage")MultipartFile file
            ) throws IOException {

        try {
            String filename = fileStorageProjectService.storeFile(file, id);

            String fileUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/projects-pictures/")
                    .path(filename)
                    .toUriString();

            projectService.updateProjectImageUrl(id, fileUrl);

            Map<String, String> response = new HashMap<>();
            response.put("projectImageUrl", fileUrl);

            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IOException e) {
            return new ResponseEntity<>("Fail to save image.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PatchMapping("/{id}/objective/{objectiveIndex}")
    public ResponseEntity<ProjectDTO> updateObjectiveStatus (@PathVariable Long id, @PathVariable int objectiveIndex, @RequestBody ObjectiveStatusUpdateDTO objectiveStatusUpdateDTO) {
        return new ResponseEntity<>(projectService.updateObjectiveStatus(id, objectiveIndex, objectiveStatusUpdateDTO), HttpStatus.OK);
    }

    @PutMapping("/{id}/objective/{objectiveIndex}")
    public ResponseEntity<ProjectDTO> updateObjective (@PathVariable Long id, @PathVariable int objectiveIndex, @RequestBody Objective objective) {
        return new ResponseEntity<>(projectService.updateObjective(id, objectiveIndex, objective), HttpStatus.OK);
    }

    @PostMapping("/{id}/objective")
    public ResponseEntity<ProjectDTO> fastCreationOfObjective (@PathVariable Long id, @RequestBody Objective objective) {
        return new ResponseEntity<>(projectService.fastCreationOfObjective(id, objective), HttpStatus.CREATED);
    }

    @DeleteMapping("/{projectId}/objective/{objectiveIndex}")
    public ResponseEntity<Void> deleteObjective (@PathVariable Long projectId, @PathVariable int objectiveIndex) {
        projectService.deleteObjective(projectId, objectiveIndex);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject (@PathVariable Long id) {
        projectService.deleteProject(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
