# Panorama de projetos de desenvolvimento

Capturas de **Projetos → Lançamento do portfólio → Panorama**, com a mesma
conta sintética e os mesmos dados antes e depois. A inspeção usou o Chromium
via `playwright-cli` com a preferência de aparência do Oriens.

| Viewport | Tema | Antes | Depois |
|---|---|---|---|
| 1440 × 900 | Claro | [Abrir](before-1440-light.png) | [Abrir](after-1440-light.png) |
| 1440 × 900 | Escuro | [Abrir](before-1440-dark.png) | [Abrir](after-1440-dark.png) |
| 390 × 844 | Claro | [Abrir](before-390-light.png) | [Abrir](after-390-light.png) |
| 390 × 844 | Escuro | [Abrir](before-390-dark.png) | [Abrir](after-390-dark.png) |

No celular, confira também o [calendário depois da descrição](after-calendar-390-dark.png)
e o [estado sem capa nem descrição](after-empty-390-dark.png).

Com Tab, Enter e Escape, a ação recebe foco visível, abre o campo de descrição
do editor e recupera o foco ao fechar. O calendário avança e volta por teclado.
A área de conteúdo coube integralmente nas duas larguras da matriz
e a 320 px, em ambos os temas. O roteiro também verificou descarte de
rascunho, nova tentativa após erro de salvamento e persistência após recarregar
a rota na API local.
