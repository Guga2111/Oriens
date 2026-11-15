#!/usr/bin/env python3
"""Migration proof in an owned disposable PostgreSQL. Never touches a shared database."""
import argparse
import contextlib
import io
import subprocess
import time
import uuid
from pathlib import Path
import db
import task_labels


def rejected(action):
    try:
        action()
    except subprocess.CalledProcessError:
        return
    raise AssertionError('Expected PostgreSQL to reject the operation')


def main():
    name = 'oriens-labels-' + uuid.uuid4().hex[:12]
    subprocess.run(['docker','run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data',
                    '-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:15-alpine'],check=True,stdout=subprocess.DEVNULL)
    try:
        for _ in range(60):
            if subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode == 0:
                break
            time.sleep(.25)
        else:
            raise RuntimeError('Disposable PostgreSQL did not start')
        args = argparse.Namespace(container=name,host='localhost',port=5432,database='postgres',user='postgres')
        database = db.Database(args)
        with contextlib.redirect_stdout(io.StringIO()):
            db.apply(database)
        previous = database.sql(db.CATALOG)
        ddl = (Path(__file__).parent/'task-labels.sql').read_text()
        rejected(lambda: database.sql('BEGIN;'+ddl+'SELECT 1/0;COMMIT;'))
        assert database.sql(db.CATALOG) == previous, 'DDL failure must roll back the complete migration'
        a = database.sql("INSERT INTO users(name,email,password,created_at,role) VALUES ('QA','a@example.invalid','synthetic',now(),'USER') RETURNING id")
        b = database.sql("INSERT INTO users(name,email,password,created_at,role) VALUES ('QA','b@example.invalid','synthetic',now(),'USER') RETURNING id")
        # psql also prints a command tag; consume only the returned scalar.
        a, b = a.splitlines()[0], b.splitlines()[0]
        task = database.sql(f"INSERT INTO tasks(user_id,title,created_at) VALUES ({a},'Preservada',now()) RETURNING id").splitlines()[0]
        with contextlib.redirect_stdout(io.StringIO()):
            task_labels.apply(database)
            task_labels.apply(database)
        assert database.sql(f"SELECT title FROM tasks WHERE id={task}") == 'Preservada'
        label = database.sql(f"INSERT INTO task_labels(user_id,name,color) VALUES ({a},'API','BLUE') RETURNING id").splitlines()[0]
        foreign = database.sql(f"INSERT INTO task_labels(user_id,name,color) VALUES ({b},'Privada','GREEN') RETURNING id").splitlines()[0]
        rejected(lambda: database.sql(f"INSERT INTO task_label_assignments(task_id,label_id,user_id) VALUES ({task},{foreign},{a})"))
        rejected(lambda: database.sql(f"INSERT INTO task_labels(user_id,name,color) VALUES ({a},'api','RED')"))
        database.sql(f"INSERT INTO task_label_assignments(task_id,label_id,user_id) VALUES ({task},{label},{a})")
        rejected(lambda: database.sql(f"DELETE FROM task_labels WHERE id={label}"))
        database.sql(f"DELETE FROM tasks WHERE id={task}")
        assert database.sql('SELECT count(*) FROM task_label_assignments') == '0'
        assert database.sql(f'SELECT count(*) FROM task_labels WHERE id={label}') == '1'
        database.sql('CREATE TABLE accidental_drift(id bigint)')
        rejected(lambda: task_labels.apply(database))
        database.sql('DROP TABLE accidental_drift')
        with contextlib.redirect_stdout(io.StringIO()):
            task_labels.apply(database)
        print('PASS additive migration, repeat, complete DDL rollback, drift refusal, preserved rows, owner FKs, names, task-only cascade.')
    finally:
        subprocess.run(['docker','rm','--force',name],check=True,stdout=subprocess.DEVNULL)


if __name__ == '__main__':
    main()
