import { ESLint } from "eslint";
import { expect, test } from "vitest";

test("ESLint rejects a new production function over the complexity limit", async () => {
  const branches = Array.from({ length: 20 }, (_, index) => `if (value === ${index}) return ${index};`);
  const code = `export function probe(value: number) { ${branches.join("\n")} return -1; }`;
  const [result] = await new ESLint().lintText(code, { filePath: "src/lib/complexityProbe.ts" });

  expect(result.errorCount).toBe(1);
  expect(result.messages[0]).toMatchObject({
    ruleId: "complexity",
    message: expect.stringContaining("complexity of 21"),
  });
});
