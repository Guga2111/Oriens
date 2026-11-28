# Nginx do Oriens

O [vhost do Oriens](oriens.conf) deriva da configuração ativa do Nginx 1.24.0
no Ubuntu, conferida em leitura na VPS. O arquivo ativo fica em
`/etc/nginx/sites-available/oriens`, com o link existente em `sites-enabled`.
O Certbot administra os certificados e os includes TLS referenciados pelo
vhost. A adoção na VPS depende da aprovação do operador.
[Plano de release e rollout](../../docs/plans/2026-11-26-safe-deploy-release.md)

O vhost encaminha a API a `127.0.0.1:8080` e remove o prefixo `/api/`.
O upload binário de anexo de tarefa aceita até 20 MiB no proxy. A API aplica
seu próprio limite por tipo. O acesso HTTP e HTTPS registra `$uri`, sem query
ou Referer. A SPA e as rotas de links assinados e de MCP/OAuth descartam o
error log da requisição porque seus diagnósticos podem incluir a linha completa.
Os status HTTP continuam no access log, as demais rotas HTTPS herdam o error log
do host e o Prometheus continua na rede `observability`.

## Instalação e rollback

O CD prepara a candidata quando `ORIENS_NGINX_APPLY=true` no ambiente
`production`. Durante o rollout autorizado, provisione uma cópia revisada do
instalador como `/usr/local/sbin/oriens-install-nginx`, pertencente a `root` e
gravável só por `root`. O usuário SSH do deploy precisa poder executar apenas
essa invocação sem argumentos e sem senha. O `""` na regra limita os
argumentos. Restrinja o ambiente `production` a releases revisadas, pois a
configuração recebida é interpretada pelo Nginx com privilégios do host.

```sudoers
USUARIO_DEPLOY ALL=(root) NOPASSWD: /usr/local/sbin/oriens-install-nginx ""
```

O instalador usa Bash, `flock` e a configuração padrão do Nginx. Recebe o
vhost por stdin e testa a configuração ativa. Quando há alteração, guarda uma
cópia em diretório privado ao lado do arquivo, substitui o vhost e executa
`nginx -t` antes de solicitar o reload. Se o teste ou o comando de reload falhar,
restaura o arquivo anterior. Se já tiver solicitado um reload, valida e solicita
outro para a configuração restaurada. Confira a resposta HTTPS e o log do
master para provar que o reload entrou em vigor.

Após um reload aceito, confira as rotas e os logs pelos critérios do plano de
rollout. Em falha, use o `previous.conf` indicado pelo instalador e repita o
teste de HTTPS. No host, com uma revisão conferida do script, execute:

```sh
sudo bash scripts/install-nginx.sh CAMINHO_DO_BACKUP /etc/nginx/sites-available/oriens
```

Preserve as cópias de configuração e os certificados nas respectivas áreas
protegidas do host.

## Teste isolado

```sh
bash -n scripts/install-nginx.sh
python3 -B -m unittest discover -s scripts/tests -p 'test_install_nginx.py' -v
```

A prova de integração usa o vhost versionado, imagens locais e rede Docker
interna. Na raiz, construa a API e uma imagem de teste com Nginx do Ubuntu 24.04.

```sh
docker build -t oriens-api:proxy-proof apps/api
printf '%s\n' 'FROM ubuntu:24.04' \
  'RUN apt-get update && apt-get install -y --no-install-recommends nginx openssl curl' \
  | docker build -t oriens-nginx:proxy-proof -
python3 -B scripts/tests/prove_nginx.py oriens-api:proxy-proof oriens-nginx:proxy-proof
```
