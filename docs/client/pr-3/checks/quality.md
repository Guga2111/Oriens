# Qualidade estática

Executados a partir de `oriens-front/`:

```sh
rg -n 'console\.log' src | wc -l
# 0
rg -n '(text|bg|border|fill)-(red|green|blue|yellow|orange|amber|emerald|indigo|purple|gray|slate|rose|teal|white|black)-?[0-9]*' src/pages src/components --glob '*.tsx' --glob '!**/ui/**' | wc -l
# 0
```

Resultado da comparação de variáveis CSS e revisão de escopo:

```text
Q-T2 console.log em src/: 0 []
Q-T3 paleta crua fora de components/ui: 0 []
Q-T4 variáveis próprias da aplicação ausentes: 0
Primitivos UI: 4 variáveis --radix-* são definidas em runtime pelo Radix; --sidebar-width e --sidebar-width-icon são definidas inline em SidebarProvider (6 exceções preexistentes à comparação literal com index.css).
space-y nos TSX tocados fora de components/ui: 0 []
Rotas: App.tsx sem diff contra main
Contratos: services/ e package.json sem diff contra main

```
