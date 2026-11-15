#!/usr/bin/env python3
"""Explicit additive task-label revision. No target inferred, reset, or baseline rewrite."""
import argparse
import hashlib
from pathlib import Path
import db

ROOT = Path(__file__).resolve().parent
VERSION = 'oriens-task-labels-v1'


def apply(database):
    _, previous_checksum = db.baseline()
    raw = (ROOT / 'task-labels.sql').read_bytes()
    checksum = hashlib.sha256(raw).hexdigest()
    if checksum != (ROOT / 'task-labels.sha256').read_text().split()[0]:
        raise ValueError('Task-label migration checksum mismatch')
    # Both versions and catalog seals are checked under the same installer lock/transaction.
    database.sql(rf"""
BEGIN;
SELECT pg_advisory_xact_lock(1768900123);
SELECT count(*) = 1 AND bool_and(version = '{VERSION}' AND sql_sha256 = '{checksum}'
 AND catalog_md5 = ({db.CATALOG})) AS current FROM oriens_schema_baseline \gset
\if :current
\else
 SELECT count(*) = 1 AND bool_and(version = '{db.VERSION}' AND sql_sha256 = '{previous_checksum}'
 AND catalog_md5 = ({db.CATALOG})) AS previous FROM oriens_schema_baseline \gset
 \if :previous
  SET LOCAL search_path = public;
  {raw.decode()}
  UPDATE oriens_schema_baseline SET version = '{VERSION}', sql_sha256 = '{checksum}',
    catalog_md5 = ({db.CATALOG}), installed_at = current_timestamp;
 \else
  DO $$ BEGIN RAISE EXCEPTION 'Schema version/checksum/catalog mismatch; refusing task-label migration'; END $$;
 \endif
\endif
COMMIT;
""")
    print(f'Verified {VERSION}: checksum and catalog match')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--container')
    for field in ('host', 'port', 'database', 'user'):
        parser.add_argument('--' + field, required=True, type=int if field == 'port' else str)
    apply(db.Database(parser.parse_args()))
