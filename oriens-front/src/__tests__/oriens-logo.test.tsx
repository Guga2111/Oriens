import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OriensLogo } from "@/components/common/OriensLogo";

describe("OriensLogo", () => {
  it("pinta o sol com o primário e o horizonte com a cor do texto", () => {
    const { container } = render(<OriensLogo />);

    expect(container.querySelector("path")).toHaveClass("fill-primary");
    const lines = container.querySelectorAll("rect");
    expect(lines).toHaveLength(4);
    lines.forEach((line) => expect(line).toHaveClass("fill-foreground"));
  });

  it("com title, é uma imagem com nome acessível", () => {
    const { container } = render(<OriensLogo title="Oriens" />);

    const logo = screen.getByRole("img", { name: "Oriens" });
    expect(logo).not.toHaveAttribute("aria-hidden");
    expect(container.querySelector("svg > title")).toHaveTextContent("Oriens");
  });

  it("sem title, é decorativo e fica fora da árvore de acessibilidade", () => {
    const { container } = render(<OriensLogo />);

    const logo = container.querySelector("svg");
    expect(logo).toHaveAttribute("aria-hidden", "true");
    expect(logo).not.toHaveAttribute("role");
    expect(container.querySelector("title")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
