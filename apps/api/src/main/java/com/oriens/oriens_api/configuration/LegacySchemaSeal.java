package com.oriens.oriens_api.configuration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;

/**
 * Databases installed by the former sealed ops/ runners record their revision in
 * {@code oriens_schema_baseline} instead of Flyway history. On their first Flyway start the
 * recorded revision becomes the Flyway baseline, so only later migrations run.
 */
@Configuration(proxyBeanMethods = false)
public class LegacySchemaSeal {
    static final String SEAL_TABLE = "oriens_schema_baseline";
    static final Map<String, String> FLYWAY_VERSION_BY_SEAL = Map.of(
            "oriens-projects-v2", "1",
            "oriens-task-labels-v1", "2",
            "oriens-statistics-v1", "3",
            "oriens-mcp-account-v1", "4",
            "oriens-mcp-work-v1", "5",
            "oriens-mcp-finance-v1", "6");

    @Bean
    FlywayMigrationStrategy adoptLegacySealThenMigrate() {
        return flyway -> {
            adopt(flyway);
            flyway.migrate();
        };
    }

    static void adopt(Flyway flyway) {
        var configuration = flyway.getConfiguration();
        String seal;
        try (Connection connection = configuration.getDataSource().getConnection()) {
            if (tableExists(connection, configuration.getTable()) || !tableExists(connection, SEAL_TABLE)) return;
            seal = sealedRevision(connection);
        } catch (SQLException e) {
            throw new IllegalStateException("Cannot inspect the legacy schema seal", e);
        }
        String version = FLYWAY_VERSION_BY_SEAL.get(seal);
        if (version == null) throw new IllegalStateException("Unknown legacy schema revision: " + seal);
        Flyway.configure().configuration(configuration)
                .baselineVersion(MigrationVersion.fromVersion(version))
                .baselineDescription("adopted " + seal)
                .load().baseline();
    }

    private static String sealedRevision(Connection connection) throws SQLException {
        try (var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT version FROM " + SEAL_TABLE)) {
            if (!rows.next()) throw new IllegalStateException("Legacy schema seal is empty");
            String version = rows.getString(1);
            if (rows.next()) throw new IllegalStateException("Legacy schema seal has more than one revision");
            return version;
        }
    }

    private static boolean tableExists(Connection connection, String table) throws SQLException {
        var metadata = connection.getMetaData();
        for (String name : new String[]{table, table.toUpperCase()}) {
            try (var tables = metadata.getTables(null, connection.getSchema(), name, new String[]{"TABLE"})) {
                if (tables.next()) return true;
            }
        }
        return false;
    }
}
