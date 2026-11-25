package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.WorkQuickLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

public interface WorkQuickLinkRepository extends JpaRepository<WorkQuickLink, Long> {
    List<WorkQuickLink> findByUserIdOrderByCreatedAtAscIdAsc(Long owner, Pageable page);
    Optional<WorkQuickLink> findByIdAndUserId(Long id, Long owner);
    long countByUserId(Long owner);
}
