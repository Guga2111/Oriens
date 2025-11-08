package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Project;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.ObjectiveStatusUpdateDTO;
import com.oriens.oriens_api.entity.dto.ProjectDTO;
import com.oriens.oriens_api.entity.embeddable.Objective;
import com.oriens.oriens_api.entity.enums.Status;
import com.oriens.oriens_api.exception.AccessUnauthorizedException;
import com.oriens.oriens_api.exception.ProjectNotFoundException;
import com.oriens.oriens_api.exception.UserNotFoundException;
import com.oriens.oriens_api.repository.ProjectRepository;
import com.oriens.oriens_api.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.AccessDeniedException;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;

    private final UserRepository userRepository;

    @Override
    public ProjectDTO getProjectById(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ProjectNotFoundException(id));

        return convertProjectToDTO(project);
    }

    @Override
    @Transactional
    public Project createProject(ProjectDTO projectDTO, Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        Project project = Project.builder()
                .title(projectDTO.getTitle())
                .description(projectDTO.getDescription())
                .color(projectDTO.getColor())
                .imageUrl(projectDTO.getImageUrl())
                .objectives(projectDTO.getObjectives())
                .archived(false)
                .favorite(false)
                .user(user)
                .build();

        return projectRepository.save(project);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectDTO> findProjectsByUserIdAndPagination(Long userId, Pageable page) {
        Page<Project> projects = projectRepository.findByUserIdAndArchived(userId, false, page);

        return projects
                .map(this::convertProjectToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectDTO> findProjectsOrderByFavoriteDescAndLastAccessDesc(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        List<Project> projects = projectRepository.findAllForSidebar(user);

        return projects.stream()
                .map(this::convertProjectToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ProjectDTO updateProject(Long projectId, ProjectDTO projectDetails) {

        Project existingProject = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        existingProject.setColor(projectDetails.getColor());
        existingProject.setTitle(projectDetails.getTitle());
        existingProject.setObjectives(projectDetails.getObjectives());
        existingProject.setImageUrl(projectDetails.getImageUrl());
        existingProject.setDescription(projectDetails.getDescription());

        projectRepository.save(existingProject);
        return convertProjectToDTO(existingProject);
    }

    @Override
    public void updateProjectImageUrl(Long projectId, String imageUrl) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        project.setImageUrl(imageUrl);
        projectRepository.save(project);
    }

    @Override
    @Transactional
    public ProjectDTO updateObjectiveStatus(Long projectId, int objectiveIndex, ObjectiveStatusUpdateDTO statusUpdateDTO) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        project.setLastAccessed(Instant.now());

        List<Objective> objectives = project.getObjectives();

        if (objectiveIndex < 0 || objectiveIndex >= objectives.size()) {
            throw new IndexOutOfBoundsException("Invalid index: " + objectiveIndex);
        }

        Objective objective = objectives.get(objectiveIndex);
        objective.setStatus(statusUpdateDTO.getStatus());
        objective.setCompleted(!objective.isCompleted());

        Project updatedProject = projectRepository.save(project);

        return convertProjectToDTO(updatedProject);
    }

    @Override
    @Transactional
    public ProjectDTO updateObjective(Long projectId, int objectiveIndex, Objective objectiveEntry) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        project.setLastAccessed(Instant.now());

        List<Objective> objectives = project.getObjectives();

        if (objectiveIndex < 0 || objectiveIndex >= objectives.size()) {
            throw new IndexOutOfBoundsException("Invalid index: " + objectiveIndex);
        }

        Objective objective = objectives.get(objectiveIndex);
        objective.setCompleted(!objective.isCompleted());
        objective.setTitle(objectiveEntry.getTitle());
        objective.setDueDate(objectiveEntry.getDueDate());

        Project updatedProject = projectRepository.save(project);

        return convertProjectToDTO(updatedProject);
    }

    @Override
    @Transactional
    public ProjectDTO toggleFavorite(Long projectId) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        if (!email.equals(project.getUser().getEmail())) {
            throw new AccessUnauthorizedException();
        }

        project.setFavorite(!project.isFavorite());

        projectRepository.save(project);

        return ProjectDTO.builder()
                .id(project.getId())
                .favorite(project.isFavorite())
                .title(project.getTitle())
                .progress(project.getProgress())
                .objectives(project.getObjectives())
                .imageUrl(project.getImageUrl())
                .lastAccessed(project.getLastAccessed())
                .archived(project.getArchived())
                .description(project.getDescription())
                .color(project.getColor())
                .build();
    }

    @Transactional
    @Override
    public ProjectDTO fastCreationOfObjective(Long id, Objective objective) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ProjectNotFoundException(id));

        objective.setStatus(Status.PENDING);

        project.getObjectives().add(objective);

        projectRepository.save(project);
        return convertProjectToDTO(project);
    }

    @Override
    @Transactional
    public ProjectDTO archiveProject (Long projectId) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        if (!email.equals(project.getUser().getEmail())) {
            throw new AccessUnauthorizedException();
        }

        project.setArchived(true);

        projectRepository.save(project);

        return ProjectDTO.builder()
                .id(project.getId())
                .favorite(project.isFavorite())
                .title(project.getTitle())
                .progress(project.getProgress())
                .objectives(project.getObjectives())
                .imageUrl(project.getImageUrl())
                .lastAccessed(project.getLastAccessed())
                .archived(project.getArchived())
                .description(project.getDescription())
                .color(project.getColor())
                .build();
    }

    @Override
    @Transactional
    public void deleteProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        projectRepository.delete(project);
    }

    @Override
    @Transactional
    public void deleteObjective(Long projectId, int objectiveIndex) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        project.setLastAccessed(Instant.now());

        List<Objective> objectives = project.getObjectives();

        if (objectiveIndex < 0 || objectiveIndex >= objectives.size()) {
            throw new IndexOutOfBoundsException("Invalid index: " + objectiveIndex);
        }

        Objective objective = objectives.remove(objectiveIndex);

        projectRepository.save(project);
    }

    private ProjectDTO convertProjectToDTO(Project project) {

        ProjectDTO projectDto = new ProjectDTO();
        projectDto.setId(project.getId());
        projectDto.setTitle(project.getTitle());
        projectDto.setDescription(project.getDescription());
        projectDto.setImageUrl(project.getImageUrl());
        projectDto.setColor(project.getColor());
        projectDto.setLastAccessed(project.getLastAccessed());
        projectDto.setFavorite(project.isFavorite());

        projectDto.setProgress(project.getProgress());
        projectDto.setTotalObjectives(project.getObjectives().size());
        projectDto.setObjectives(project.getObjectives());

        return projectDto;
    }
}
