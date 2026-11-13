import { expect, test } from "@playwright/test";

// P2.4 (SPEC §11.11): logo único em SVG, landing sem eyebrow e com um único
// CTA primário, auth com h1 "Entrar no Oriens" e 404 com Link tokenizado.
test("a landing tem um único CTA primário e a imagem do produto", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /Organize suas tarefas/ })
  ).toBeVisible();

  // Um único botão primário (o CTA de destaque).
  const primary = page.getByRole("button", { name: "Começar agora" });
  await expect(primary).toBeVisible();
  await expect(primary).toHaveClass(/bg-primary/);

  // Sem pílula de eyebrow acima do título.
  await expect(page.getByText("● Organize seu dia sem custos")).toHaveCount(0);

  // Copy em pt-BR.
  await expect(page.getByText("Planejamento por período")).toBeVisible();
  await expect(page.getByText("Planeamento")).toHaveCount(0);

  await expect(
    page.getByAltText(/Tela de hoje do Oriens/)
  ).toBeVisible();
});

test("a landing e o auth usam o logo em SVG", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('svg[aria-label="Oriens"]').first()).toBeVisible();

  await page.goto("/auth");
  await expect(
    page.getByRole("heading", { level: 1, name: "Entrar no Oriens" })
  ).toBeVisible();
  await expect(page.locator('svg[aria-label="Oriens"]').first()).toBeVisible();
});

test("a página 404 usa um Link tokenizado", async ({ page }) => {
  await page.goto("/rota-inexistente");

  await expect(
    page.getByRole("heading", { level: 1, name: "Página não encontrada" })
  ).toBeVisible();

  const back = page.getByRole("link", { name: "Voltar para o início" });
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute("href", "/");
  await expect(back).not.toHaveClass(/text-blue-500/);
});
