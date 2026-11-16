#!/usr/bin/env python3
"""Own disposable PostgreSQL, additive migration safety, real MVC/OAuth/MCP integration."""
import argparse
import contextlib
import io
import os
import socket
from pathlib import Path
import subprocess
import sys
import time
import uuid
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent/'projects-refactor'))
import db
import task_labels
import statistics
import migrate
import work
import finance

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--java17',action='store_true');parser.add_argument('--clients',action='store_true');parser.add_argument('--browser',action='store_true');parser.add_argument('--p2',action='store_true',help='Include projects/objectives/tasks and inherited P0/P1 tests');parser.add_argument('--p4',action='store_true',help='Include complete experience and inherited P3/P2/P0/P1 tests');parser.add_argument('--p3',action='store_true',help='Include finance and inherited P2/P0/P1 tests');options=parser.parse_args()
    if options.p4: options.p3=True
    if options.p3: options.p2=True
    tests='McpP2PostgresTest,McpDisabledSecurityTest,JwtConfigurationTest' if options.p2 else 'McpPostgresTest,McpDisabledSecurityTest,JwtConfigurationTest'
    if options.p3: tests='McpP3PostgresTest,McpDisabledSecurityTest,JwtConfigurationTest'
    if options.p4: tests='McpP4PostgresTest,McpDisabledSecurityTest,JwtConfigurationTest'
    if (options.clients or options.browser) and options.java17:parser.error('--clients requires locally installed CLIs; run separately from --java17')
    name='oriens-mcp-'+uuid.uuid4().hex[:12]
    subprocess.run(['docker','run','--detach','--name',name,'--publish','127.0.0.1::5432','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:15-alpine'],check=True)
    try:
        for _ in range(120):
            if subprocess.run(['docker','exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:break
            time.sleep(.25)
        else:raise RuntimeError('Disposable PostgreSQL did not start')
        args=argparse.Namespace(container=name,host='localhost',port=5432,user='postgres',database='postgres')
        database=db.Database(args);database.sql('CREATE DATABASE oriens_mcp_proof;');args.database='oriens_mcp_proof';database=db.Database(args)
        with contextlib.redirect_stdout(io.StringIO()):
            db.apply(database);task_labels.apply(database);statistics.apply(database)
        before=database.sql(db.CATALOG)
        try:database.sql('BEGIN;'+(ROOT/'mcp.sql').read_text()+'SELECT 1/0;COMMIT;')
        except subprocess.CalledProcessError:pass
        else:raise AssertionError('DDL rollback must fail')
        assert database.sql(db.CATALOG)==before
        with contextlib.redirect_stdout(io.StringIO()):migrate.apply(database);migrate.apply(database)
        database.sql('ALTER TABLE mcp_connections ADD COLUMN drift_probe boolean;')
        try:migrate.apply(database)
        except subprocess.CalledProcessError:pass
        else:raise AssertionError('Drift must refuse migration')
        database.sql('ALTER TABLE mcp_connections DROP COLUMN drift_probe;')
        with contextlib.redirect_stdout(io.StringIO()):migrate.apply(database)
        # Current application validates the complete additive schema.
        before=database.sql(db.CATALOG)
        try:database.sql('BEGIN;'+(ROOT/'work.sql').read_text()+'SELECT 1/0;COMMIT;')
        except subprocess.CalledProcessError:pass
        else:raise AssertionError('P2 DDL rollback must fail')
        assert database.sql(db.CATALOG)==before
        with contextlib.redirect_stdout(io.StringIO()):work.apply(database);work.apply(database)
        database.sql('ALTER TABLE creation_receipts ADD COLUMN p2_drift_probe boolean;')
        try:work.apply(database)
        except subprocess.CalledProcessError:pass
        else:raise AssertionError('P2 drift must refuse migration')
        database.sql('ALTER TABLE creation_receipts DROP COLUMN p2_drift_probe;')
        with contextlib.redirect_stdout(io.StringIO()):work.apply(database)
        database.sql("""
            INSERT INTO users(name,email,password,created_at,role) VALUES ('P3 migration fixture','p3-migration@example.invalid','synthetic',now(),'USER');
            INSERT INTO tags(user_id,name,color,is_default,allow_negative,created_at) SELECT id,'P3 migration','#781336',false,true,now() FROM users;
            INSERT INTO financial_entry(user_id,tag_id,amount,entry_date,description,is_recurring,created_at,recurrence_pattern)
                SELECT user_id,id,-0.01,current_date-1,'P3 preserved parent',true,now(),'DAILY' FROM tags;
            INSERT INTO financial_entry(user_id,tag_id,amount,entry_date,description,is_recurring,created_at,parent_entry_id)
                SELECT user_id,tag_id,-0.01,current_date,'P3 preserved child',false,now(),id FROM financial_entry WHERE description='P3 preserved parent';
            INSERT INTO financial_occurrences SELECT parent_entry_id,entry_date,id FROM financial_entry WHERE parent_entry_id IS NOT NULL;
        """)
        history=database.sql("select to_jsonb(e)-'version' from financial_entry e order by id")
        claims=database.sql("select to_jsonb(c) from financial_occurrences c order by parent_entry_id,entry_date")
        before=database.sql(db.CATALOG)
        try:database.sql('BEGIN;'+(ROOT/'finance.sql').read_text()+'SELECT 1/0;COMMIT;')
        except subprocess.CalledProcessError:pass
        else:raise AssertionError('P3 DDL rollback must fail')
        assert database.sql(db.CATALOG)==before
        with contextlib.redirect_stdout(io.StringIO()):finance.apply(database);finance.apply(database)
        database.sql('ALTER TABLE financial_entry ADD COLUMN p3_drift_probe boolean;')
        try:finance.apply(database)
        except subprocess.CalledProcessError:pass
        else:raise AssertionError('P3 drift must refuse migration')
        database.sql('ALTER TABLE financial_entry DROP COLUMN p3_drift_probe;')
        with contextlib.redirect_stdout(io.StringIO()):finance.apply(database)
        assert database.sql("select to_jsonb(e)-'version' from financial_entry e order by id")==history
        assert database.sql("select to_jsonb(c) from financial_occurrences c order by parent_entry_id,entry_date")==claims
        assert database.sql('select count(*) from financial_entry where version=0')=='2'
        database.sql('TRUNCATE users RESTART IDENTITY CASCADE;')
        port=subprocess.check_output(['docker','port',name,'5432'],text=True).strip().rsplit(':',1)[1]
        with socket.socket() as listener:
            listener.bind(('127.0.0.1',0));http_port=listener.getsockname()[1]
        with socket.socket() as listener:
            listener.bind(('127.0.0.1',0));frontend_port=listener.getsockname()[1]
        env=dict(os.environ,MCP_JDBC_URL=f'jdbc:postgresql://127.0.0.1:{port}/oriens_mcp_proof',MCP_HTTP_PORT=str(http_port),MCP_FRONTEND_PORT=str(frontend_port))
        env['P1_JDBC_URL']=env['MCP_JDBC_URL'];env['P2_JDBC_URL']=env['MCP_JDBC_URL']
        if options.p2:env['MCP_P2_PROOF']='1'
        if options.clients:env['MCP_CLIENT_PROOF']='1'
        if options.browser:env['MCP_BROWSER_PROOF']='1'
        if options.p4:env['MCP_P4_PROOF']='1'
        if options.browser and options.p4:env['MCP_P4_BROWSER_PROOF']='1'
        elif options.browser and options.p3:env['MCP_P3_BROWSER_PROOF']='1'
        def run_suites(selected):
            if options.java17:
                subprocess.run(['docker','run','--rm','--network','container:'+name,
                    '--mount',f'type=bind,src={ROOT.parents[1]},dst=/workspace',
                    '--mount',f'type=bind,src={Path.home()/".m2"},dst=/root/.m2',
                    '--workdir','/workspace','-e','MCP_JDBC_URL=jdbc:postgresql://127.0.0.1:5432/oriens_mcp_proof',
                    '-e','P1_JDBC_URL=jdbc:postgresql://127.0.0.1:5432/oriens_mcp_proof','-e','P2_JDBC_URL=jdbc:postgresql://127.0.0.1:5432/oriens_mcp_proof',
                    'maven:3.9.9-eclipse-temurin-17','mvn','-q','-Dtest='+selected,'test'],check=True)
            else:
                subprocess.run(['mvn','-q','-Dtest='+selected,'test'],cwd=ROOT.parents[1],env=env,check=True)
        run_suites(tests)
        if options.p3:
            # Isolate fixed-clock/global scheduler regression fixtures from the P3 account fixtures.
            # This database exists only in the disposable container created by this runner.
            database.sql('TRUNCATE users RESTART IDENTITY CASCADE;')
            run_suites('StatisticsPostgresTest,WorkApiPostgresTest,ProjectWorkPostgresTest')
        with contextlib.redirect_stdout(io.StringIO()):finance.apply(database)
        print('PASS MCP migration/repeat/drift/rollback/catalog, OAuth/PKCE/refresh, grants, management, isolation, audit and limits.')
    finally:subprocess.run(['docker','rm','--force',name],check=True)
if __name__=='__main__':main()
