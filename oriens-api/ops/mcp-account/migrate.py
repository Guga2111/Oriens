#!/usr/bin/env python3
"""MCP additive migration. Explicit target, sealed previous revision, no reset/startup DDL."""
import argparse
import hashlib
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / 'projects-refactor'))
import db
import statistics as previous
VERSION = 'oriens-mcp-account-v1'

def apply(database):
    old = ROOT.parent / 'projects-refactor' / 'statistics.sql'
    old_hash = hashlib.sha256(old.read_bytes()).hexdigest()
    if old_hash != old.with_suffix('.sha256').read_text().split()[0]:
        raise ValueError('Previous migration checksum mismatch')
    raw = (ROOT / 'mcp.sql').read_bytes()
    checksum = hashlib.sha256(raw).hexdigest()
    if checksum != (ROOT / 'mcp.sha256').read_text().split()[0]:
        raise ValueError('MCP migration checksum mismatch')
    database.sql(rf"""
BEGIN;
SELECT pg_advisory_xact_lock(1768900123);
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT count(*)=1 AND bool_and(version='{VERSION}' AND sql_sha256='{checksum}'
 AND catalog_md5=({db.CATALOG})) AS current FROM oriens_schema_baseline \gset
\if :current
\else
 SELECT count(*)=1 AND bool_and(version='{previous.VERSION}' AND sql_sha256='{old_hash}'
 AND catalog_md5=({db.CATALOG})) AS previous FROM oriens_schema_baseline \gset
 \if :previous
  SET LOCAL search_path=public;
  {raw.decode()}
  UPDATE oriens_schema_baseline SET version='{VERSION}',sql_sha256='{checksum}',
   catalog_md5=({db.CATALOG}),installed_at=current_timestamp;
 \else
  DO $$ BEGIN RAISE EXCEPTION 'Schema version/checksum/catalog mismatch; refusing MCP migration'; END $$;
 \endif
\endif
COMMIT;
""")
    print(f'Verified {VERSION}: checksum and catalog match')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--container')
    for field in ('host','port','database','user'):
        parser.add_argument('--'+field,required=True,type=int if field=='port' else str)
    apply(db.Database(parser.parse_args()))
