import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Delta } from "@/components/common/Delta";

function deltaElement(text: string): HTMLElement {
  return screen.getByText(text);
}

// A10 (P0.3): a cor segue `goodDirection`, nunca apenas o sinal do número.
// A seta continua seguindo o sinal (SPEC §11.6).
describe("Delta — A10 goodDirection", () => {
  it("com goodDirection 'down', alta é ruim (cor negativa e seta para cima)", () => {
    const { container } = render(<Delta change={100} goodDirection="down" />);

    const element = deltaElement("+100%");
    expect(element.className).toContain("text-negative");
    expect(element.className).not.toContain("text-positive");
    expect(container.querySelector(".lucide-trending-up")).not.toBeNull();
  });

  it("com goodDirection 'down', queda é boa (cor positiva e seta para baixo)", () => {
    const { container } = render(<Delta change={-20} goodDirection="down" />);

    const element = deltaElement("-20%");
    expect(element.className).toContain("text-positive");
    expect(container.querySelector(".lucide-trending-down")).not.toBeNull();
  });

  it("com goodDirection 'up', alta é boa (cor positiva e seta para cima)", () => {
    const { container } = render(<Delta change={12.5} goodDirection="up" />);

    const element = deltaElement("+12,5%");
    expect(element.className).toContain("text-positive");
    expect(container.querySelector(".lucide-trending-up")).not.toBeNull();
  });

  it("com goodDirection 'up', queda é ruim (cor negativa)", () => {
    render(<Delta change={-5} goodDirection="up" />);

    expect(deltaElement("-5%").className).toContain("text-negative");
  });

  it("variação 0% fica neutra (cinza) com ícone de menos", () => {
    const { container } = render(<Delta change={0} goodDirection="down" />);

    const element = deltaElement("0%");
    expect(element.className).toContain("text-muted-foreground");
    expect(element.className).not.toContain("text-positive");
    expect(element.className).not.toContain("text-negative");
    expect(container.querySelector(".lucide-minus")).not.toBeNull();
  });

  it("variação indefinida aparece como '—' em cinza", () => {
    render(<Delta change={null} goodDirection="up" />);

    const element = screen.getByLabelText("Sem variação");
    expect(element).toHaveTextContent("—");
    expect(element.className).toContain("text-muted-foreground");
  });
});
