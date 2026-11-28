package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.ProjectActivity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectActivityRepository extends JpaRepository<ProjectActivity, Long> {
    Slice<ProjectActivity> findByProjectIdAndProjectUserIdOrderByOccurredAtDescIdDesc(
        Long projectId, Long ownerId, Pageable page);
}
