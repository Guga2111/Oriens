package com.oriens.oriens_api.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

/** Local durable receipt mapping; creation/replay/expiry policy is implemented by P2. */
@Entity
@Table(name = "creation_receipts", uniqueConstraints = @UniqueConstraint(
        columnNames = {"user_id", "operation", "idempotency_key"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CreationReceipt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(nullable = false, length = 200) private String operation;
    @Column(nullable = false) private UUID idempotencyKey;
    @Column(nullable = false, length = 64) private String payloadSha256;
    // Intentionally no resource FK: a receipt must survive resource deletion.
    @Column(nullable = false) private Long resourceId;
    @Column(nullable = false) private int responseStatus;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false)
    private JsonNode responseBody;
    @Column(nullable = false) private long resourceVersion;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private Instant expiresAt;
}
