# Verificações por entrega

Todos os comandos terminaram com código 0. Lint tem avisos preexistentes; build tem avisos de Browserslist/bundle. `tsc --noEmit -p tsconfig.app.json` passa no estado final.

| Entrega | Build / lint | Vitest | Playwright (aprovados / ignorados) |
| --- | --- | --- | --- |
| main (PR2 mergeado) | OK | 61 | 22 / 8 |
| P2.0 | OK | 61 | 26 / 12 |
| P2.1 | OK | 61 | 32 / 12 |
| P2.2 | OK | 61 | 36 / 12 |
| P2.3 | OK | 63 | 36 / 16 |
| P2.4 | OK | 63 | 42 / 16 |
| P2.5 | OK | 69 | 42 / 16 |
| P2.6 | OK | 69 | 42 / 16 |
| P2.7 final | OK | 71 | 52 / 18 |

As correções de listas administrativas e de tipagem de formulários foram incorporadas a P2.3/P2.5. Os quatro commits afetados foram revalidados após a consolidação, e seus logs foram atualizados.

No estado final, os 18 skips são 4 testes administrativos sem credenciais, 2 fixmes de BE6 e 12 execuções reservadas ao outro viewport. Não há `test.fail()`.

Houve uma execução de Vitest concorrente ao Playwright com timeouts de testes existentes (5 segundos). Repetir o Vitest sem a carga concorrente aprovou os 71 testes; não foram aumentados timeouts nem alterados esses testes.

Durante a repetição final, os containers locais do Oriens ficaram indisponíveis. Foram restaurados com a imagem/volume existentes, sem rebuild nem mudanças no backend, e as suítes afetadas foram repetidas. Uma sobreposição de execuções também causou colisão de traces; a suíte final usou diretório de artefatos isolado.
