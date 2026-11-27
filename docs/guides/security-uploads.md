# Segurança de uploads

## Avatares e capas públicas

Avatares e capas de projeto aceitam JPG, PNG, GIF e WebP. `ImageUploads`
confere a extensão e a assinatura do conteúdo. Os serviços de armazenamento
geram os nomes. O `MvcConfig` serve apenas as extensões permitidas em
`/profile-pictures/**` e `/projects-pictures/**`, com leitura pública.
Nos perfis dev e prod, o Spring limita o arquivo e a requisição multipart a 2 MB.
[Validação de imagens](../../apps/api/src/main/java/com/oriens/oriens_api/service/ImageUploads.java) ·
[Serviço de avatar](../../apps/api/src/main/java/com/oriens/oriens_api/service/FileStorageService.java) ·
[Serviço de capas](../../apps/api/src/main/java/com/oriens/oriens_api/service/FileStorageProjectService.java) ·
[Rotas estáticas](../../apps/api/src/main/java/com/oriens/oriens_api/security/MvcConfig.java) ·
[Perfil dev](../../apps/api/src/main/resources/application-dev.properties) ·
[Perfil prod](../../apps/api/src/main/resources/application-prod.properties)

Ao alterar formatos, confira a validação no recebimento e a lista permitida
na leitura de arquivos já armazenados. `ProfilePictureUploadTest` cobre aceitação
da imagem válida e rejeição de conteúdo disfarçado ou de extensão antiga vedada.
`ImageUploadsTest` cobre as assinaturas de imagem.
[Teste do avatar](../../apps/api/src/test/java/com/oriens/oriens_api/security/ProfilePictureUploadTest.java) ·
[Teste de formatos](../../apps/api/src/test/java/com/oriens/oriens_api/service/ImageUploadsTest.java)

## Anexos privados de tarefa

Upload binário e emissão de link exigem posse da tarefa. O serviço valida o
conteúdo e limita a imagem a 2 MiB e o vídeo a 20 MiB, com até 32 anexos por
tarefa e 256 MiB por dono. O download aceita um link assinado válido por cinco
minutos e confere o vínculo entre dono, tarefa e anexo. Trate o link como
credencial temporária e mantenha os arquivos fora do diretório estático.
[Autorização por posse](../conventions/backend/security.md#autorização-e-idor) ·
[Serviço de anexos](../../apps/api/src/main/java/com/oriens/oriens_api/service/TaskAttachmentService.java) ·
[Rotas e cabeçalhos de download](../../apps/api/src/main/java/com/oriens/oriens_api/controller/TaskAttachmentController.java) ·
[Armazenamento, backup e proxy](deploy.md#anexos-privados-de-tarefas)

`WorkApiPostgresTest` cobre posse, links inválidos ou expirados e download de
vídeo por faixa de bytes. Ao alterar a borda, confira também o teste isolado
do Nginx para upload, `Range` e proteção da assinatura nos logs.
[Teste da API](../../apps/api/src/test/java/com/oriens/oriens_api/work/WorkApiPostgresTest.java) ·
[Teste do Nginx](../../ops/nginx/README.md#teste-isolado)
