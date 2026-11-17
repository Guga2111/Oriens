#!/usr/bin/env python3
"""Explicit PostgreSQL backup/restore/inventory. Schema is installed by Flyway at API startup.
No reset command; no target inferred from environment."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
EMPTY = """
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema')
 OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema')
 OR EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
            WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema')
 THEN RAISE EXCEPTION 'Database is not empty; refusing installation/restore'; END IF;
END $$;
"""


class Database:
    def __init__(self, args):
        self.args = args
        self.prefix = ["docker", "exec", "-i", args.container] if args.container else []
        self.connection = ["--host", args.host, "--port", str(args.port),
                           "--username", args.user, "--dbname", args.database]

    def run(self, binary, options=(), data=None, stdin=None, stdout=subprocess.PIPE):
        return subprocess.run(self.prefix + [binary] + self.connection + list(options),
                              input=data, stdin=stdin, stdout=stdout,
                              stderr=subprocess.PIPE, check=True).stdout

    def sql(self, sql):
        return self.run("psql", ["-X", "--no-password", "-v", "ON_ERROR_STOP=1", "-At"],
                        sql.encode()).decode().strip()


def file_checksum(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def inventory(db):
    # Quote identifiers on the server; only print names and counts.
    sql = db.sql("""SELECT format('SELECT %L AS table_name, count(*) AS rows FROM %I.%I',
      schemaname || '.' || tablename, schemaname, tablename)
      FROM pg_tables WHERE schemaname='public' ORDER BY tablename;""")
    return db.sql(" UNION ALL ".join(sql.splitlines()) + ";") if sql else ""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["inventory", "backup", "restore"])
    parser.add_argument("--container", help="Run PostgreSQL client inside this explicit container")
    for field in ("host", "database", "user"):
        parser.add_argument("--" + field, required=True)
    parser.add_argument("--port", required=True, type=int)
    parser.add_argument("--file", type=Path)
    parser.add_argument("--confirm-restore", help="Exact target database name; isolated empty DB only")
    args = parser.parse_args()
    db = Database(args)
    if args.action == "inventory":
        print(inventory(db))
    elif args.action == "backup":
        if args.file is None:
            parser.error("backup requires --file (new path outside the database volume)")
        # All schemas/data/sequence states; never --clean. No role passwords or data in logs.
        metadata_path = Path(str(args.file) + ".json")
        if metadata_path.exists():
            raise ValueError("Backup metadata path already exists")
        fd = os.open(args.file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as dest:
            db.run("pg_dump", ["--no-password", "--format=custom", "--no-owner", "--no-privileges"],
                   stdout=dest)
        metadata = {"sha256": file_checksum(args.file),
                    "counts": inventory(db), "serverVersion": db.sql("SHOW server_version;"),
                    "database": args.database}
        # Maintenance/no writers is a precondition for counts to describe the snapshot.
        fd = os.open(metadata_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as dest:
            json.dump(metadata, dest, indent=2)
        print("Backup saved with SHA-256 and table counts; restore rehearsal still required")
    else:
        if args.file is None or args.confirm_restore != args.database:
            parser.error("restore requires --file and --confirm-restore EXACT_DATABASE_NAME")
        metadata = json.loads(Path(str(args.file) + ".json").read_text())
        if not isinstance(metadata, dict) or not all(
            isinstance(metadata.get(key), str)
            for key in ('sha256', 'counts', 'serverVersion', 'database')
        ):
            raise ValueError("Invalid backup metadata")
        if file_checksum(args.file) != metadata["sha256"]:
            raise ValueError("Backup checksum mismatch")
        db.sql(EMPTY)
        # No --clean/--create: cannot drop/overwrite an existing database. Failed restores roll back.
        with args.file.open('rb') as source:
            db.run("pg_restore", ["--no-password", "--single-transaction", "--exit-on-error",
                                  "--no-owner", "--no-privileges"], stdin=source)
        if inventory(db) != metadata["counts"]:
            raise ValueError("Restored counts differ; do not release this database")
        print("Restored into empty target; every table count matches the backup")


if __name__ == "__main__":
    try:
        main()
    except ValueError as exc:
        print(f"Database operation refused: {exc}", file=sys.stderr)
        sys.exit(1)
    except (OSError, subprocess.CalledProcessError) as exc:
        # Do not print command arguments/environment or dump data on failure.
        reason = type(exc).__name__
        if isinstance(exc, subprocess.CalledProcessError):
            for safe in (b'Database is not empty; refusing installation/restore',):
                if safe in (exc.stderr or b''):
                    reason = safe.decode()
        print(f"Database operation failed ({reason}); no automatic retry", file=sys.stderr)
        sys.exit(1)
