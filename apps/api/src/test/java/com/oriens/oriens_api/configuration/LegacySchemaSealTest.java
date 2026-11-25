package com.oriens.oriens_api.configuration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class LegacySchemaSealTest {
    private final DriverManagerDataSource dataSource = new DriverManagerDataSource(
            "jdbc:h2:mem:seal-" + UUID.randomUUID() + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "sa", "");
    private final JdbcTemplate db = new JdbcTemplate(dataSource);
    private final Flyway flyway = Flyway.configure().dataSource(dataSource)
            .locations("classpath:db/migration/none").failOnMissingLocations(false).load();

    private void seal(String... versions) {
        db.execute("CREATE TABLE oriens_schema_baseline (version text PRIMARY KEY)");
        for (String version : versions) db.update("INSERT INTO oriens_schema_baseline VALUES (?)", version);
    }

    @Test void sealedDatabaseStartsFlywayHistoryAtItsRecordedRevision() {
        seal("oriens-mcp-work-v1");

        LegacySchemaSeal.adopt(flyway);

        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("5");
        assertThat(flyway.info().current().getDescription()).isEqualTo("adopted oriens-mcp-work-v1");
    }

    @Test void everySealedRevisionMapsToTheMigrationWithTheSameSql() {
        assertThat(LegacySchemaSeal.FLYWAY_VERSION_BY_SEAL).containsOnly(
                entry("oriens-projects-v2", "1"), entry("oriens-task-labels-v1", "2"),
                entry("oriens-statistics-v1", "3"), entry("oriens-mcp-account-v1", "4"),
                entry("oriens-mcp-work-v1", "5"), entry("oriens-mcp-finance-v1", "6"));
    }

    @Test void secondStartKeepsExistingFlywayHistory() {
        seal("oriens-statistics-v1");
        LegacySchemaSeal.adopt(flyway);
        Integer history = db.queryForObject("SELECT count(*) FROM \"flyway_schema_history\"", Integer.class);

        LegacySchemaSeal.adopt(flyway);

        assertThat(db.queryForObject("SELECT count(*) FROM \"flyway_schema_history\"", Integer.class)).isEqualTo(history);
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("3");
    }

    @Test void unsealedDatabaseIsLeftToFlyway() {
        LegacySchemaSeal.adopt(flyway);

        assertThat(flyway.info().current()).isNull();
    }

    @Test void unknownOrAmbiguousSealRefusesToStart() {
        seal("oriens-unknown-v9");
        assertThatIllegalStateException().isThrownBy(() -> LegacySchemaSeal.adopt(flyway))
                .withMessageContaining("oriens-unknown-v9");

        db.update("INSERT INTO oriens_schema_baseline VALUES ('oriens-projects-v2')");
        assertThatIllegalStateException().isThrownBy(() -> LegacySchemaSeal.adopt(flyway))
                .withMessageContaining("more than one revision");
        assertThat(flyway.info().current()).isNull();
    }
}
