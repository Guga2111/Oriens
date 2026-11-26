import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// P2.2 (SPEC §11.9): a pergunta sobre compartilhamento vira "Em breve" e o
// formulário de contato passa a ter erros inline por campo.
test("a FAQ de compartilhamento está marcada como Em breve", async ({ page }) => {
  await login(page);
  await page.goto("/support");

  const question = page.getByRole("button", {
    name: /Poderei compartilhar projetos com outras pessoas\?/,
  });
  await expect(question).toBeVisible();
  await expect(page.getByText("Em breve")).toBeVisible();

  await question.click();
  await expect(
    page.getByText(
      "Ainda não. O compartilhamento está planejado e chega em uma próxima versão."
    )
  ).toBeVisible();
});

test("o formulário de contato mostra os erros inline", async ({ page }) => {
  await login(page);
  await page.goto("/support");

  await page.getByRole("tab", { name: "Contato" }).click();

  await page.getByRole("button", { name: "Enviar Mensagem" }).click();

  const subject = page.getByLabel("Assunto");
  const message = page.getByLabel("Mensagem");

  await expect(subject).toHaveAttribute("aria-invalid", "true");
  await expect(message).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Informe o assunto.")).toBeVisible();
  await expect(page.getByText("Descreva a sua dúvida.")).toBeVisible();
});
