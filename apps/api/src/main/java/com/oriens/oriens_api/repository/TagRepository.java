package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.Tag;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;

public interface TagRepository extends CrudRepository<Tag, Long> {
    List<Tag> findByUserId(Long userId);
    Optional<Tag> findByUserIdAndId(Long userId, Long id);
    Optional<Tag> findByUserIdAndAndName(Long userId, String name);
    boolean existsByUserIdAndName(Long userId, String name);
    List<Tag> findByUserIdAndIsDefaultTrue(Long userId);
    List<Tag> findByUserIdAndIsDefaultFalse(Long userId);

    long countByUserId(Long userId);
}
