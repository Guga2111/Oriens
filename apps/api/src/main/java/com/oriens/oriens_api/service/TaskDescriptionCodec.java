package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.dto.work.TaskDescriptionDocument;
import com.oriens.oriens_api.exception.WorkDomainException;
import org.commonmark.Extension;
import org.commonmark.ext.gfm.strikethrough.StrikethroughExtension;
import org.commonmark.ext.gfm.tables.TablesExtension;
import org.commonmark.ext.task.list.items.TaskListItemsExtension;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.markdown.MarkdownRenderer;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;
import java.util.UUID;

@Component
public class TaskDescriptionCodec {
    public static final int MAX_MARKDOWN = 10_000;
    static final String ATTACHMENT = "oriens-attachment:";
    static final JsonNodeFactory JSON = JsonNodeFactory.instance;
    private static final int MAX_DEPTH = 24;
    private static final int MAX_NODES = 2_000;
    private static final int MAX_DOCUMENT_BYTES = 192 * 1024;
    private static final Set<String> INLINE = Set.of("text", "hardBreak", "media");
    private static final Set<String> BLOCKS = Set.of("paragraph", "heading", "blockquote", "callout", "details",
        "horizontalRule", "bulletList", "orderedList", "taskList", "table", "codeBlock");
    private static final Set<String> MARKS = Set.of("bold", "italic", "strike", "code", "link", "underline", "textTone", "highlightTone");
    private static final Set<String> TONES = Set.of("red", "amber", "green", "blue", "violet");
    private static final List<Extension> EXTENSIONS = List.of(TablesExtension.builder().maxCells(1000).build(),
        StrikethroughExtension.create(), TaskListItemsExtension.create());
    private static final Parser PARSER = Parser.builder().extensions(EXTENSIONS)
        .maxOpenBlockParsers(MAX_DEPTH).maxInlineNesting(MAX_DEPTH).build();
    private static final MarkdownRenderer RENDERER = MarkdownRenderer.builder().extensions(EXTENSIONS).build();

    private final ObjectMapper mapper;

    public TaskDescriptionCodec(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public record Encoded(String document, String markdown, Map<UUID, String> attachments) {}

    public TaskDescriptionDocument fromMarkdown(String markdown) {
        if (markdown == null) return null;
        boundMarkdown(markdown);
        try {
            return new TaskDescriptionDocument(1, TaskDescriptionMarkdown.toDocument(PARSER.parse(markdown)));
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw invalid("O Markdown tem uma estrutura que o editor não suporta.");
        }
    }

    public Encoded encode(TaskDescriptionDocument document) {
        if (document == null) return new Encoded(null, null, Map.of());
        if (document.schemaVersion() != 1 || !"doc".equals(type(document.content())))
            throw invalid("Use um documento de descrição válido.");
        Validation validation = new Validation();
        ObjectNode root = validation.node(document.content(), 0);
        if (root.path("content").size() == 1 && "paragraph".equals(type(root.path("content").get(0)))
            && root.path("content").get(0).path("content").isEmpty())
            return new Encoded(null, null, Map.of());
        String markdown = RENDERER.render(TaskDescriptionMarkdown.toMarkdown(root)).stripTrailing();
        boundMarkdown(markdown);
        String json = mapper.writeValueAsString(new TaskDescriptionDocument(1, root));
        if (json.getBytes(StandardCharsets.UTF_8).length > MAX_DOCUMENT_BYTES)
            throw invalid("O documento da descrição excede o tamanho permitido.");
        return new Encoded(json, markdown, Map.copyOf(validation.attachments));
    }

    public TaskDescriptionDocument read(String stored) {
        return stored == null ? null : mapper.readValue(stored, TaskDescriptionDocument.class);
    }

    private static void boundMarkdown(String markdown) {
        if (markdown.length() > MAX_MARKDOWN) throw invalid("Use até 10.000 caracteres em Markdown.");
        validateCharacters(markdown);
    }

    private static void validateCharacters(String value) {
        if (value.codePoints().anyMatch(cp -> cp == 0 || cp >= 0xD800 && cp <= 0xDFFF))
            throw invalid("A descrição contém caracteres inválidos.");
    }

    static String plainText(JsonNode node) {
        if (node == null) return "";
        String type = type(node);
        return switch (type) {
            case "text" -> node.path("text").asString();
            case "hardBreak" -> "\n";
            case "media" -> node.path("attrs").path("label").asString();
            case "horizontalRule" -> "";
            case "details" -> node.path("attrs").path("title").asString() + "\n" + joined(node, "\n");
            case "paragraph", "heading", "codeBlock" -> joined(node, "");
            case "tableRow" -> joined(node, " ");
            default -> joined(node, "\n");
        };
    }

    private static String joined(JsonNode node, String separator) {
        var text = new StringJoiner(separator);
        for (JsonNode child : node.path("content")) text.add(plainText(child));
        return text.toString();
    }

    static String type(JsonNode node) {
        return node == null ? "" : node.path("type").asString("");
    }

    static ObjectNode node(String type) {
        return JSON.objectNode().put("type", type);
    }

    static ObjectNode text(String value) {
        return node("text").put("text", value);
    }

    static ObjectNode withChildren(ObjectNode node, ArrayNode children) {
        if (!children.isEmpty()) node.set("content", children);
        return node;
    }

    static UUID attachment(String url) {
        try {
            String id = url.substring(ATTACHMENT.length());
            UUID parsed = UUID.fromString(id);
            if (parsed.toString().equals(id)) return parsed;
        } catch (IllegalArgumentException ignored) {
            throw invalid("A referência do anexo é inválida.");
        }
        throw invalid("A referência do anexo é inválida.");
    }

    static String secureUrl(String value) {
        try {
            URI uri = URI.create(value);
            if ("https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null)
                return value;
        } catch (IllegalArgumentException ignored) {
            throw invalid("Use um link HTTPS válido.");
        }
        throw invalid("Use um link HTTPS válido.");
    }

    static WorkDomainException invalid(String message) {
        return new WorkDomainException("DOMAIN_VIOLATION", "description", message);
    }

    private static final class Validation {
        private int nodes;
        private int characters;
        private final Map<UUID, String> attachments = new LinkedHashMap<>();

        ObjectNode node(JsonNode input, int depth) {
            if (!input.isObject() || depth > MAX_DEPTH || ++nodes > MAX_NODES)
                throw invalid("A descrição excede o limite de blocos ou níveis.");
            String type = type(input);
            ObjectNode output = TaskDescriptionCodec.node(type);
            JsonNode attrs = input.path("attrs");
            switch (type) {
                case "heading" -> output.putObject("attrs").put("level", integer(attrs, "level", 1, 6, 1));
                case "orderedList" -> output.putObject("attrs").put("start", integer(attrs, "start", 0, 999_999_999, 1));
                case "taskItem" -> {
                    JsonNode checked = attrs.path("checked");
                    if (!checked.isMissingNode() && !checked.isBoolean()) throw invalid("Estado de checklist inválido.");
                    output.putObject("attrs").put("checked", checked.asBoolean(false));
                }
                case "details" -> output.putObject("attrs").put("title", required(attrs.path("title"), 200, "Dê um título ao bloco recolhível."));
                case "codeBlock" -> {
                    String language = optional(attrs.path("language"), 60);
                    if (!language.matches("[A-Za-z0-9_+.#-]*")) throw invalid("Use um identificador de linguagem válido.");
                    if (!language.isEmpty()) output.putObject("attrs").put("language", language);
                }
                case "media" -> media(attrs, output);
                case "tableCell", "tableHeader" -> {
                    integer(attrs, "colspan", 1, 1, 1);
                    integer(attrs, "rowspan", 1, 1, 1);
                    String align = optional(attrs.path("align"), 6);
                    if (!align.isEmpty()) {
                        if (!Set.of("left", "center", "right").contains(align)) throw invalid("Alinhamento de célula inválido.");
                        output.putObject("attrs").put("align", align);
                    }
                }
                case "text" -> {
                    String text = optional(input.path("text"), MAX_MARKDOWN);
                    if (text.isEmpty()) throw invalid("Use texto válido na descrição.");
                    output.put("text", text);
                    marks(input.path("marks"), output);
                }
                case "doc", "paragraph", "blockquote", "callout", "horizontalRule", "bulletList", "listItem",
                    "taskList", "table", "tableRow", "hardBreak" -> {}
                default -> throw invalid("A descrição contém um bloco que o editor não suporta.");
            }
            JsonNode content = input.path("content");
            if (!content.isMissingNode() && !content.isArray()) throw invalid("Conteúdo de bloco inválido.");
            ArrayNode children = JSON.arrayNode();
            for (JsonNode child : content) {
                if (!childTypes(type).contains(type(child))) throw invalid("Posição inválida para um bloco da descrição.");
                children.add(node(child, depth + 1));
            }
            validateChildren(type, children);
            return withChildren(output, children);
        }

        private static Set<String> childTypes(String type) {
            return switch (type) {
                case "doc", "blockquote", "callout", "details", "listItem", "taskItem" -> BLOCKS;
                case "paragraph", "heading" -> INLINE;
                case "codeBlock" -> Set.of("text");
                case "bulletList", "orderedList" -> Set.of("listItem");
                case "taskList" -> Set.of("taskItem");
                case "table" -> Set.of("tableRow");
                case "tableRow" -> Set.of("tableHeader", "tableCell");
                case "tableHeader", "tableCell" -> Set.of("paragraph");
                default -> Set.of();
            };
        }

        private static void validateChildren(String type, ArrayNode children) {
            switch (type) {
                case "doc", "blockquote", "callout", "details", "bulletList", "orderedList", "taskList", "tableRow" -> {
                    if (children.isEmpty()) throw invalid("A descrição contém um bloco sem conteúdo obrigatório.");
                }
                case "listItem", "taskItem" -> {
                    if (!"paragraph".equals(type(children.get(0)))) throw invalid("Inicie o item de lista com texto.");
                }
                case "tableHeader", "tableCell" -> {
                    if (children.size() != 1 || children.get(0).path("content").valueStream()
                            .anyMatch(child -> "hardBreak".equals(type(child))))
                        throw invalid("Use uma linha de texto por célula.");
                }
                case "codeBlock" -> {
                    for (JsonNode child : children) {
                        if (child.has("marks")) throw invalid("O bloco de código aceita somente texto.");
                    }
                }
                case "table" -> {
                    if (children.isEmpty()) throw invalid("Inclua um cabeçalho na tabela.");
                    int columns = children.get(0).path("content").size();
                    for (int row = 0; row < children.size(); row++) {
                        JsonNode cells = children.get(row).path("content");
                        String cellType = row == 0 ? "tableHeader" : "tableCell";
                        if (cells.size() != columns || cells.valueStream().anyMatch(cell -> !cellType.equals(type(cell))))
                            throw invalid("Use um cabeçalho e o mesmo número de colunas em cada linha.");
                    }
                }
                default -> {}
            }
        }

        private void marks(JsonNode input, ObjectNode text) {
            if (input.isMissingNode()) return;
            if (!input.isArray() || input.size() > MARKS.size()) throw invalid("Formatação inline inválida.");
            ArrayNode marks = JSON.arrayNode();
            var seen = new HashSet<String>();
            for (JsonNode mark : input) {
                String type = type(mark);
                if (!MARKS.contains(type) || !seen.add(type)) throw invalid("Formatação inline inválida.");
                ObjectNode output = TaskDescriptionCodec.node(type);
                if ("link".equals(type)) {
                    JsonNode attrs = mark.path("attrs");
                    ObjectNode link = output.putObject("attrs");
                    link.put("href", secureUrl(required(attrs.path("href"), 2048, "Informe um link HTTPS.")));
                    String title = optional(attrs.path("title"), 200);
                    if (!title.isEmpty()) link.put("title", title);
                }
                if ("textTone".equals(type) || "highlightTone".equals(type)) {
                    String tone = mark.path("attrs").path("tone").asString("");
                    if (!TONES.contains(tone)) throw invalid("Escolha uma das cores do editor.");
                    output.putObject("attrs").put("tone", tone);
                }
                marks.add(output);
            }
            if (!marks.isEmpty()) text.set("marks", marks);
        }

        private void media(JsonNode attrs, ObjectNode output) {
            String kind = attrs.path("kind").asString("");
            if (!Set.of("image", "video").contains(kind)) throw invalid("Tipo de mídia inválido.");
            String label = required(attrs.path("label"), 300, "Informe o texto alternativo da imagem ou o nome do vídeo.");
            String url = required(attrs.path("src"), 2048, "Informe a origem da mídia.");
            if (url.startsWith(ATTACHMENT)) {
                UUID id = attachment(url);
                String previous = attachments.put(id, kind);
                if (previous != null && !previous.equals(kind)) throw invalid("Tipo de anexo inválido.");
            } else secureUrl(url);
            output.putObject("attrs").put("kind", kind).put("label", label).put("src", url);
        }

        private String required(JsonNode node, int max, String message) {
            String value = optional(node, max);
            if (value.isBlank()) throw invalid(message);
            return value;
        }

        private String optional(JsonNode node, int max) {
            if (node.isMissingNode() || node.isNull()) return "";
            if (!node.isString()) throw invalid("Use valores de texto na descrição.");
            String value = node.asString();
            if (value.length() > max || (characters += value.length()) > MAX_DOCUMENT_BYTES)
                throw invalid("A descrição excede o tamanho permitido.");
            validateCharacters(value);
            return value;
        }

        private static int integer(JsonNode attrs, String name, int min, int max, int fallback) {
            JsonNode value = attrs.path(name);
            if (value.isMissingNode() || value.isNull()) return fallback;
            if (!value.isIntegralNumber() || !value.canConvertToInt() || value.intValue() < min || value.intValue() > max)
                throw invalid("A descrição contém um atributo de bloco inválido.");
            return value.intValue();
        }
    }
}
