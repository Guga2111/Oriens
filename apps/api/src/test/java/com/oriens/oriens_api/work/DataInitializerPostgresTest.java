package com.oriens.oriens_api.work;

import com.oriens.oriens_api.configuration.DataInitializer;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.events.UserCreatedListener;
import com.oriens.oriens_api.mapper.FinancialMapper;
import com.oriens.oriens_api.repository.UserRepository;
import com.oriens.oriens_api.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

@SpringBootTest(classes = WorkApiPostgresTest.App.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {"JWT_SECRET=synthetic-seed-only-not-a-production-secret-0123456789-abcdefghijklmnop",
        "spring.datasource.url=${P2_JDBC_URL}", "spring.datasource.username=postgres", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.open-in-view=false", "spring.jpa.show-sql=false",
        "spring.task.scheduling.enabled=false"})
@ActiveProfiles("dev")
@Import({DataInitializer.class, HabitService.class, FinancialEntryServiceImpl.class, FinancialMapper.class,
    TagServiceImpl.class, UserCreatedListener.class, WorkHomeService.class})
@EnabledIfEnvironmentVariable(named = "P2_JDBC_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/oriens_(p2|mcp)_proof")
class DataInitializerPostgresTest {
    private static final String EMAIL = "luisgosampaio@gmail.com";
    @MockitoBean FileStorageService profileFiles;
    @MockitoBean FileStorageProjectService projectFiles;
    @MockitoBean TaskServiceImpl legacy;
    @MockitoSpyBean WorkHomeService home;
    @Autowired DataInitializer initializer;
    @Autowired JdbcTemplate db;
    @Autowired UserRepository users;
    @Autowired BCryptPasswordEncoder encoder;
    @Autowired PlatformTransactionManager transactions;
    @Autowired HabitService habits;
    @Autowired WorkReadService workRead;
    @Autowired Clock clock;

    @Test void startupCreatesLoginAndEveryProductDomainWithValidRelationships() {
        User user = users.findByEmail(EMAIL).orElseThrow();
        assertThat(encoder.matches("12345678", user.getPassword())).isTrue();
        assertThat(user.getRole()).isEqualTo(UserRole.USER);
        Long owner = user.getId();
        assertThat(db.queryForList("select distinct mode from project where user_id=?", String.class, owner))
            .containsExactlyInAnyOrder("SIMPLE", "DEVELOPMENT");
        assertThat(db.queryForObject("select count(*) from project where user_id=? and archived", Long.class, owner)).isEqualTo(1);
        assertThat(db.queryForList("select distinct status from tasks where user_id=?", String.class, owner))
            .containsExactlyInAnyOrderElementsOf(java.util.Arrays.stream(Status.values()).map(Enum::name).toList());
        Long exampleId = db.queryForObject("select id from tasks where user_id=? and title=?", Long.class,
            owner, "Explorar o editor de descrição");
        var example = new TransactionTemplate(transactions).execute(status -> workRead.taskView(owner, exampleId));
        assertThat(example.description()).contains("```mermaid", "flowchart LR", "Etapa", "- [x]");
        assertThat(example.descriptionDoc().content().path("content").valueStream().map(node -> node.path("type").asString()))
            .contains("heading", "codeBlock", "table", "taskList");
        assertThat(db.queryForList("select distinct o.status from project_objectives o join project p on p.id=o.project_id where p.user_id=?", String.class, owner))
            .containsExactlyInAnyOrderElementsOf(java.util.Arrays.stream(ObjectiveStatus.values()).map(Enum::name).toList());
        assertThat(db.queryForObject("select count(*) from task_labels where user_id=?", Long.class, owner)).isEqualTo(6);
        assertThat(db.queryForObject("select count(*) from tags where user_id=?", Long.class, owner)).isEqualTo(6);
        assertThat(db.queryForList("select distinct recurrence_pattern from financial_entry where user_id=? and is_recurring", String.class, owner))
            .containsExactlyInAnyOrderElementsOf(java.util.Arrays.stream(RecurrencePattern.values()).map(Enum::name).toList());
        assertThat(db.queryForObject("select count(*) from financial_entry where user_id=? and amount>0", Long.class, owner)).isPositive();
        assertThat(db.queryForObject("select count(*) from financial_entry where user_id=? and amount<0", Long.class, owner)).isPositive();
        LocalDate today = LocalDate.now(clock.withZone(com.oriens.oriens_api.configuration.ProductClockConfiguration.ZONE));
        var summary = habits.summary(owner, today.minusDays(45), today);
        assertThat(summary.habits()).hasSize(5);
        assertThat(summary.completed()).isGreaterThan(20);
        assertThat(summary.habits()).anySatisfy(h -> assertThat(h.pauses()).isNotEmpty());
        assertThat(summary.habits()).anySatisfy(h -> assertThat(h.archivedOn()).isNotNull());
        assertThat(db.queryForObject("select count(*) from notifications where user_id=?", Long.class, owner)).isEqualTo(2);
        assertThat(db.queryForObject("select count(*) from support_tickets where user_id=?", Long.class, owner)).isEqualTo(3);
        assertThat(home.links(owner)).hasSize(3);
        assertThat(home.recents(owner)).hasSize(1);
    }

    @Test void restartPreservesExistingAccountAndDoesNotDuplicateOrRecreateDeletedExamples() {
        Map<String, Long> before = counts();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            User user = users.findByEmail(EMAIL).orElseThrow();
            user.setName("Nome personalizado");
            user.setPassword("already-customized-password");
            users.save(user);
            db.update("delete from notifications where user_id=?", user.getId());
            initializer.run(new DefaultApplicationArguments());
            assertThat(users.findByEmail(EMAIL).orElseThrow().getName()).isEqualTo("Nome personalizado");
            assertThat(users.findByEmail(EMAIL).orElseThrow().getPassword()).isEqualTo("already-customized-password");
            Map<String, Long> after = counts();
            assertThat(after.remove("notifications")).isEqualTo(before.get("notifications") - 2);
            Map<String, Long> expected = new LinkedHashMap<>(before);
            expected.remove("notifications");
            assertThat(after).isEqualTo(expected);
            status.setRollbackOnly();
        });
        assertThat(counts()).isEqualTo(before);
    }

    @Test void failureRollsBackAccountAndAllExamplesTogether() {
        Map<String, Long> before = counts();
        doThrow(new IllegalStateException("synthetic seed failure")).when(home).createLink(anyLong(), any());
        try {
            assertThatThrownBy(() -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
                // Simulate a fresh email while retaining the startup fixture for other tests.
                db.update("update users set email=? where email=?", "existing@example.invalid", EMAIL);
                initializer.run(new DefaultApplicationArguments());
            })).isInstanceOf(IllegalStateException.class).hasMessage("synthetic seed failure");
        } finally {
            reset(home);
        }
        assertThat(counts()).isEqualTo(before);
        assertThat(users.findByEmail(EMAIL)).isPresent();
        assertThat(users.findByEmail("existing@example.invalid")).isEmpty();
    }

    private Map<String, Long> counts() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (String table : new String[]{"users", "project", "project_objectives", "project_columns", "tasks", "task_labels",
                "task_label_assignments", "habits", "habit_schedules", "habit_pauses", "habit_executions", "tags",
                "financial_entry", "creation_receipts", "notifications", "support_tickets", "work_quick_links", "work_recent_visits"}) {
            result.put(table, db.queryForObject("select count(*) from " + table, Long.class));
        }
        return result;
    }
}
