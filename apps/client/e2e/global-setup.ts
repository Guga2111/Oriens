import { randomBytes } from "node:crypto";

// API de dev local (container oriens_api_dev).
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:8080";

async function post(path: string, body: unknown) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`globalSetup: POST ${path} -> ${res.status}: ${text}`);
  }
  return { data: text ? JSON.parse(text) : null, headers: res.headers };
}

/** Registra uma conta sintética que pode ser isolada por cenário. */
export async function registerTestAccount() {
  const email = `e2e-${Date.now()}-${randomBytes(4).toString("hex")}@oriens.test`;
  const password = `E2e!${randomBytes(16).toString("hex")}`;

  await post("/user/register", { name: "Conta E2E Oriens", email, password });
  return { email, password };
}

/** Compartilha uma conta sintética e seu token com as suítes que usam o setup global. */
export default async function globalSetup() {
  const { email, password } = await registerTestAccount();
  const auth = await post("/authenticate", { email, password });
  const token =
    (auth.headers.get("authorization") ?? "").split(" ")[1] ||
    auth.data?.token;
  if (!token) {
    throw new Error("globalSetup: token de autenticação não recebido");
  }

  process.env.E2E_EMAIL = email;
  process.env.E2E_PASSWORD = password;
  process.env.E2E_TOKEN = token;
}
