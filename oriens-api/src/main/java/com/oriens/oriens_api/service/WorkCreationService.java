package com.oriens.oriens_api.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.*;
import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import java.time.*;
import java.security.*;
import java.util.*;
import java.util.function.*;

/** User-row lock serializes creation keys (including first use); domain locks follow it.
 * Receipt and resource commit together. Expired keys remain tombstones and never recreate work.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class WorkCreationService {
    private final EntityManager em;
    private final CreationReceiptRepository receipts;
    private final ObjectMapper mapper;
    private final Clock clock;
    public record Created(Object body, long version, long resourceId) {}
    public Created create(Long owner, String operation, String header, Object payload,
                          Supplier<Created> action, Predicate<Long> exists) {
        UUID key = key(header);
        User user = em.find(User.class, owner, LockModeType.PESSIMISTIC_WRITE);
        if (user == null) throw fail("UNAUTHENTICATED", "Entre novamente para continuar.");
        String hash = hash(normalized(payload));
        Optional<CreationReceipt> previous = receipts.findByUserIdAndOperationAndIdempotencyKey(owner, operation, key);
        if (previous.isPresent()) {
            CreationReceipt receipt = previous.get();
            if (!receipt.getPayloadSha256().equals(hash)) throw fail("IDEMPOTENCY_CONFLICT", "A chave já foi usada com outros dados.");
            if (!receipt.getExpiresAt().isAfter(clock.instant())) throw fail("RESOURCE_GONE", "A tentativa expirou. Consulte os dados antes de criar novamente.");
            if (!exists.test(receipt.getResourceId())) throw fail("RESOURCE_GONE", "O recurso criado já foi excluído.");
            return new Created(receipt.getResponseBody(), receipt.getResourceVersion(), receipt.getResourceId());
        }
        Created result = action.get();
        receipts.saveAndFlush(CreationReceipt.builder().user(user).operation(operation).idempotencyKey(key)
            .payloadSha256(hash).resourceId(result.resourceId()).responseStatus(201)
            .responseBody(mapper.valueToTree(result.body())).resourceVersion(result.version())
            .createdAt(clock.instant()).expiresAt(clock.instant().plus(Duration.ofHours(24))).build());
        return result;
    }
    /** Discard replay bodies after retention, keep only minimal tombstones to prohibit uncertain retries. */
    @Scheduled(fixedDelay = 3600000)
    public void cleanExpiredBodies() {
        em.createQuery("update CreationReceipt r set r.responseBody = :empty where r.expiresAt <= :now")
            .setParameter("empty", mapper.createObjectNode()).setParameter("now", clock.instant()).executeUpdate();
    }
    private UUID key(String header) {
        if (header == null) throw fail("PRECONDITION_REQUIRED", "Informe Idempotency-Key para criar.");
        try {
            UUID parsed = UUID.fromString(header);
            if (!parsed.toString().equalsIgnoreCase(header)) throw new IllegalArgumentException();
            return parsed;
        } catch (IllegalArgumentException e) { throw fail("INVALID_REQUEST", "Idempotency-Key deve ser UUID."); }
    }
    private Object normalized(Object payload) {
        if (payload instanceof CreateProject p) return new CreateProject(trim(p.title()), p.mode(), p.description(), p.color(),
            p.objectives() == null ? List.of() : p.objectives().stream().map(o -> o == null ? null : new NewObjective(trim(o.title()), o.dueDate())).toList());
        if (payload instanceof CreateTask t) return new CreateTask(trim(t.title()), t.description(), t.projectId(), t.projectVersion(), t.objectiveId(), t.columnId(),
            t.plannedDate(), t.startTime(), t.dueDate(), t.priority() == null ? Priority.MEDIUM : t.priority(), t.location());
        if (payload instanceof CreateObjective o) return new CreateObjective(o.projectVersion(), trim(o.title()), o.dueDate());
        if (payload instanceof CreateColumn c) return new CreateColumn(c.projectVersion(), trim(c.name()), c.kind());
        return payload;
    }
    private String trim(String value) { return value == null ? null : value.trim(); }
    private String hash(Object payload) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(sorted(mapper.valueToTree(payload))))); }
        catch (Exception e) { throw new IllegalStateException("Cannot hash creation payload", e); }
    }
    private JsonNode sorted(JsonNode node) {
        if (node.isObject()) {
            ObjectNode result = mapper.createObjectNode();
            List<String> names = new ArrayList<>(); node.fieldNames().forEachRemaining(names::add); Collections.sort(names);
            names.forEach(name -> result.set(name, sorted(node.get(name)))); return result;
        }
        if (node.isArray()) { ArrayNode result = mapper.createArrayNode(); node.forEach(value -> result.add(sorted(value))); return result; }
        return node;
    }
    private static WorkDomainException fail(String code, String message) { return new WorkDomainException(code, "Idempotency-Key", message); }
}
