package com.oriens.oriens_api.work;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * V8 on boards made before it: an old board is built at V7, then V8 runs. Each test gets its own schema in the
 * disposable database of ops/postgres-tests.sh, so the application schema there is never touched.
 */
@EnabledIfEnvironmentVariable(named = "P1_JDBC_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/oriens_(p1|mcp)_proof")
class BacklogMigrationPostgresTest {
    DriverManagerDataSource source;
    JdbcTemplate db;
    String schema;

    Flyway flyway(String target) {
        return Flyway.configure().dataSource(source).schemas(schema).locations("classpath:db/migration/postgresql")
            .target(target).load();
    }

    @BeforeEach void schemaAtV7() {
        schema = "v8_proof_" + System.nanoTime();
        source = new DriverManagerDataSource(System.getenv("P1_JDBC_URL"), "postgres", "");
        // Every statement opens its own connection, so the schema goes in the URL rather than a SET.
        db = new JdbcTemplate(new DriverManagerDataSource(System.getenv("P1_JDBC_URL") + "?currentSchema=" + schema, "postgres", ""));
        flyway("7").migrate();
    }

    long user() {
        return db.queryForObject("insert into users(name,email,password,created_at,role) values ('A','a@example.invalid','x',now(),'USER') returning id", Long.class);
    }
    long board(long owner, String... columns) {
        long project = db.queryForObject("insert into project(user_id,title,mode,version) values (?,'Quadro antigo','DEVELOPMENT',3) returning id", Long.class, owner);
        for (int i = 0; i < columns.length; i += 2) {
            db.update("insert into project_columns(project_id,name,kind,position,version) values (?,?,?,?,0)", project, columns[i], columns[i + 1], i / 2);
        }
        db.update("update project set default_pending_column_id=(select id from project_columns where project_id=? and kind='PENDING' order by position limit 1),"
            + " default_completed_column_id=(select id from project_columns where project_id=? and kind='CONCLUDED' order by position limit 1) where id=?", project, project, project);
        return project;
    }
    List<Map<String, Object>> columns(long project) {
        return db.queryForList("select name,kind,position from project_columns where project_id=? order by position", project);
    }
    void migrate() { flyway("8").migrate(); }

    @Test void oldDefaultBoardGetsTheFiveEnglishColumnsAndKeepsItsTasks() {
        long owner = user();
        long project = board(owner, "A fazer", "PENDING", "Fazendo", "ON_DOING", "Concluídas", "CONCLUDED");
        long todo = db.queryForObject("select id from project_columns where project_id=? and kind='PENDING'", Long.class, project);
        long task = db.queryForObject("insert into tasks(user_id,project_id,column_id,position,title,status,created_at) values (?,?,?,0,'Antiga','PENDING',now()) returning id",
            Long.class, owner, project, todo);

        migrate();

        assertThat(columns(project)).extracting(c -> c.get("name")).containsExactly("Backlog", "To-Do", "In Progress", "Done", "Cancelled");
        assertThat(columns(project)).extracting(c -> c.get("kind")).containsExactly("BACKLOG", "PENDING", "ON_DOING", "CONCLUDED", "CANCELLED");
        assertThat(columns(project)).extracting(c -> c.get("position")).containsExactly(0, 1, 2, 3, 4);
        Map<String, Object> p = db.queryForMap("select p.version, c.kind from project p join project_columns c on c.id=p.default_pending_column_id where p.id=?", project);
        assertThat(p.get("kind")).isEqualTo("BACKLOG");
        assertThat(p.get("version")).isEqualTo(4L);
        Map<String, Object> kept = db.queryForMap("select column_id,status from tasks where id=?", task);
        assertThat(kept.get("column_id")).isEqualTo(todo);
        assertThat(kept.get("status")).isEqualTo("PENDING");
        // The state is accepted by both checks.
        db.update("update tasks set status='BACKLOG', column_id=(select id from project_columns where project_id=? and kind='BACKLOG') where id=?", project, task);
    }

    @Test void customNamesStayAndTakenNamesGetASuffix() {
        long owner = user();
        long project = board(owner, "backlog", "PENDING", "Revisão", "ON_DOING", "Entregue", "CONCLUDED", "Descartadas", "CANCELLED");

        migrate();

        assertThat(columns(project)).extracting(c -> c.get("name"))
            .containsExactly("Backlog (padrão)", "backlog", "Revisão", "Entregue", "Descartadas");
    }

    @Test void simpleProjectsAreUntouchedAndUnknownStatesStayRejected() {
        long owner = user();
        long simple = db.queryForObject("insert into project(user_id,title,mode,version) values (?,'Simples','SIMPLE',2) returning id", Long.class, owner);

        migrate();

        assertThat(columns(simple)).isEmpty();
        assertThat(db.queryForObject("select version from project where id=?", Long.class, simple)).isEqualTo(2L);
        assertThatThrownBy(() -> db.update("insert into tasks(user_id,title,status,created_at) values (?,'x','LATER',now())", owner))
            .hasMessageContaining("ck_tasks_status");
    }
}
