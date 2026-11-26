package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.dto.work.TaskDescriptionDocument;
import com.oriens.oriens_api.exception.WorkDomainException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TaskDescriptionCodecTest {
    private final JsonMapper json = JsonMapper.builder().build();
    private final TaskDescriptionCodec codec = new TaskDescriptionCodec(json);

    @ParameterizedTest
    @ValueSource(strings = {
        "# Um\n\n## Dois\n\n### Três\n\n#### Quatro\n\n##### Cinco\n\n###### Seis",
        "Um **trecho em negrito** e *itálico* com ~~risco~~, `código` e [link](https://example.com).",
        "Primeira linha\\\nSegunda linha\n\n---\n\n> Uma citação.",
        "- Item\n  - Subitem\n- Outro\n\n3. Primeiro\n4. Segundo",
        "- Item com duas partes\n\n  Segundo parágrafo\n\n- Próximo item",
        "- [ ] Pendente\n- [x] Concluído\n  - [x] Subitem",
        "| Tarefa | Estado |\n| :--- | ---: |\n| Ler | **Pronto** |",
        "> **Nota:** Informação **importante**.\n>\n> - Detalhe",
        "> <!-- oriens:quote -->\n>\n> **Nota:** aqui é uma citação comum.",
        "> **Recolhível:** Etapas\n>\n> Checklist:\n>\n> - [ ] Rever",
        "```java\nreturn 42;\n\n```\n\n```mermaid\nflowchart LR\nA --> B\n```",
        "![Calendário com três entregas](https://example.com/agenda.png)\n\n[Vídeo — Apresentação](https://example.com/video.mp4)",
        "![Imagem privada](oriens-attachment:1a03cace-8b58-4005-be0d-e666093ddf7f)",
        "<script>texto literal</script>"
    })
    void roundTripsSupportedBlocks(String input) {
        var first = codec.encode(codec.fromMarkdown(input));
        var second = codec.encode(codec.fromMarkdown(first.markdown()));

        assertThat(json.readTree(second.document())).isEqualTo(json.readTree(first.document()));
        assertThat(second.markdown()).isEqualTo(first.markdown());
        assertThat(second.attachments()).isEqualTo(first.attachments());
    }

    @Test
    void preservesRichStylesInDocumentAndTheirTextInMarkdown() {
        var content = json.readTree("""
            {"type":"doc","content":[{"type":"paragraph","content":[
              {"type":"text","text":"Parte ","marks":[{"type":"bold"},{"type":"underline"}]},
              {"type":"text","text":"destacada","marks":[{"type":"bold"},{"type":"textTone","attrs":{"tone":"blue"}},
                {"type":"highlightTone","attrs":{"tone":"amber"}}]}
            ]}]}
            """);

        var encoded = codec.encode(new TaskDescriptionDocument(1, content));

        assertThat(encoded.markdown()).isEqualTo("**Parte destacada**");
        assertThat(codec.read(encoded.document()).content()).isEqualTo(content);
    }

    @Test
    void checksTheLimitOnTheProjectedMarkdown() {
        assertThat(codec.encode(codec.fromMarkdown("🌻".repeat(5000))).markdown()).hasSize(10_000);
        var overLimit = codec.fromMarkdown("|".repeat(10_000));

        assertThatThrownBy(() -> codec.encode(overLimit)).isInstanceOf(WorkDomainException.class)
            .hasMessageContaining("10.000");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "[Link](javascript:alert(1))", "![imagem](//example.com/foo.png)", "![](https://example.com/test.png)",
        "![imagem](https://person@example.com/foo.png)", "![imagem](oriens-attachment:inválido)"
    })
    void rejectsUnsupportedUrlsAndMissingImageAlternative(String markdown) {
        assertThatThrownBy(() -> codec.encode(codec.fromMarkdown(markdown))).isInstanceOf(WorkDomainException.class);
    }
}
