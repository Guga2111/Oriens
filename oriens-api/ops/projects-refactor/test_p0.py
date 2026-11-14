#!/usr/bin/env python3
"""P0 PostgreSQL proof. Creates/removes only its own networkless, tmpfs container."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import contextlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest.mock import patch
import uuid

import db

CONTAINER = None


class P0PostgresTest(unittest.TestCase):
    def setUp(self):
        self.name = 'p0_' + uuid.uuid4().hex
        self.args = argparse.Namespace(container=CONTAINER, host='localhost', port=5432,
                                       user='postgres', database=self.name)
        admin = db.Database(argparse.Namespace(**(vars(self.args) | {'database': 'postgres'})))
        admin.sql(f'CREATE DATABASE {self.name};')
        self.db = db.Database(self.args)

    def install(self):
        with contextlib.redirect_stdout(io.StringIO()):
            db.apply(self.db)

    def cli(self, action, file, target=None):
        args = [action, '--container', CONTAINER, '--host', 'localhost', '--port', '5432',
                '--user', 'postgres', '--database', self.name, '--file', str(file)]
        if target:
            args += ['--confirm-restore', target]
        with patch('sys.argv', ['db.py'] + args), contextlib.redirect_stdout(io.StringIO()), \
                contextlib.redirect_stderr(io.StringIO()):
            db.main()

    def test_install_repeat_and_every_entity(self):
        self.install()
        before = self.db.sql(db.CATALOG)
        self.install()
        self.assertEqual(before, self.db.sql(db.CATALOG))
        tables = self.db.sql("SELECT tablename FROM pg_tables WHERE schemaname='public';")
        self.assertEqual(set(tables.splitlines()), {
            'users', 'password_reset_token', 'tags', 'financial_entry', 'notifications',
            'support_tickets', 'project', 'project_objectives', 'project_columns', 'tasks',
            'creation_receipts', 'oriens_schema_baseline'})

    def test_concurrent_installers_serialize(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda _: db.apply(self.db), range(2)))
        self.assertEqual('1', self.db.sql('SELECT count(*) FROM oriens_schema_baseline;'))

    def test_observed_schema_is_rejected_without_mutation(self):
        self.db.sql((db.ROOT / 'observed-schema.sql').read_text())
        before = self.db.sql(db.CATALOG)
        with self.assertRaises(subprocess.CalledProcessError):
            self.install()
        self.assertEqual(before, self.db.sql(db.CATALOG))

    def test_schema_drift_and_wrong_version_are_rejected(self):
        self.install()
        self.db.sql('ALTER TABLE tasks ADD COLUMN unexpected text;')
        with self.assertRaises(subprocess.CalledProcessError):
            self.install()
        self.db.sql("ALTER TABLE tasks DROP COLUMN unexpected; UPDATE oriens_schema_baseline SET version='wrong';")
        with self.assertRaises(subprocess.CalledProcessError):
            self.install()

    def test_ddl_failure_rolls_back_everything(self):
        ddl, checksum = db.baseline()
        with patch.object(db, 'baseline', return_value=(ddl + '\nINVALID SQL;', checksum)):
            with self.assertRaises(subprocess.CalledProcessError):
                self.install()
        self.assertEqual('', self.db.sql("SELECT tablename FROM pg_tables WHERE schemaname='public';"))

    def test_checksum_is_verified_before_connecting(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'baseline.sql').write_text('tampered')
            (root / 'baseline.sha256').write_text('wrong')
            with patch.object(db, 'ROOT', root), self.assertRaises(ValueError):
                self.install()

    def fixture(self):
        self.install()
        self.db.sql("""
INSERT INTO users(id,name,email,password,created_at,role) VALUES
 (1,'Fixture A','a@example.invalid','not-a-login-hash',now(),'USER'),
 (2,'Fixture B','b@example.invalid','not-a-login-hash',now(),'USER');
INSERT INTO project(id,user_id,title,mode) VALUES (1,1,'Ensaio','DEVELOPMENT'),(2,2,'Outro','DEVELOPMENT');
INSERT INTO project_columns(id,project_id,name,kind,position) VALUES
 (1,1,'A fazer','PENDING',0),(2,1,'Concluídas','CONCLUDED',1),(3,2,'A fazer','PENDING',0);
UPDATE project SET default_pending_column_id=1,default_completed_column_id=2 WHERE id=1;
INSERT INTO project_objectives(id,project_id,title,position) VALUES (1,1,'Resultado',0),(2,2,'Outro',0);
INSERT INTO tasks(user_id,project_id,column_id,objective_id,position,title,created_at)
 VALUES (1,1,1,1,0,'Sem agenda',now());
INSERT INTO tasks(user_id,title,status,completed_at,planned_date,due_date,created_at)
 VALUES (1,'Concluída','CONCLUDED','2026-11-13','2026-11-12','2026-11-20',now()),
 (1,'Cancelada','CANCELLED',null,null,null,now());
INSERT INTO tags(id,user_id,name,color,is_default,allow_negative,created_at)
 VALUES (1,1,'Fixture','#123456',false,true,now());
INSERT INTO financial_entry(user_id,tag_id,amount,description,entry_date,is_recurring,created_at)
 VALUES(1,1,12.34,'Fixture','2026-11-13',false,now());
INSERT INTO notifications(user_id,message,is_read,created_at) VALUES(1,'Fixture',false,now());
INSERT INTO support_tickets(user_id,subject,message,user_email,status,created_at)
 VALUES(1,'Fixture','Fixture','a@example.invalid','OPEN',now());
INSERT INTO password_reset_token(id,user_id,token,expiry_date)
 VALUES(nextval('password_reset_token_seq'),1,'synthetic-not-valid',now());
INSERT INTO creation_receipts(user_id,operation,idempotency_key,payload_sha256,resource_id,
 response_status,response_body,resource_version,created_at,expires_at)
 VALUES(1,'task:create','00000000-0000-4000-8000-000000000001',repeat('a',64),1,201,
 '{"id":1}',0,now(),now()+interval '24 hours');
""")

    def test_constraints_ownership_dates_and_restrict(self):
        self.fixture()
        invalid = [
            "UPDATE tasks SET user_id=2 WHERE id=1",
            "UPDATE tasks SET objective_id=2 WHERE id=1",
            "UPDATE tasks SET column_id=3 WHERE id=1",
            "UPDATE tasks SET status='CONCLUDED',completed_at=current_date WHERE id=1",
            "UPDATE tasks SET start_time='12:00' WHERE id=1",
            "UPDATE tasks SET planned_date=current_date,start_time='24:00' WHERE id=1",
            "UPDATE tasks SET project_id=null WHERE id=1",
            "UPDATE tasks SET completed_at=current_date WHERE id=1",
            "UPDATE tasks SET title='   ' WHERE id=1",
            "UPDATE tasks SET due_date='2026-02-29' WHERE id=1",
            "UPDATE project SET default_pending_column_id=3 WHERE id=1",
            "UPDATE project_objectives SET status='ON_DOING' WHERE id=1",
            "INSERT INTO project_columns(project_id,name,kind,position) VALUES(1,' a FAZER ','PENDING',2)",
            "DELETE FROM project WHERE id=1", "DELETE FROM project_columns WHERE id=1",
            "DELETE FROM project_objectives WHERE id=1",
        ]
        for sql in invalid:
            with self.subTest(sql=sql), self.assertRaises(subprocess.CalledProcessError):
                self.db.sql(sql)
        # Data does not change the catalog seal; detached tasks retain execution fields.
        self.db.sql("UPDATE tasks SET project_id=null,column_id=null,objective_id=null,position=null,version=version+1 WHERE id=1;")
        self.install()
        self.assertEqual('3', self.db.sql('SELECT count(*) FROM tasks;'))

    def test_backup_restore_all_tables_sequences_and_seal(self):
        self.fixture()
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'rehearsal.dump'
            self.cli('backup', archive)
            counts = db.inventory(self.db)
            source = self.db
            self.setUp()  # a second, empty database in the SAME isolated container
            self.cli('restore', archive, self.name)
            self.assertEqual(counts, db.inventory(self.db))
            self.install()  # restored seal remains valid under a different database name
            self.assertEqual(source.sql("SELECT last_value FROM tasks_id_seq;"),
                             self.db.sql("SELECT last_value FROM tasks_id_seq;"))
            self.assertEqual('12.34', self.db.sql('SELECT amount FROM financial_entry;'))
            # Never overwrite a populated target, even with an explicit marker.
            with self.assertRaises(subprocess.CalledProcessError):
                self.cli('restore', archive, self.name)

    def test_legacy_backup_restore_for_rollback(self):
        self.db.sql((db.ROOT / 'observed-schema.sql').read_text())
        self.db.sql("""INSERT INTO users(name,email,password,role,created_at)
 VALUES('Fixture','rollback@example.invalid','not-a-login-hash','USER',now());
 INSERT INTO project(user_id,title,is_favorite) VALUES(1,'Legado',false);
 INSERT INTO project_objectives(project_id,title,completed,status) VALUES(1,'Objetivo',false,0);
 SELECT nextval('password_reset_token_seq');""")
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'legacy.dump'
            self.cli('backup', archive)
            source_catalog = self.db.sql(db.CATALOG)
            self.setUp()
            self.cli('restore', archive, self.name)
            self.assertEqual(source_catalog, self.db.sql(db.CATALOG))
            self.assertEqual('Legado', self.db.sql('SELECT title FROM project;'))
            self.assertEqual('1', self.db.sql('SELECT last_value FROM password_reset_token_seq;'))

    def test_restore_checksum_and_confirmation(self):
        self.install()
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'backup.dump'
            self.cli('backup', archive)
            with self.assertRaises(SystemExit):
                self.cli('restore', archive, 'different-target')
            archive.write_bytes(archive.read_bytes() + b'tamper')
            self.setUp()
            with self.assertRaises(ValueError):
                self.cli('restore', archive, self.name)
            self.assertEqual('', db.inventory(self.db))
            Path(str(archive) + '.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'Invalid backup metadata'):
                self.cli('restore', archive, self.name)

    def test_interrupted_restore_rolls_back(self):
        self.fixture()
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'truncated.dump'
            self.cli('backup', archive)
            data = archive.read_bytes()
            archive.write_bytes(data[:len(data) * 9 // 10])
            sidecar = Path(str(archive) + '.json')
            metadata = json.loads(sidecar.read_text())
            # Deliberately emulate a structurally broken archive with a matching file hash.
            metadata['sha256'] = db.file_checksum(archive)
            sidecar.write_text(json.dumps(metadata))
            self.setUp()
            with self.assertRaises(subprocess.CalledProcessError):
                self.cli('restore', archive, self.name)
            self.assertEqual('', db.inventory(self.db))


if __name__ == '__main__':
    name = 'oriens-p0-' + uuid.uuid4().hex[:12]
    # No published ports, network, shared volume, app or external database connection.
    CONTAINER = subprocess.check_output([
        'docker', 'run', '-d', '--name', name, '--network', 'none',
        '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
        'postgres:15-alpine'], text=True).strip()
    try:
        for attempt in range(100):
            ready = subprocess.run(['docker', 'exec', CONTAINER, 'pg_isready', '-h', 'localhost', '-U', 'postgres'],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if ready.returncode == 0:
                break
            time.sleep(0.1)
        else:
            raise RuntimeError('Isolated PostgreSQL did not become ready')
        print(subprocess.check_output(['docker', 'exec', CONTAINER, 'postgres', '--version'],
                                      text=True).strip(), flush=True)
        unittest.main(verbosity=2)
    finally:
        subprocess.run(['docker', 'rm', '-f', CONTAINER], stdout=subprocess.DEVNULL, check=True)
