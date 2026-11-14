#!/usr/bin/env python3
"""JPA + PostgreSQL P1 proof. Own disposable database, synthetic fixtures, no shared DB reset.

Needs Docker, Maven and JDK 17+; downloads only pom-declared Maven dependencies if missing.
The temporary PostgreSQL port is bound exclusively to loopback and removed in finally.
"""
import argparse
import contextlib
import io
import os
from pathlib import Path
import subprocess
import time
import uuid

import db


def main():
    api = Path(__file__).resolve().parents[2]
    name = 'oriens-p1-' + uuid.uuid4().hex[:12]
    subprocess.run(['docker', 'run', '--detach', '--name', name,
                    '--publish', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data',
                    '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:15-alpine'], check=True)
    try:
        for _ in range(60):
            ready = subprocess.run(['docker', 'exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if ready.returncode == 0:
                break
            time.sleep(.25)
        else:
            raise RuntimeError('Disposable PostgreSQL did not start')
        args = argparse.Namespace(container=name, host='localhost', port=5432,
                                  user='postgres', database='postgres')
        db.Database(args).sql('CREATE DATABASE oriens_p1_proof;')
        args.database = 'oriens_p1_proof'
        with contextlib.redirect_stdout(io.StringIO()):
            db.apply(db.Database(args))
        endpoint = subprocess.check_output(['docker', 'port', name, '5432'], text=True).strip()
        port = endpoint.rsplit(':', 1)[1]
        env = dict(os.environ, P1_JDBC_URL=f'jdbc:postgresql://127.0.0.1:{port}/oriens_p1_proof')
        subprocess.run(['mvn', '-q', '-Dtest=ProjectWorkPostgresTest', 'test'], cwd=api, env=env, check=True)
        # Verify JPA validate and every mutation left the sealed SQL catalog unchanged.
        with contextlib.redirect_stdout(io.StringIO()):
            db.apply(db.Database(args))
        print('P1 PostgreSQL/JPA proof passed; baseline catalog seal unchanged.')
    finally:
        subprocess.run(['docker', 'rm', '--force', name], check=True)


if __name__ == '__main__':
    main()
