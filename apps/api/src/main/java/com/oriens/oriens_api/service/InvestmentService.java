package com.oriens.oriens_api.service;

import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.entity.dto.financial.InvestmentViews.*;
import com.oriens.oriens_api.entity.enums.EntryKind;
import com.oriens.oriens_api.exception.WorkDomainException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;

/** Manual portfolio. Each movement owns exactly one cash entry tagged with the account's predefined
 * Investimentos tag; both change in the same transaction. Writes serialize on the owner row
 * (WorkCreationService), then lock investment -> child -> entry. Positions are computed on read. */
@Service @RequiredArgsConstructor @Transactional(timeout=10)
public class InvestmentService {
    public static final String INVESTMENTS_TAG = "INVESTMENTS";
    private final JdbcTemplate db;
    private final Clock clock;
    private final WorkCreationService receipts;
    /** Idempotency payload: the target and expected version are part of the intention. */
    public record Intent(Long investmentId, Long id, Long version, Object input) {}

    // Latest valuation per investment, then contributions/withdrawals recorded after it.
    private static final String POSITIONS = """
        with latest as (
            select distinct on (v.investment_id) v.investment_id,v.id,v.amount,v.valued_on,v.recorded_seq,v.version,v.created_at
            from investment_valuations v where v.user_id=?
            order by v.investment_id,v.valued_on desc,v.recorded_seq desc
        ), later as (
            select m.investment_id,sum(case m.type when 'CONTRIBUTION' then m.amount else -m.amount end) delta,count(*) moves
            from investment_movements m join latest l on l.investment_id=m.investment_id
            where m.user_id=? and m.type<>'INCOME'
              and (m.occurred_on>l.valued_on or (m.occurred_on=l.valued_on and m.recorded_seq>l.recorded_seq))
            group by m.investment_id
        ), positions as (
            select i.id,i.name,i.asset_class,i.version,i.created_at,
                l.id valuation_id,l.amount valuation_amount,l.valued_on,l.version valuation_version,l.created_at valuation_created_at,
                l.amount+coalesce(a.delta,0) estimate,coalesce(a.moves,0) moves
            from investments i left join latest l on l.investment_id=i.id left join later a on a.investment_id=i.id
            where i.user_id=?
        ), valued as (
            select p.*,case when p.valuation_id is null then 'UNAVAILABLE' when p.estimate<0 then 'NEEDS_VALUATION'
                when p.moves>0 then 'ESTIMATED' else 'VALUED' end status from positions p
        )
        """;
    private static final String COUNTED = "status in ('VALUED','ESTIMATED')";

    // ---- reads ----

    @Transactional(readOnly=true)
    public Page<Investment> page(Long owner, Pageable page) {
        List<Investment> content = db.query(POSITIONS + "select * from valued order by lower(name),id limit ? offset ?",
            this::investment, owner, owner, owner, page.getPageSize(), page.getOffset());
        long total = db.queryForObject("select count(*) from investments where user_id=?", Long.class, owner);
        return new PageImpl<>(content, page, total);
    }

    @Transactional(readOnly=true)
    public Investment get(Long owner, Long id) {
        return db.query(POSITIONS + "select * from valued where id=?", this::investment, owner, owner, owner, id)
            .stream().findFirst().orElseThrow(this::investmentNotFound);
    }

    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    public Summary summary(Long owner) {
        record Totals(BigDecimal total, long covered, long investments) {}
        Totals totals = db.queryForObject(POSITIONS + "select coalesce(sum(estimate) filter(where " + COUNTED + "),0),"
            + "count(*) filter(where " + COUNTED + "),count(*) from valued",
            (r, i) -> new Totals(r.getBigDecimal(1), r.getLong(2), r.getLong(3)), owner, owner, owner);
        List<ClassTotal> composition = db.query(POSITIONS + "select asset_class,sum(estimate),count(*) from valued where "
            + COUNTED + " group by asset_class order by sum(estimate) desc,asset_class",
            (r, i) -> new ClassTotal(AssetClass.valueOf(r.getString(1)), r.getBigDecimal(2), r.getLong(3)), owner, owner, owner);
        BigDecimal[] flows = db.queryForObject("""
            select coalesce(sum(amount) filter(where type='CONTRIBUTION'),0)-coalesce(sum(amount) filter(where type='WITHDRAWAL'),0),
                coalesce(sum(amount) filter(where type='INCOME'),0) from investment_movements where user_id=?
            """, (r, i) -> new BigDecimal[]{r.getBigDecimal(1), r.getBigDecimal(2)}, owner);
        return new Summary(totals.total(), totals.covered(), totals.investments(), flows[0], flows[1], composition);
    }

    @Transactional(readOnly=true)
    public Page<Valuation> valuations(Long owner, Long investmentId, Pageable page) {
        requireInvestment(owner, investmentId);
        List<Valuation> content = db.query("""
            select id,investment_id,amount,valued_on,version,created_at from investment_valuations
            where user_id=? and investment_id=? order by valued_on desc,recorded_seq desc limit ? offset ?
            """, VALUATION, owner, investmentId, page.getPageSize(), page.getOffset());
        long total = db.queryForObject("select count(*) from investment_valuations where user_id=? and investment_id=?", Long.class, owner, investmentId);
        return new PageImpl<>(content, page, total);
    }

    @Transactional(readOnly=true)
    public Page<Movement> movements(Long owner, Long investmentId, MovementType type, LocalDate start, LocalDate end, Pageable page) {
        WorkReadService.interval(start, end);
        if (investmentId != null) requireInvestment(owner, investmentId);
        String typeName = type == null ? null : type.name();
        String filter = """
             from investment_movements where user_id=? and (?::bigint is null or investment_id=?) and (?::text is null or type=?)
              and (?::date is null or occurred_on>=?) and (?::date is null or occurred_on<=?)
            """;
        Object[] args = {owner, investmentId, investmentId, typeName, typeName, start, start, end, end};
        List<Object> paged = new ArrayList<>(Arrays.asList(args));
        paged.add(page.getPageSize());
        paged.add(page.getOffset());
        List<Movement> content = db.query("select id,investment_id,type,amount,occurred_on,description,entry_id,version,created_at"
            + filter + " order by occurred_on desc,recorded_seq desc limit ? offset ?", MOVEMENT, paged.toArray());
        long total = db.queryForObject("select count(*)" + filter, Long.class, args);
        return new PageImpl<>(content, page, total);
    }

    private boolean exists(String table, Long owner, Long id) {
        if (!Set.of("investments", "investment_valuations", "investment_movements").contains(table)) throw new IllegalArgumentException(table);
        return db.queryForObject("select count(*) from " + table + " where user_id=? and id=?", Long.class, owner, id) > 0;
    }

    // ---- investment writes ----

    public WorkCreationService.Completed create(Long owner, String key, Create input) {
        return write(owner, "create", key, input, 201, "investments", () -> {
            String name = name(input.name());
            date(input.valuedOn(), "valuedOn");
            Long id = db.queryForObject("insert into investments(user_id,name,asset_class,created_at) values(?,?,?,?) returning id",
                Long.class, owner, name, input.assetClass().name(), now());
            db.update("insert into investment_valuations(user_id,investment_id,valued_on,amount,created_at) values(?,?,?,?,?)",
                owner, id, input.valuedOn(), input.initialValue(), now());
            Investment view = get(owner, id);
            return new WorkCreationService.Created(view, view.version(), id);
        });
    }

    public WorkCreationService.Completed patch(Long owner, String key, Long id, Long version, Patch input) {
        return write(owner, "update", key, new Intent(null, id, version, input), 200, "investments", () -> {
            if (input == null || (input.name() == null && input.assetClass() == null))
                throw fail("INVALID_REQUEST", null, "Informe ao menos um campo para alterar.");
            lockInvestment(owner, id, version);
            db.update("update investments set name=coalesce(?,name),asset_class=coalesce(?,asset_class),version=version+1,updated_at=? where user_id=? and id=?",
                input.name() == null ? null : name(input.name()), input.assetClass() == null ? null : input.assetClass().name(), now(), owner, id);
            Investment view = get(owner, id);
            return new WorkCreationService.Created(view, view.version(), id);
        });
    }

    /** Allowed without movements, or once the position is exactly zero. Cash entries stay in the
     * history with their classification and become ordinary editable entries. */
    public WorkCreationService.Completed delete(Long owner, String key, Long id, Long version) {
        return write(owner, "delete", key, new Intent(null, id, version, null), 200, null, () -> {
            lockInvestment(owner, id, version);
            Investment current = get(owner, id);
            boolean moved = db.queryForObject("select count(*) from investment_movements where user_id=? and investment_id=?", Long.class, owner, id) > 0;
            boolean zeroed = current.position() != null && current.position().signum() == 0;
            if (moved && !zeroed)
                throw fail("DOMAIN_VIOLATION", null, "Só é possível excluir uma aplicação com movimentos quando a posição estiver zerada.");
            db.update("delete from investments where user_id=? and id=?", owner, id);
            return new WorkCreationService.Created(Map.of("deleted", true, "id", id), version, id);
        });
    }

    // ---- valuations ----

    public WorkCreationService.Completed addValuation(Long owner, String key, Long investmentId, ValuationInput input) {
        return write(owner, "valuation:create", key, new Intent(investmentId, null, null, input), 201, "investment_valuations", () -> {
            lockInvestment(owner, investmentId, null);
            date(input.valuedOn(), "valuedOn");
            Long id = db.queryForObject("insert into investment_valuations(user_id,investment_id,valued_on,amount,created_at) values(?,?,?,?,?) returning id",
                Long.class, owner, investmentId, input.valuedOn(), input.amount(), now());
            Valuation view = valuation(owner, investmentId, id);
            return new WorkCreationService.Created(view, view.version(), id);
        });
    }

    public WorkCreationService.Completed replaceValuation(Long owner, String key, Long investmentId, Long id, Long version, ValuationInput input) {
        return write(owner, "valuation:update", key, new Intent(investmentId, id, version, input), 200, "investment_valuations", () -> {
            lockInvestment(owner, investmentId, null);
            lockChild("investment_valuations", owner, investmentId, id, version, "Avaliação não encontrada.", "A avaliação mudou. Recarregue antes de salvar.");
            date(input.valuedOn(), "valuedOn");
            db.update("update investment_valuations set valued_on=?,amount=?,version=version+1,updated_at=? where user_id=? and id=?",
                input.valuedOn(), input.amount(), now(), owner, id);
            Valuation view = valuation(owner, investmentId, id);
            return new WorkCreationService.Created(view, view.version(), id);
        });
    }

    public WorkCreationService.Completed deleteValuation(Long owner, String key, Long investmentId, Long id, Long version) {
        return write(owner, "valuation:delete", key, new Intent(investmentId, id, version, null), 200, null, () -> {
            lockInvestment(owner, investmentId, null);
            lockChild("investment_valuations", owner, investmentId, id, version, "Avaliação não encontrada.", "A avaliação mudou. Recarregue antes de salvar.");
            db.update("delete from investment_valuations where user_id=? and id=?", owner, id);
            return new WorkCreationService.Created(Map.of("deleted", true, "id", id), version, id);
        });
    }

    // ---- movements ----

    public WorkCreationService.Completed addMovement(Long owner, String key, Long investmentId, MovementInput input) {
        return write(owner, "movement:create", key, new Intent(investmentId, null, null, input), 201, "investment_movements", () -> {
            String name = lockInvestment(owner, investmentId, null);
            date(input.occurredOn(), "occurredOn");
            String description = description(input.description());
            Long entry = db.queryForObject("""
                insert into financial_entry(user_id,tag_id,amount,entry_date,description,kind,is_recurring,recurrence_started_on,version,created_at)
                values(?,?,?,?,?,?,false,?,0,?) returning id
                """, Long.class, owner, investmentTag(owner), cash(input), input.occurredOn(), entryDescription(input, name, description),
                kind(input.type()).name(), today(), now());
            Long id = db.queryForObject("""
                insert into investment_movements(user_id,investment_id,type,amount,occurred_on,description,entry_id,created_at)
                values(?,?,?,?,?,?,?,?) returning id
                """, Long.class, owner, investmentId, input.type().name(), input.amount(), input.occurredOn(), description, entry, now());
            Movement view = movement(owner, id);
            return new WorkCreationService.Created(view, view.version(), id);
        });
    }

    public WorkCreationService.Completed replaceMovement(Long owner, String key, Long investmentId, Long id, Long version, MovementInput input) {
        return write(owner, "movement:update", key, new Intent(investmentId, id, version, input), 200, "investment_movements", () -> {
            String name = lockInvestment(owner, investmentId, null);
            lockChild("investment_movements", owner, investmentId, id, version, "Movimento não encontrado.", "O movimento mudou. Recarregue antes de salvar.");
            date(input.occurredOn(), "occurredOn");
            String description = description(input.description());
            Long entry = db.queryForObject("select entry_id from investment_movements where user_id=? and id=?", Long.class, owner, id);
            db.queryForObject("select id from financial_entry where user_id=? and id=? for update", Long.class, owner, entry);
            db.update("update financial_entry set tag_id=?,amount=?,entry_date=?,description=?,kind=?,version=version+1,updated_at=? where user_id=? and id=?",
                investmentTag(owner), cash(input), input.occurredOn(), entryDescription(input, name, description), kind(input.type()).name(), now(), owner, entry);
            db.update("update investment_movements set type=?,amount=?,occurred_on=?,description=?,version=version+1,updated_at=? where user_id=? and id=?",
                input.type().name(), input.amount(), input.occurredOn(), description, now(), owner, id);
            Movement view = movement(owner, id);
            return new WorkCreationService.Created(view, view.version(), id);
        });
    }

    public WorkCreationService.Completed deleteMovement(Long owner, String key, Long investmentId, Long id, Long version) {
        return write(owner, "movement:delete", key, new Intent(investmentId, id, version, null), 200, null, () -> {
            lockInvestment(owner, investmentId, null);
            lockChild("investment_movements", owner, investmentId, id, version, "Movimento não encontrado.", "O movimento mudou. Recarregue antes de salvar.");
            Long entry = db.queryForObject("select entry_id from investment_movements where user_id=? and id=?", Long.class, owner, id);
            db.update("delete from investment_movements where user_id=? and id=?", owner, id);
            db.update("delete from financial_entry where user_id=? and id=?", owner, entry);
            return new WorkCreationService.Created(Map.of("deleted", true, "id", id), version, id);
        });
    }

    // ---- helpers ----

    /** Replays of a non-delete intention require the resource to still exist and belong to the owner. */
    private WorkCreationService.Completed write(Long owner, String action, String key, Object payload, int status, String table,
                                                Supplier<WorkCreationService.Created> work) {
        return receipts.execute(owner, "rest:investment:" + action, key, payload, status, work, receipt -> {
            if (table != null && !exists(table, owner, receipt.getResourceId()))
                throw fail("RESOURCE_GONE", null, "O registro foi excluído. Consulte os dados antes de tentar novamente.");
        });
    }

    /** Locks the owned investment (404 otherwise), checks the version when given, returns its name. */
    private String lockInvestment(Long owner, Long id, Long version) {
        record Row(String name, long version) {}
        Row row = db.query("select name,version from investments where user_id=? and id=? for update",
            (r, i) -> new Row(r.getString(1), r.getLong(2)), owner, id).stream().findFirst().orElseThrow(this::investmentNotFound);
        if (version != null && version != row.version()) throw fail("VERSION_CONFLICT", "expectedVersion", "A aplicação mudou. Recarregue antes de salvar.");
        return row.name();
    }

    private void lockChild(String table, Long owner, Long investmentId, Long id, Long version, String missing, String conflict) {
        Long current = db.query("select version from " + table + " where user_id=? and investment_id=? and id=? for update",
            (r, i) -> r.getLong(1), owner, investmentId, id).stream().findFirst().orElseThrow(() -> fail("NOT_FOUND", null, missing));
        if (!current.equals(version)) throw fail("VERSION_CONFLICT", "expectedVersion", conflict);
    }

    private void requireInvestment(Long owner, Long id) {
        if (!exists("investments", owner, id)) throw investmentNotFound();
    }

    /** The account's predefined Investimentos tag, by stable key. Accounts created outside the signup
     * event adopt an existing "Investimentos" tag or receive one. Runs under the owner lock. */
    private Long investmentTag(Long owner) {
        return db.query("select id from tags where user_id=? and system_key=?", (r, i) -> r.getLong(1), owner, INVESTMENTS_TAG)
            .stream().findFirst()
            .or(() -> db.query("update tags set system_key=? where user_id=? and name='Investimentos' and system_key is null returning id",
                (r, i) -> r.getLong(1), INVESTMENTS_TAG, owner).stream().findFirst())
            .orElseGet(() -> db.queryForObject("""
                insert into tags(user_id,name,color,is_default,allow_negative,created_at,system_key)
                values(?,'Investimentos','#8B5CF6',true,true,?,?) returning id
                """, Long.class, owner, now(), INVESTMENTS_TAG));
    }

    private static BigDecimal cash(MovementInput input) {
        return input.type() == MovementType.CONTRIBUTION ? input.amount().negate() : input.amount();
    }
    private static EntryKind kind(MovementType type) {
        return type == MovementType.INCOME ? EntryKind.INVESTMENT_INCOME : EntryKind.INVESTMENT_TRANSFER;
    }
    private static String entryDescription(MovementInput input, String investment, String description) {
        if (description != null) return description;
        String label = switch (input.type()) { case CONTRIBUTION -> "Aporte"; case WITHDRAWAL -> "Resgate"; case INCOME -> "Rendimento"; };
        return label + ": " + investment;
    }

    private Valuation valuation(Long owner, Long investmentId, Long id) {
        return db.queryForObject("select id,investment_id,amount,valued_on,version,created_at from investment_valuations where user_id=? and investment_id=? and id=?",
            VALUATION, owner, investmentId, id);
    }
    private Movement movement(Long owner, Long id) {
        return db.queryForObject("select id,investment_id,type,amount,occurred_on,description,entry_id,version,created_at from investment_movements where user_id=? and id=?",
            MOVEMENT, owner, id);
    }

    private static final RowMapper<Valuation> VALUATION = (r, i) -> new Valuation(r.getLong(1), r.getLong(2), r.getBigDecimal(3),
        r.getObject(4, LocalDate.class), r.getLong(5), r.getObject(6, LocalDateTime.class));
    private static final RowMapper<Movement> MOVEMENT = (r, i) -> new Movement(r.getLong(1), r.getLong(2), MovementType.valueOf(r.getString(3)),
        r.getBigDecimal(4), r.getObject(5, LocalDate.class), r.getString(6), r.getLong(7), r.getLong(8), r.getObject(9, LocalDateTime.class));

    private Investment investment(ResultSet r, int row) throws SQLException {
        Long valuationId = r.getObject("valuation_id", Long.class);
        Valuation last = valuationId == null ? null : new Valuation(valuationId, r.getLong("id"), r.getBigDecimal("valuation_amount"),
            r.getObject("valued_on", LocalDate.class), r.getLong("valuation_version"), r.getObject("valuation_created_at", LocalDateTime.class));
        PositionStatus status = PositionStatus.valueOf(r.getString("status"));
        BigDecimal position = status == PositionStatus.VALUED || status == PositionStatus.ESTIMATED ? r.getBigDecimal("estimate") : null;
        return new Investment(r.getLong("id"), r.getString("name"), AssetClass.valueOf(r.getString("asset_class")), r.getLong("version"),
            position, status, last, r.getObject("created_at", LocalDateTime.class));
    }

    private static String name(String name) {
        if (name == null || name.strip().isEmpty() || name.strip().length() > 120 || name.chars().anyMatch(Character::isISOControl))
            throw fail("INVALID_REQUEST", "name", "Informe um nome de até 120 caracteres.");
        return name.strip();
    }
    private static String description(String description) {
        if (description == null || description.isBlank()) return null;
        if (description.chars().anyMatch(Character::isISOControl)) throw fail("INVALID_REQUEST", "description", "Descrição inválida.");
        return description.strip();
    }
    private static void date(LocalDate date, String field) {
        if (date.getYear() < 1 || date.getYear() > 9999) throw fail("INVALID_REQUEST", field, "Use uma data entre 0001 e 9999.");
    }
    private LocalDate today() { return LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE)); }
    private LocalDateTime now() { return LocalDateTime.ofInstant(clock.instant(), ProductClockConfiguration.ZONE); }
    private WorkDomainException investmentNotFound() { return fail("NOT_FOUND", null, "Aplicação não encontrada."); }
    private static WorkDomainException fail(String code, String field, String message) { return new WorkDomainException(code, field, message); }
}
