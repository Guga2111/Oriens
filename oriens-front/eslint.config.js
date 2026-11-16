import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// UI conventions (docs/conventions/frontend.md §2 and §3). Exceptions use the standard mechanism:
//   // eslint-disable-next-line no-restricted-syntax -- shadcn-exception: <reason>
const CONVENTIONS = "Veja docs/conventions/frontend.md";

const RAW_PRIMITIVES = {
  button: "Button (ou <Trigger asChild><Button>)",
  input: "Input, Checkbox, Switch, RadioGroup ou WorkDatePicker",
  select: "Select, WorkSelect ou WorkCombobox",
  textarea: "Textarea",
  table: "Table, TableHeader, TableBody, TableRow, TableHead, TableCell",
  dialog: "Dialog, AlertDialog, ResponsiveDialog ou ConfirmDialog",
  label: "Label ou FieldLabel",
};

const rawPrimitiveRules = Object.entries(RAW_PRIMITIVES).map(([element, replacement]) => ({
  selector: `JSXOpeningElement[name.name="${element}"]`,
  message: `<${element}> cru é proibido fora de src/components/ui: use ${replacement} (@/components/ui ou components/common; §2 shadcn primeiro). ${CONVENTIONS}.`,
}));

// esquery regex literals cannot contain "/", so the opacity suffix (e.g. text-white/80) is
// allowed by the lookahead instead of being matched. Prefixes are class boundaries: start,
// whitespace, a variant separator ":" or the important modifier "!".
const PALETTE_CLASS =
  "(^|[\\s:!])(bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|placeholder|shadow)-" +
  "(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)" +
  "(-\\d{2,3})?(?![\\w-])";
const ARBITRARY_COLOR = "\\[(#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\()";
const COLOR_MESSAGE = `Cor literal proibida: use tokens semânticos (text-muted-foreground, bg-primary, bg-label-<cor>…) e, para cor vinda de dados, uma CSS variable (§3 Tokens). ${CONVENTIONS}.`;

const literalColorRules = [PALETTE_CLASS, ARBITRARY_COLOR].flatMap((pattern) => [
  { selector: `Literal[value=/${pattern}/]`, message: COLOR_MESSAGE },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message: COLOR_MESSAGE },
]);

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // shadcn components are the only place allowed to render raw primitives and palette colors;
    // test doubles are not product UI.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**", "src/__tests__/**", "src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...rawPrimitiveRules, ...literalColorRules],
    },
  },
);
