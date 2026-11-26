"""Exercise the versioned vhost on disposable Docker services and synthetic data."""

import base64
from email.parser import BytesHeaderParser
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time
from urllib.parse import parse_qs, urlencode, urlsplit
import uuid


ROOT = Path(__file__).resolve().parents[2]
HOST = "oriens.luisgosampaio.com"
ORIGIN = f"https://{HOST}"
ACTIVE = "/etc/nginx/sites-available/oriens"
TLS = f"/etc/letsencrypt/live/{HOST}"
INSTALLER = "/proof/install-nginx.sh"
VHOST = "/proof/oriens.conf"
ORIGINAL = f'server {{ listen 80; server_name {HOST}; return 200 "original"; }}'
VIDEO_LIMIT = 20 * 1024 * 1024


def docker(*args, data=None, check=True):
    return subprocess.run(["docker", *args], input=data, capture_output=True, check=check, timeout=85)


def wait_until(predicate):
    for _ in range(100):
        if predicate():
            return
        time.sleep(0.6)
    raise RuntimeError("Tempo esgotado aguardando o ambiente descartável.")


def mount(path, destination):
    return f"type=bind,src={ROOT / path},dst={destination},readonly"


class ProxyProof:
    def __init__(self, api_image, nginx_image):
        self.network = f"oriens-vhost-proof-{uuid.uuid4().hex[:10]}"
        self.db = f"{self.network}-db"
        self.api = f"{self.network}-api"
        self.nginx = f"{self.network}-nginx"
        self.api_image = api_image
        self.nginx_image = nginx_image

    def start(self):
        docker("network", "create", "--internal", self.network)
        docker("run", "-d", "--name", self.db, "--network", self.network, "--memory", "256m",
               "--tmpfs", "/var/lib/postgresql/data", "-e", "POSTGRES_PASSWORD=synthetic",
               "-e", "POSTGRES_DB=oriens_proxy_proof", "postgres:15-alpine")
        wait_until(lambda: docker("exec", self.db, "pg_isready", "-h", "127.0.0.1", "-U", "postgres",
                                  check=False).returncode == 0)
        docker("run", "-d", "--name", self.api, "--network", self.network, "--cpus", "1", "--memory", "512m",
               "-e", "SPRING_PROFILES_ACTIVE=prod", "-e", f"JWT_SECRET={'x' * 64}",
               "-e", f"DB_URL=jdbc:postgresql://{self.db}:5432/oriens_proxy_proof",
               "-e", "DB_USER=postgres", "-e", "DB_PASSWORD=synthetic",
               "-e", "ORIENS_MCP_ENABLED=true", "-e", f"ORIENS_MCP_ISSUER={ORIGIN}",
               "-e", f"ORIENS_MCP_FRONTEND={ORIGIN}", "-e", f"ORIENS_MCP_ENCRYPTIONPASSWORD={'y' * 40}",
               "-e", "ORIENS_MCP_CODEXREDIRECTS=http://127.0.0.1/callback",
               "-e", "ORIENS_MCP_CLAUDEREDIRECTS=http://localhost:8765/callback",
               "-e", f"ORIENS_MCP_ENCRYPTIONSALT={'ab' * 16}", self.api_image)
        wait_until(self.api_ready)
        setup = '''
            mkdir -p /var/www/oriens "$1"
            printf '<html>SPA sintética</html>' > /var/www/oriens/index.html
            printf 'ssl_protocols TLSv1.2 TLSv1.3;\n' > /etc/letsencrypt/options-ssl-nginx.conf
            openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=$2" \
                -addext "subjectAltName=DNS:$2" -keyout "$1/privkey.pem" -out "$1/fullchain.pem"
            openssl dhparam -dsaparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
            rm /etc/nginx/sites-enabled/default
            printf '%s\n' "$4" > "$3"
            ln -s "$3" /etc/nginx/sites-enabled/oriens
            exec nginx -g 'daemon off;'
        '''
        docker("run", "-d", "--name", self.nginx, "--network", f"container:{self.api}", "--memory", "160m",
               "--mount", mount("scripts/install-nginx.sh", INSTALLER),
               "--mount", mount("ops/nginx/oriens.conf", VHOST), self.nginx_image,
               "bash", "-ec", setup, "_", TLS, HOST, ACTIVE, ORIGINAL)
        wait_until(lambda: self.request("/", tls=False)[0] == 200)
        assert b"nginx/1.24.0 (Ubuntu)" in docker("exec", self.nginx, "nginx", "-v").stderr

    def api_ready(self):
        if docker("exec", self.api, "bash", "/app/healthcheck.sh", check=False).returncode == 0:
            return True
        if docker("inspect", "--format", "{{.State.Status}}", self.api).stdout.strip() == b"exited":
            logs = docker("logs", "--tail", "25", self.api)
            raise RuntimeError((logs.stdout + logs.stderr).decode())
        return False

    def stop(self):
        for name in (self.nginx, self.api, self.db):
            docker("rm", "-f", name, check=False)
        docker("network", "rm", self.network, check=False)

    def request(self, path, method="GET", data=None, headers=None, tls=True):
        headers = {"Expect": "", **(headers or {})}
        if isinstance(data, dict):
            data = json.dumps(data).encode()
            headers["Content-Type"] = "application/json"
        scheme, port = ("https", 443) if tls else ("http", 80)
        args = ["exec", "-i", self.nginx, "curl", "-sS", "-i", "--http1.1", "--noproxy", "*", "--max-time", "15",
                "--resolve", f"{HOST}:{port}:127.0.0.1", "--cacert", f"{TLS}/fullchain.pem", "-X", method]
        for name, value in headers.items():
            args.extend(("-H", f"{name}: {value}"))
        if data is not None:
            args.extend(("--data-binary", "@-"))
        response = docker(*args, f"{scheme}://{HOST}{path}", data=data, check=False)
        if response.returncode:
            return 0, {}, b""
        head, _, body = response.stdout.partition(b"\r\n\r\n")
        status_line, _, fields = head.partition(b"\r\n")
        return int(status_line.split()[1]), BytesHeaderParser().parsebytes(fields), body

    def expect(self, expected, path, **kwargs):
        status, headers, body = self.request(path, **kwargs)
        assert status == expected, (path.split("?")[0], status, expected)
        return headers, body

    def install(self, config, check=True):
        return docker("exec", "-i", self.nginx, "bash", INSTALLER, data=config, check=check)

    def routes(self):
        vhost = (ROOT / "ops/nginx/oriens.conf").read_bytes()
        first = self.install(vhost).stdout.decode().split()[-1].removesuffix(".")
        wait_until(lambda: self.request("/", tls=False)[0] == 301)
        redirect, _ = self.expect(301, "/config?mcpFlow=synthetic-http-query", tls=False)
        assert redirect["Location"] == ORIGIN + "/config?mcpFlow=synthetic-http-query"
        assert b"SPA sint" in self.expect(200, "/deep/link")[1]
        docker("exec", self.nginx, "mv", "/var/www/oriens/index.html", "/tmp/proof-index.html")
        self.expect(500, "/config?mcpFlow=synthetic-spa-error")
        docker("exec", self.nginx, "mv", "/tmp/proof-index.html", "/var/www/oriens/index.html")
        assert self.expect(401, "/api/user/me")[0]["Content-Type"].startswith("application/json")
        assert b"jvm_memory_used_bytes" not in self.expect(401, "/api/actuator/prometheus")[1]
        assert b"jvm_memory_used_bytes" in docker("exec", self.nginx, "curl", "-fsS", "--noproxy", "*",
                                                 "http://127.0.0.1:8081/actuator/prometheus").stdout
        assert b"synthetic-http-query" not in self.logs() and b"synthetic-spa-error" not in self.logs()
        return vhost, first

    def login(self):
        credentials = {"email": "proxy-proof@example.invalid", "password": "synthetic-password"}
        self.expect(201, "/api/user/register", method="POST", data={**credentials, "name": "Proxy Proof"})
        headers, _ = self.expect(200, "/api/authenticate", method="POST", data=credentials)
        jwt = headers["Authorization"]
        claims = jwt.split(".")[1]
        owner = json.loads(base64.urlsafe_b64decode(claims + "=" * (-len(claims) % 4)))["userId"]
        return {"Authorization": jwt}, owner

    def oauth(self, jwt):
        issuer = self.expect(200, "/.well-known/oauth-authorization-server")[1]
        resource = self.expect(200, "/.well-known/oauth-protected-resource/mcp")[1]
        assert json.loads(issuer)["issuer"] == ORIGIN
        assert json.loads(resource)["resource"] == ORIGIN + "/mcp"
        for path in ("/mcp", "/mcp/"):
            headers, _ = self.expect(401, path)
            assert "oauth-protected-resource/mcp" in headers["WWW-Authenticate"]
        callback = "http://127.0.0.1:54321/callback"
        verifier = "a" * 64
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
        query = urlencode(dict(response_type="code", client_id="oriens-codex", redirect_uri=callback,
                               scope="mcp:context", state="synthetic-oauth-state", resource=ORIGIN + "/mcp",
                               code_challenge=challenge, code_challenge_method="S256"))
        headers, _ = self.expect(302, "/oauth2/authorize?" + query)
        assert "; Path=/api/integrations/mcp/" in headers["Set-Cookie"]
        flow = urlsplit(headers["Location"])
        assert flow.path == "/config"
        self.expect(200, flow.path + "?" + flow.query)
        flow_id = parse_qs(flow.query)["mcpFlow"][0]
        path = f"/api/integrations/mcp/authorization-requests/{flow_id}"
        auth = {**jwt, "Cookie": headers["Set-Cookie"].split(";", 1)[0], "Origin": ORIGIN}
        self.expect(200, path, headers=auth)
        _, decision = self.expect(200, path + "/decision", method="POST", headers=auth,
                                  data=dict(version=0, approve=True, name="Proxy proof", scopes=["mcp:context"],
                                            allowedProjectIds=[], allowStandaloneTasks=False))
        code = parse_qs(urlsplit(json.loads(decision)["redirectUrl"]).query)["code"][0]
        form = urlencode(dict(client_id="oriens-codex", grant_type="authorization_code", redirect_uri=callback,
                              resource=ORIGIN + "/mcp", code_verifier=verifier, code=code))
        _, token = self.expect(200, "/oauth2/token", method="POST", data=form.encode(),
                               headers={"Content-Type": "application/x-www-form-urlencoded"})
        headers, body = self.expect(200, "/mcp", method="POST",
                                    headers={"Accept": "application/json, text/event-stream",
                                             "Authorization": "Bearer " + json.loads(token)["access_token"]},
                                    data=dict(jsonrpc="2.0", id=1, method="initialize",
                                              params=dict(protocolVersion="2025-03-26", capabilities={},
                                                          clientInfo=dict(name="proxy-proof", version="1"))))
        assert headers["Content-Type"].startswith(("application/json", "text/event-stream"))
        assert b"protocolVersion" in body and b"serverInfo" in body
        assert b"synthetic-oauth-state" not in self.logs() and challenge.encode() not in self.logs()

    def attachments(self, jwt, owner):
        headers = {**jwt, "Idempotency-Key": str(uuid.uuid4())}
        _, task = self.expect(201, f"/api/task/user/{owner}", method="POST", data={"title": "Proxy proof"}, headers=headers)
        task_id = json.loads(task)["task"]["id"]
        path = f"/api/task/{task_id}/attachments"
        video = (ROOT / "apps/api/src/test/resources/fixtures/task-description-video.webm").read_bytes().ljust(VIDEO_LIMIT, b"\0")
        headers = {**jwt, "Content-Type": "application/octet-stream"}
        _, uploaded = self.expect(201, path + "?kind=video", method="POST", data=video, headers=headers)
        self.expect(413, path + "?kind=video", method="POST", data=video + b"\0", headers=headers)
        self.expect(413, "/api/user/register", method="POST", data=video[:1024 * 1024 + 1], headers=headers)
        _, link = self.expect(200, path + "/" + json.loads(uploaded)["id"], headers=jwt)
        url = "/api" + json.loads(link)["url"]
        headers, body = self.expect(206, url, headers={"Range": "bytes=0-15"})
        assert body == video[:16], (len(body), body[:24].hex())
        assert headers["Content-Range"] == f"bytes 0-15/{VIDEO_LIMIT}", headers["Content-Range"]
        assert headers["Content-Type"] == "video/webm" and headers["Cache-Control"] == "no-store"
        self.expect(404, urlsplit(url).path)
        logs = self.logs()
        for field in (b"signature=", b"expires=", b"owner="):
            assert field not in logs
        assert urlsplit(url).path.encode() in logs
        return url

    def logs(self):
        return docker("exec", self.nginx, "cat", "/var/log/nginx/access.log", "/var/log/nginx/error.log").stdout

    def rollback(self, vhost, original, signed_url):
        invalid = self.install(b"server { invalid_directive; }\n", check=False)
        assert invalid.returncode != 0 and "restaurada" in invalid.stderr.decode()
        assert docker("exec", self.nginx, "cat", ACTIVE).stdout == vhost
        self.expect(200, "/")
        unavailable = vhost.replace(b"127.0.0.1:8080", b"127.0.0.1:18080")
        backup = self.install(unavailable).stdout.decode().split()[-1].removesuffix(".")
        wait_until(lambda: self.request("/api/user/me")[0] == 502)
        self.expect(502, signed_url)
        self.expect(502, "/oauth2/authorize?state=synthetic-error-state")
        logs = self.logs()
        assert b"connect() failed" in logs
        assert b"signature=" not in logs and b"synthetic-error-state" not in logs
        docker("exec", self.nginx, "bash", INSTALLER, backup, ACTIVE)
        wait_until(lambda: self.request(signed_url, headers={"Range": "bytes=0-15"})[0] == 206)
        docker("exec", self.nginx, "bash", INSTALLER, original, ACTIVE)
        wait_until(lambda: self.request("/", tls=False)[0] == 200)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Uso: python3 -B scripts/tests/prove_nginx.py IMAGEM_API IMAGEM_NGINX_UBUNTU")
    proof = ProxyProof(*sys.argv[1:])
    try:
        proof.start()
        vhost, original = proof.routes()
        jwt, owner = proof.login()
        proof.oauth(jwt)
        signed_url = proof.attachments(jwt, owner)
        proof.rollback(vhost, original, signed_url)
        print("Nginx Ubuntu 1.24 validado com HTTPS, SPA, MCP/OAuth, métricas, vídeo 20 MiB, Range, logs e rollback.")
    finally:
        proof.stop()
