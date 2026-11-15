#!/usr/bin/env python3
"""Explicit additive statistics revision. Requires a literal target; never resets a database."""
import argparse
import hashlib
from pathlib import Path
import db
import task_labels

ROOT = Path(__file__).resolve().parent
VERSION = 'oriens-statistics-v1'


def apply(database):
    previous_checksum = hashlib.sha256((ROOT / 'task-labels.sql').read_bytes()).hexdigest()
    if previous_checksum != (ROOT / 'task-labels.sha256').read_text().split()[0]:
        raise ValueError('Previous revision checksum mismatch')
    raw = (ROOT / 'statistics.sql').read_bytes()
    checksum = hashlib.sha256(raw).hexdigest()
    if checksum != (ROOT / 'statistics.sha256').read_text().split()[0]:
        raise ValueError('Statistics migration checksum mismatch')
    database.sql(rf"""
BEGIN;
SELECT pg_advisory_xact_lock(1768900123);
SELECT count(*)=1 AND bool_and(version='{VERSION}' AND sql_sha256='{checksum}'
 AND catalog_md5=({db.CATALOG})) AS current FROM oriens_schema_baseline \gset
\if :current
\else
 SELECT count(*)=1 AND bool_and(version='{task_labels.VERSION}' AND sql_sha256='{previous_checksum}'
 AND catalog_md5=({db.CATALOG})) AS previous FROM oriens_schema_baseline \gset
 \if :previous
  SET LOCAL search_path=public;
  {raw.decode()}
  UPDATE oriens_schema_baseline SET version='{VERSION}',sql_sha256='{checksum}',
   catalog_md5=({db.CATALOG}),installed_at=current_timestamp;
 \else
  DO $$ BEGIN RAISE EXCEPTION 'Schema version/checksum/catalog mismatch; refusing statistics migration'; END $$;
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
