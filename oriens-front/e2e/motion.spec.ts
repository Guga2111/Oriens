import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";
import { format } from "date-fns";
import { login } from "./helpers";

test("conclusão anima o check em 120ms e respeita movimento reduzido", async ({ page, request }) => {
  const token = process.env.E2E_TOKEN!;
  const { userId } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  const title = `Movimento ${Date.now()}`;
  const response = await request.post(`${process.env.E2E_API_BASE_URL ?? "http://localhost:8080"}/task/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { title, dueDate: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", priority: "MEDIUM", status: "PENDING" },
  });
  expect(response.ok()).toBeTruthy();
  await login(page);
  const checkbox = page.getByRole("checkbox", { name: `Concluir ${title}`, exact: true });
  await checkbox.evaluate((element) => {
    element.addEventListener("animationstart", (event) => {
      const animation = event as AnimationEvent;
      element.setAttribute("data-observed-animation", animation.animationName);
      element.setAttribute("data-observed-duration", getComputedStyle(animation.target as Element).animationDuration);
    });
  });
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toHaveAttribute("data-observed-animation", "task-complete");
  await expect(checkbox).toHaveAttribute("data-observed-duration", "0.12s");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await checkbox.click();
  await expect(checkbox).not.toBeChecked();
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  expect(await checkbox.locator('[data-state="checked"]').evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await page.getByRole("button", { name: "Nova Tarefa" }).evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
});

test("CTA tem foco visível, press e movimento reduzido sem controles aninhados", async ({ page }) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Começar agora" });
  await expect(cta.locator("button, a")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await cta.focus();
  expect(await cta.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");
  await cta.hover();
  await page.mouse.down();
  await expect.poll(() => cta.evaluate((element) => getComputedStyle(element).transform)).toBe("matrix(0.98, 0, 0, 0.98, 0, 0)");
  // Release outside the link so the assertion doesn't navigate.
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await cta.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
});
