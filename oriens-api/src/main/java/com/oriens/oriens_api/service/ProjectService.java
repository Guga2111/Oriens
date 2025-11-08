package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Project;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.ObjectiveStatusUpdateDTO;
import com.oriens.oriens_api.entity.dto.ProjectDTO;
import com.oriens.oriens_api.entity.embeddable.Objective;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProjectService {

    Page<ProjectDTO> findProjectsByUserIdAndPagination (Long userId, Pageable page);

    List<ProjectDTO> findProjectsOrderByFavoriteDescAndLastAccessDesc (Long userId);
    ProjectDTO getProjectById (Long id);

    Project createProject (ProjectDTO projectDTO, Long userId);

    ProjectDTO updateProject (Long projectId, ProjectDTO projectDTO);
    ProjectDTO toggleFavorite (Long projectId);
    ProjectDTO archiveProject (Long projectId);
    void updateProjectImageUrl (Long projectId, String imageUrl);
    ProjectDTO fastCreationOfObjective (Long id, Objective objective);

    ProjectDTO updateObjectiveStatus(Long projectId, int objectiveIndex, ObjectiveStatusUpdateDTO statusUpdateDTO);

    ProjectDTO updateObjective (Long projectId, int objectiveIndex, Objective objective);

    void deleteProject (Long projectId);

    void deleteObjective (Long projectId, int objectiveIndex);
}
