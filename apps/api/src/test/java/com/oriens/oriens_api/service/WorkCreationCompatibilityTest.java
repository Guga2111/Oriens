package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.CreationReceipt;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.CreateTask;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.CreateObjective;
import java.util.HexFormat;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.repository.CreationReceiptRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WorkCreationCompatibilityTest {
    @Test
    void retriesAJava17Jackson2CreationReceiptWithoutChangingItsPayloadHash() {
        new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .withPropertyValues("spring.jackson.use-jackson2-defaults=true").run(context -> {
                var json = context.getBean(JsonMapper.class);
                var legacy = json.readTree(getClass().getResourceAsStream("/mcp/creation-task-boot3.json"));
                var em = mock(EntityManager.class);
                var repository = mock(CreationReceiptRepository.class);
                var lock = mock(Query.class);
                var key = UUID.fromString("00000000-0000-0000-0000-000000000002");
                var now = Instant.parse("2026-11-22T12:00:00Z");
                var receipt = CreationReceipt.builder().payloadSha256(legacy.get("payloadSha256").asText())
                    .resourceId(42L).resourceVersion(3L).responseBody(legacy.get("response"))
                    .expiresAt(now.plusSeconds(86400)).build();
                when(em.createNativeQuery(anyString())).thenReturn(lock);
                when(lock.setParameter(eq("owner"), eq(1L))).thenReturn(lock);
                when(lock.getResultList()).thenReturn(List.of(1L));
                when(em.find(User.class, 1L)).thenReturn(new User());
                when(repository.findByUserIdAndOperationAndIdempotencyKey(1L, "task", key))
                    .thenReturn(Optional.of(receipt));
                var service = new WorkCreationService(em, repository, json, Clock.fixed(now, ZoneOffset.UTC));
                var payload = new CreateTask(" Migração ", null, null, null, null, null,
                    LocalDate.of(2026, 12, 1), LocalTime.of(6, 30), null, Priority.MEDIUM, null, List.of());

                var replay = service.create(1L, "task", key.toString(), payload,
                    () -> { throw new AssertionError("A repetição não pode recriar a tarefa."); }, id -> id == 42L);

                assertThat(replay.resourceId()).isEqualTo(42L);
                assertThat(replay.version()).isEqualTo(3L);
                assertThat(replay.body()).isEqualTo(legacy.get("response"));
                verify(repository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
            });
    }
    @Test
    void retriesAnObjectiveReceiptFromBeforeDescriptionAndStartDateWereAdded() {
        new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .withPropertyValues("spring.jackson.use-jackson2-defaults=true").run(context -> {
                var json = context.getBean(JsonMapper.class);
                var em = mock(EntityManager.class);
                var repository = mock(CreationReceiptRepository.class);
                var lock = mock(Query.class);
                var key = UUID.randomUUID();
                var now = Instant.parse("2026-11-24T12:00:00Z");
                String legacyBody = "{\"dueDate\":null,\"projectVersion\":4,\"title\":\"Resultado\"}";
                String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(legacyBody.getBytes(StandardCharsets.UTF_8)));
                var response = json.readTree("{\"objective\":{\"id\":81,\"status\":\"PENDING\"},\"projectVersion\":5}");
                var receipt = CreationReceipt.builder().payloadSha256(hash).resourceId(81L).resourceVersion(0L)
                    .responseBody(response).expiresAt(now.plusSeconds(86400)).build();
                when(em.createNativeQuery(anyString())).thenReturn(lock);
                when(lock.setParameter(eq("owner"), eq(1L))).thenReturn(lock);
                when(lock.getResultList()).thenReturn(List.of(1L));
                when(em.find(User.class, 1L)).thenReturn(new User());
                when(repository.findByUserIdAndOperationAndIdempotencyKey(1L, "project:9:objective:create", key))
                    .thenReturn(Optional.of(receipt));
                var service = new WorkCreationService(em, repository, json, Clock.fixed(now, ZoneOffset.UTC));
                var payload = new CreateObjective(4L, " Resultado ", null);
                var replay = service.create(1L, "project:9:objective:create", key.toString(), payload,
                    () -> { throw new AssertionError("Não recriar o objetivo após upgrade."); }, id -> id == 81L);
                assertThat(replay.body()).isEqualTo(response);
                verify(repository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
            });
    }

}
