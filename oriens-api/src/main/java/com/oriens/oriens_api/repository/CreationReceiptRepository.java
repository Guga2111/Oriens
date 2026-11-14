package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.CreationReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CreationReceiptRepository extends JpaRepository<CreationReceipt, Long> {
    Optional<CreationReceipt> findByUserIdAndOperationAndIdempotencyKey(Long owner, String operation, UUID key);
}
