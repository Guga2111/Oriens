package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.TaskAttachment;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, UUID> {
    Optional<TaskAttachment> findByIdAndTaskIdAndUserId(UUID id, Long taskId, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TaskAttachment a where a.id = :id and a.taskId = :taskId and a.userId = :owner")
    Optional<TaskAttachment> lockOwned(UUID id, Long taskId, Long owner);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TaskAttachment a where a.taskId = :taskId and a.userId = :owner order by a.id")
    List<TaskAttachment> lockForTask(Long taskId, Long owner);

    long countByTaskIdAndUserId(Long taskId, Long userId);

    @Query("select coalesce(sum(a.bytes), 0) from TaskAttachment a where a.userId = :owner")
    long bytesForOwner(Long owner);

    record Candidate(UUID id, Long taskId, Long userId) {}

    @Query("""
        select new com.oriens.oriens_api.repository.TaskAttachmentRepository$Candidate(a.id, a.taskId, a.userId)
        from TaskAttachment a
        where a.unusedSince < :cutoff or not exists
            (select 1 from Task t where t.id = a.taskId and t.user.id = a.userId)
        order by a.id
        """)
    List<Candidate> expired(Instant cutoff, Pageable page);
}
