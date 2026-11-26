"""Run the real deploy shell, including its remote body, with local substitutes."""

import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
IMAGE_TAG = "a" * 40
PREVIOUS_TAG = "b" * 40
STUB = r"""#!/usr/bin/env bash
set -euo pipefail
command=${0##*/}
printf '%s\n' "$command $*" >> "$TEST_LOG"
case "$command:$*" in
    "npm:ci")
        [[ "$PWD" == "$TEST_REPO/apps/client" && "${FAIL_BUILD:-0}" != 1 ]]
        ;;
    "npm:run build")
        [[ "$PWD" == "$TEST_REPO/apps/client" ]]
        ;;
    "docker:build "*)
        [[ "$PWD" == "$TEST_REPO" && -d "${@: -1}" ]]
        ;;
    "docker:save "*)
        [[ "${FAIL_UPLOAD:-0}" != 1 ]] || exit 1
        printf 'test image'
        ;;
    "docker:load")
        [[ "$(cat)" == "test image" ]]
        printf 'candidate image' > "$TEST_REMOTE/$IMAGE_TAG"
        ;;
    "docker:image inspect --format {{.Id}} oriens-api:"*)
        cat "$TEST_REMOTE/${5#oriens-api:}"
        ;;
    "docker:image inspect --format {{index .Config.Labels "*)
        if [[ "$5" == 'candidate image' ]]; then
            printf '%s' "$IMAGE_TAG"
        else
            [[ "$5" == 'original image' ]]
            printf '%s' "${PREVIOUS_REVISION:-$PREVIOUS_TAG}"
        fi
        ;;
    "docker:image inspect --format {{if .Config.Healthcheck}}"*)
        if [[ "$5" == 'candidate image' ]]; then
            printf '%s' "${CANDIDATE_PROBE:-CMD}"
        else
            [[ "$5" == 'original image' ]]
            printf '%s' "${PREVIOUS_PROBE:-CMD}"
        fi
        ;;
    "docker:tag "*)
        printf '%s' "$2" > "$TEST_REMOTE/${3#oriens-api:}"
        ;;
    "docker:container inspect "*)
        cat "$TEST_REMOTE/running"
        ;;
    "docker:container stop oriens-api")
        rm "$TEST_REMOTE/running"
        ;;
    "docker:run --rm --network none "*)
        [[ "${FAIL_PERMISSIONS:-0}" != 1 ]]
        ;;
    "docker:compose "*)
        [[ "$PWD" == "$TEST_REMOTE/projects/oriens" && -f "$3" && -f "$5" ]]
        case "$6" in
            config|logs)
                ;;
            up)
                [[ "$*" == *' --wait --wait-timeout 360 '* ]]
                if [[ "$5" == docker-compose-prod.next.yml ]]; then
                    [[ "$ORIENS_API_TAG" == "$IMAGE_TAG" ]]
                    printf 'candidate image' > "$TEST_REMOTE/running"
                    [[ "${FAIL_READINESS:-0}" != 1 ]]
                else
                    [[ "$ORIENS_API_TAG" == "$PREVIOUS_TAG" ]]
                    printf 'original image' > "$TEST_REMOTE/running"
                fi
                ;;
            *) exit 70 ;;
        esac
        ;;
    "docker:network inspect observability")
        ;;
    "ssh:"*)
        [[ "$#" == 2 && "$1" == vps ]]
        export HOME="$TEST_REMOTE"
        exec bash -e -o pipefail -c "${2//\/opt\/oriens-uploads/$TEST_REMOTE\/uploads}"
        ;;
    "scp:"*)
        [[ "$#" == 2 && "$2" == vps:* ]]
        cp "$1" "$TEST_REMOTE/${2#vps:}"
        ;;
    *)
        printf 'Unexpected command: %s %s\n' "$command" "$*" >&2
        exit 70
        ;;
esac
"""


class DeployTest(unittest.TestCase):
    def setUp(self):
        fixture = tempfile.TemporaryDirectory()
        self.addCleanup(fixture.cleanup)
        self.root = Path(fixture.name)
        self.repo = self.root / "checkout"
        self.remote = self.root / "remote"
        self.web = self.remote / "web"
        self.log = self.root / "commands"
        self.log.touch()
        (self.repo / "scripts").mkdir(parents=True)
        self.script = shutil.copy2(ROOT / "scripts/deploy.sh", self.repo / "scripts")
        (self.repo / "apps/api").mkdir(parents=True)
        (self.repo / "apps/client/dist").mkdir(parents=True)
        (self.repo / "apps/client/dist/index.html").write_text("build output", encoding="utf-8")
        (self.repo / "ops/compose").mkdir(parents=True)
        self.compose = Path(shutil.copy2(ROOT / "ops/compose/docker-compose-prod.yml", self.repo / "ops/compose"))
        self.remote.mkdir()
        (self.remote / "latest").write_text("original image", encoding="utf-8")
        (self.remote / PREVIOUS_TAG).write_text("original image", encoding="utf-8")
        dependencies = self.root / "bin"
        dependencies.mkdir()
        stub = dependencies / "stub"
        stub.write_text(STUB, encoding="utf-8")
        stub.chmod(0o755)
        for name in ("npm", "docker", "ssh", "scp"):
            (dependencies / name).symlink_to(stub)
        self.env = {
            "PATH": f"{dependencies}:{os.defpath}",
            "IMAGE_TAG": IMAGE_TAG,
            "PREVIOUS_TAG": PREVIOUS_TAG,
            "TEST_REPO": str(self.repo),
            "TEST_REMOTE": str(self.remote),
            "TEST_LOG": str(self.log),
        }
        self.publish_env = {
            "REMOTE_DIR": "projects/oriens", "WEB_ROOT": str(self.web),
            "DB_URL": "jdbc:postgresql://test.invalid/oriens", "DB_USER": "synthetic",
            "DB_PASSWORD": "synthetic", "JWT_SECRET": "x" * 64, "API_PORT": "8080",
            "ORIENS_MCP_ENABLED": "false",
        }

    def deploy(self, phase, **overrides):
        env = dict(self.env)
        if phase == "publish":
            env.update(self.publish_env)
        env.update(overrides)
        result = subprocess.run(["bash", self.script, phase], cwd=self.root, env=env,
                                capture_output=True, text=True, timeout=20, check=False)
        return result, self.log.read_text(encoding="utf-8").splitlines()

    def test_build_runs_from_checkout_without_publish_credentials(self):
        result, commands = self.deploy("build")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(commands, ["npm ci", "npm run build",
                                    f"docker build --label org.opencontainers.image.revision={IMAGE_TAG} "
                                    f"-t oriens-api:{IMAGE_TAG} apps/api"])

    def test_failed_build_does_not_build_api_or_connect(self):
        result, commands = self.deploy("build", FAIL_BUILD="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(commands, ["npm ci"])

    def test_publish_transfers_compose_and_only_publishes_frontend_after_probe(self):
        result, commands = self.deploy("publish", ORIENS_MCP_ENABLED="true",
                                       ORIENS_MCP_ISSUER="https://test.invalid",
                                       ORIENS_MCP_FRONTEND="https://test.invalid",
                                       ORIENS_MCP_ENCRYPTION_PASSWORD="synthetic",
                                       ORIENS_MCP_ENCRYPTION_SALT="synthetic")
        self.assertEqual(result.returncode, 0, result.stderr)
        remote_dir = self.remote / "projects/oriens"
        self.assertEqual((remote_dir / self.compose.name).read_bytes(), self.compose.read_bytes())
        env_file = remote_dir / ".env"
        self.assertIn("ORIENS_MCP_ENABLED='true'\n", env_file.read_text(encoding="utf-8"))
        self.assertIn("ORIENS_MCP_ISSUER='https://test.invalid'\n", env_file.read_text(encoding="utf-8"))
        self.assertEqual(stat.S_IMODE(env_file.stat().st_mode), 0o600)
        self.assertEqual((self.web / "index.html").read_text(encoding="utf-8"), "build output")
        readiness = commands.index("docker compose --env-file .env.next -f docker-compose-prod.next.yml "
                                   "up -d --wait --wait-timeout 360 --force-recreate api")
        self.assertLess(commands.index("docker load"), readiness)
        self.assertLess(readiness, commands.index("docker tag candidate image oriens-api:latest"))
        self.assertLess(readiness, commands.index(f"ssh vps tar -xzf - -C {self.web}"))
        self.assertEqual((self.remote / "previous").read_text(encoding="utf-8"), "original image")

    def test_failed_image_upload_does_not_restart_or_publish(self):
        result, commands = self.deploy("publish", FAIL_UPLOAD="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(command.startswith(("scp ", "docker compose ", "ssh vps tar ")) for command in commands))

    def test_invalid_secret_preserves_remote_environment_and_skips_restart(self):
        prior = self.remote / "projects/oriens/.env"
        prior.parent.mkdir(parents=True)
        prior.write_text("original", encoding="utf-8")
        result, commands = self.deploy("publish", DB_PASSWORD="invalid'quote")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DB_PASSWORD não pode conter aspas simples", result.stderr)
        self.assertNotIn("invalid'quote", result.stderr)
        self.assertEqual(prior.read_text(encoding="utf-8"), "original")
        self.assertFalse(any(command.startswith("docker compose") for command in commands))

    def seed_previous_config(self):
        prior = self.remote / "projects/oriens"
        prior.mkdir(parents=True)
        (prior / ".env").write_text("original environment", encoding="utf-8")
        (prior / "docker-compose-prod.yml").write_text("original compose", encoding="utf-8")
        return prior

    def test_failed_readiness_preserves_previous_state_and_stops_unapproved_candidate(self):
        prior = self.seed_previous_config()
        result, commands = self.deploy("publish", FAIL_READINESS="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Rollback automático indisponível", result.stdout)
        self.assertIn("docker container stop oriens-api", commands)
        self.assertEqual((self.remote / "latest").read_text(encoding="utf-8"), "original image")
        self.assertFalse((self.remote / "running").exists())
        self.assertFalse((self.web / "index.html").exists())
        self.assertEqual((prior / ".env").read_text(encoding="utf-8"), "original environment")
        self.assertEqual((prior / "docker-compose-prod.yml").read_text(encoding="utf-8"), "original compose")
        self.assertFalse((prior / ".env.next").exists())

    def test_failed_readiness_restores_only_exact_approved_previous_image(self):
        self.seed_previous_config()
        result, commands = self.deploy("publish", FAIL_READINESS="1",
                                       ROLLBACK_COMPATIBLE_PAIR=f"{IMAGE_TAG}:{PREVIOUS_TAG}")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(f"Versão anterior {PREVIOUS_TAG} restaurada e pronta", result.stdout)
        self.assertIn("docker compose --env-file .env -f docker-compose-prod.yml up -d --wait "
                      "--wait-timeout 360 api", commands)
        self.assertEqual((self.remote / "running").read_text(encoding="utf-8"), "original image")
        self.assertFalse((self.web / "index.html").exists())

    def test_previous_image_with_wrong_revision_cannot_be_restored(self):
        self.seed_previous_config()
        result, commands = self.deploy("publish", FAIL_READINESS="1", PREVIOUS_REVISION="c" * 40,
                                       ROLLBACK_COMPATIBLE_PAIR=f"{IMAGE_TAG}:{PREVIOUS_TAG}")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Rollback automático indisponível", result.stdout)
        self.assertFalse(any(command.startswith("docker compose --env-file .env ") for command in commands))

    def test_upload_permissions_failure_leaves_running_image_untouched(self):
        self.seed_previous_config()
        running = self.remote / "running"
        running.write_text("original image", encoding="utf-8")
        result, commands = self.deploy("publish", FAIL_PERMISSIONS="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Prepare as permissões", result.stdout)
        self.assertFalse(any(" up -d" in command for command in commands))
        self.assertEqual(running.read_text(encoding="utf-8"), "original image")

    def test_candidate_without_healthcheck_cannot_replace_the_running_image(self):
        prior = self.seed_previous_config()
        result, commands = self.deploy("publish", CANDIDATE_PROBE="NONE")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ter healthcheck", result.stdout)
        self.assertFalse(any(" up -d" in command for command in commands))
        self.assertEqual((prior / ".env").read_text(encoding="utf-8"), "original environment")

    def test_running_image_must_match_latest_to_start_replacement(self):
        running = self.remote / "running"
        running.write_text("different image", encoding="utf-8")
        result, commands = self.deploy("publish")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("imagem em execução diverge da tag latest", result.stdout)
        self.assertFalse(any(" up -d" in command for command in commands))
        self.assertEqual(running.read_text(encoding="utf-8"), "different image")

    def test_unsafe_destination_fails_before_contacting_remote(self):
        result, commands = self.deploy("publish", REMOTE_DIR="projects/oriens; exit 0")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("REMOTE_DIR", result.stderr)
        self.assertEqual(commands, [])

    def test_dynamic_or_invalid_port_fails_before_contacting_remote(self):
        for port in ("0", "65536", "08080", "127.0.0.1"):
            with self.subTest(port=port):
                result, commands = self.deploy("publish", API_PORT=port)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("API_PORT", result.stderr)
                self.assertEqual(commands, [])


if __name__ == "__main__":
    unittest.main()
