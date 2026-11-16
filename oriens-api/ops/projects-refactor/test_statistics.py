#!/usr/bin/env python3
"""Statistics proof: an owned disposable PostgreSQL, sealed additive migration and real MVC/JWT tests."""
import argparse
import contextlib
import io
import os
from pathlib import Path
import subprocess
import time
import uuid
import db
import task_labels
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'mcp-account'))
import migrate as mcp_revision
import work as mcp_work_revision
import finance as finance_revision
import statistics as revision


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='store_true')
    options = parser.parse_args()
    api = Path(__file__).resolve().parents[2]
    name = 'oriens-statistics-' + uuid.uuid4().hex[:12]
    subprocess.run(['docker','run','--detach','--name',name,'--publish','127.0.0.1::5432',
                    '--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:15-alpine'],check=True)
    try:
        for _ in range(60):
            if subprocess.run(['docker','exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0: break
            time.sleep(.25)
        else: raise RuntimeError('Disposable PostgreSQL did not start')
        args=argparse.Namespace(container=name,host='localhost',port=5432,user='postgres',database='postgres')
        database=db.Database(args)
        database.sql('CREATE DATABASE oriens_p2_proof;')
        args.database='oriens_p2_proof'
        database=db.Database(args)
        with contextlib.redirect_stdout(io.StringIO()):
            db.apply(database)
            task_labels.apply(database)
        # Complete rollback of new DDL; never leaves a partially evolved seal.
        before=database.sql(db.CATALOG)
        database.sql("""
          INSERT INTO users(name,email,password,created_at,role) VALUES ('Migration QA','migration@example.invalid','synthetic',now(),'USER');
          INSERT INTO tags(user_id,name,color,is_default,allow_negative,created_at) SELECT id,'Migration QA','#781336',false,true,now() FROM users;
          INSERT INTO financial_entry(user_id,tag_id,amount,entry_date,description,is_recurring,created_at)
            SELECT user_id,id,-1,'2026-01-01','Parent',true,now() FROM tags;
          INSERT INTO financial_entry(user_id,tag_id,amount,entry_date,description,is_recurring,parent_entry_id,created_at)
            SELECT user_id,tag_id,-1,'2026-02-01','Duplicate',false,id,now() FROM financial_entry WHERE description='Parent';
          INSERT INTO financial_entry(user_id,tag_id,amount,entry_date,description,is_recurring,parent_entry_id,created_at)
            SELECT user_id,tag_id,amount,entry_date,description,is_recurring,parent_entry_id,created_at FROM financial_entry WHERE description='Duplicate';
        """)
        try: revision.apply(database)
        except subprocess.CalledProcessError: pass
        else: raise AssertionError('Legacy duplicate occurrences must refuse migration')
        assert database.sql(db.CATALOG)==before
        assert database.sql("SELECT count(*) FROM financial_entry")== '3'
        database.sql("DELETE FROM financial_entry WHERE parent_entry_id IS NOT NULL; DELETE FROM financial_entry; DELETE FROM tags; DELETE FROM users;")
        try: database.sql('BEGIN;'+(Path(__file__).parent/'statistics.sql').read_text()+'SELECT 1/0;COMMIT;')
        except subprocess.CalledProcessError: pass
        else: raise AssertionError('Expected rollback probe to fail')
        assert database.sql(db.CATALOG)==before
        with contextlib.redirect_stdout(io.StringIO()):
            revision.apply(database)
            revision.apply(database)
        with contextlib.redirect_stdout(io.StringIO()):
            mcp_revision.apply(database);mcp_work_revision.apply(database);finance_revision.apply(database)
        port=subprocess.check_output(['docker','port',name,'5432'],text=True).strip().rsplit(':',1)[1]
        env=dict(os.environ,P2_JDBC_URL=f'jdbc:postgresql://127.0.0.1:{port}/oriens_p2_proof')
        if options.browser: env['STATISTICS_BROWSER_PROOF']='1'
        subprocess.run(['mvn','-q','-Dtest=StatisticsPostgresTest,WorkApiPostgresTest','test'],cwd=api,env=env,check=True)
        with contextlib.redirect_stdout(io.StringIO()): finance_revision.apply(database)
        print('PASS statistics migration/repeat/rollback/seal, real JWT/PostgreSQL analysis, habits and finance tests.')
    finally:
        subprocess.run(['docker','rm','--force',name],check=True)


if __name__=='__main__':main()
