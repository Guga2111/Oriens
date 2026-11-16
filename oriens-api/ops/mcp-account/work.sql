-- oriens-mcp-work-v1: reuse the durable ledger for creation, update and deletion.
-- Preserve historical REST 201 receipts, namespaces, hashes and tombstones.
ALTER TABLE creation_receipts DROP CONSTRAINT creation_receipts_response_status_check;
ALTER TABLE creation_receipts ADD CONSTRAINT creation_receipts_response_status_check
    CHECK (response_status IN (200,201));
