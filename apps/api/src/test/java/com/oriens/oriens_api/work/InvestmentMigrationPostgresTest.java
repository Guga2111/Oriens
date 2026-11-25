package com.oriens.oriens_api.work;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import static org.assertj.core.api.Assertions.*;

/** V15 on accounts made before it: built at V13, then V15 runs in a schema of its own. */
@EnabledIfEnvironmentVariable(named = "P1_JDBC_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/oriens_(p1|mcp)_proof")
class InvestmentMigrationPostgresTest {
    DriverManagerDataSource source;
    JdbcTemplate db;
    String schema;

    Flyway flyway(String target) {
        return Flyway.configure().dataSource(source).schemas(schema).locations("classpath:db/migration/postgresql").target(target).load();
    }

    @BeforeEach void schemaAtV13() {
        schema = "v15_proof_" + System.nanoTime();
        source = new DriverManagerDataSource(System.getenv("P1_JDBC_URL"), "postgres", "");
        db = new JdbcTemplate(new DriverManagerDataSource(System.getenv("P1_JDBC_URL") + "?currentSchema=" + schema, "postgres", ""));
        flyway("13").migrate();
    }

    long user(String email) {
        return db.queryForObject("insert into users(name,email,password,created_at,role) values ('A',?,'x',now(),'USER') returning id", Long.class, email);
    }
    long tag(long owner, String name, boolean predefined) {
        return db.queryForObject("insert into tags(user_id,name,color,is_default,allow_negative,created_at) values (?,?,'#8B5CF6',?,true,now()) returning id",
            Long.class, owner, name, predefined);
    }

    @Test void everyAccountEndsWithOneKeyedInvestmentsTagAndOldEntriesStayStandard() {
        long signup = user("signup@example.invalid"), custom = user("custom@example.invalid"), bare = user("bare@example.invalid");
        long predefined = tag(signup, "Investimentos", true);
        long own = tag(custom, "Investimentos", false);
        long other = tag(bare, "Mercado", false);
        long entry = db.queryForObject("insert into financial_entry(user_id,tag_id,amount,entry_date,description,is_recurring,created_at) values (?,?,-12.34,'2026-11-01','Feira',false,now()) returning id",
            Long.class, bare, other);

        flyway("15").migrate();

        assertThat(db.queryForObject("select system_key from tags where id=?", String.class, predefined)).isEqualTo("INVESTMENTS");
        assertThat(db.queryForObject("select system_key from tags where id=?", String.class, own)).isEqualTo("INVESTMENTS");
        assertThat(db.queryForObject("select count(*) from tags where user_id=? and system_key='INVESTMENTS' and name='Investimentos' and is_default", Long.class, bare)).isEqualTo(1);
        assertThat(db.queryForObject("select count(*) from tags where system_key='INVESTMENTS'", Long.class)).isEqualTo(3);
        assertThat(db.queryForMap("select kind,amount::text amount from financial_entry where id=?", entry))
            .containsEntry("kind", "STANDARD").containsEntry("amount", "-12.34");
    }
}
