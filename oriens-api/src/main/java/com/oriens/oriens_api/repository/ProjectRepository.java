package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.Project;
import com.oriens.oriens_api.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends CrudRepository<Project, Long> {
    Page<Project> findByUserIdAndArchived(Long userId, Boolean archived, Pageable pageable);

    List<Project> findByUserId (Long userId);

    @Query("SELECT p FROM Project p WHERE p.user = :user AND (p.archived = false OR p.archived IS NULL) ORDER BY p.favorite DESC, p.lastAccessed DESC NULLS LAST")
    List<Project> findAllForSidebar(@Param("user") User user);

    @Query("SELECT COUNT(p) FROM Project p WHERE p.user.id = :userId AND p.archived = false")
    long countActiveProjects (@Param("userId") Long userId);
}
