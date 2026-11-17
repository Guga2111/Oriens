-- oriens-mcp-finance-v1: additive, no history/backfill of occurrences or amounts.
ALTER TABLE financial_entry ADD COLUMN version bigint NOT NULL DEFAULT 0;
ALTER TABLE financial_entry ADD CONSTRAINT financial_entry_version_check CHECK (version >= 0);
