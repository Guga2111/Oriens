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

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--java17',action='store_true');parser.add_argument('--clients',action='store_true');parser.add_argument('--browser',action='store_true');options=parser.parse_args()
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
        port=subprocess.check_output(['docker','port',name,'5432'],text=True).strip().rsplit(':',1)[1]
        with socket.socket() as listener:
            listener.bind(('127.0.0.1',0));http_port=listener.getsockname()[1]
        with socket.socket() as listener:
            listener.bind(('127.0.0.1',0));frontend_port=listener.getsockname()[1]
        env=dict(os.environ,MCP_JDBC_URL=f'jdbc:postgresql://127.0.0.1:{port}/oriens_mcp_proof',MCP_HTTP_PORT=str(http_port),MCP_FRONTEND_PORT=str(frontend_port))
        if options.clients:env['MCP_CLIENT_PROOF']='1'
        if options.browser:env['MCP_BROWSER_PROOF']='1'
        if options.java17:
            subprocess.run(['docker','run','--rm','--network','container:'+name,
                '--mount',f'type=bind,src={ROOT.parents[1]},dst=/workspace',
                '--mount',f'type=bind,src={Path.home()/".m2"},dst=/root/.m2',
                '--workdir','/workspace','-e','MCP_JDBC_URL=jdbc:postgresql://127.0.0.1:5432/oriens_mcp_proof',
                'maven:3.9.9-eclipse-temurin-17','mvn','-q','-Dtest=McpPostgresTest,McpDisabledSecurityTest,JwtConfigurationTest','test'],check=True)
        else:
            subprocess.run(['mvn','-q','-Dtest=McpPostgresTest,McpDisabledSecurityTest,JwtConfigurationTest','test'],cwd=ROOT.parents[1],env=env,check=True)
        with contextlib.redirect_stdout(io.StringIO()):migrate.apply(database)
        print('PASS MCP migration/repeat/drift/rollback/catalog, OAuth/PKCE/refresh, grants, management, isolation, audit and limits.')
    finally:subprocess.run(['docker','rm','--force',name],check=True)
if __name__=='__main__':main()
