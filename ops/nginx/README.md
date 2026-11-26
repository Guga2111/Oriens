# Nginx do Oriens

O Nginx serve a SPA e encaminha o tráfego à API local. A cópia sanitizada do
vhost efetivo e seus includes ainda são necessários para concluir a tarefa
Oriens #67. A instalação na VPS depende da aprovação do operador. Consulte o
[plano de release e rollout](../../docs/plans/2026-11-26-safe-deploy-release.md).

## Instalação e rollback

No host Nginx, use Bash, `flock` e uma cópia revisada do vhost. Confirme em
ambiente autorizado qual arquivo o Nginx inclui. Use o caminho absoluto
resolvido do arquivo ativo quando houver symlink em `sites-enabled`. Execute
na janela aprovada com o instalador e a candidata obtidos de uma revisão
conferida e sob controle do operador. O script usa a configuração padrão do
Nginx do host.

```sh
sudo bash scripts/install-nginx.sh CANDIDATA ARQUIVO_ATIVO_ABSOLUTO
```

O instalador testa a configuração ativa, guarda uma cópia em um diretório
privado ao lado do arquivo, substitui o vhost e executa `nginx -t` antes de
solicitar o reload. Se o teste ou o comando de reload falhar, restaura o arquivo
anterior. Se já tiver solicitado um reload, valida e solicita outro para a
configuração restaurada. Trate a resposta HTTPS e o log do master como prova
de que o reload entrou em vigor.

Após um reload aceito, confira as rotas e os logs pelos critérios do plano de
rollout. Em falha, passe o `previous.conf` indicado pelo instalador como nova
candidata e repita o teste de HTTPS. Proteja as cópias de configuração e os
certificados no host.

## Teste isolado

```sh
bash -n scripts/install-nginx.sh
python3 -B -m unittest discover -s scripts/tests -p 'test_install_nginx.py' -v
```
