package com.oriens.oriens_api.service;

import org.commonmark.ext.gfm.strikethrough.Strikethrough;
import org.commonmark.ext.gfm.tables.TableBlock;
import org.commonmark.ext.gfm.tables.TableBody;
import org.commonmark.ext.gfm.tables.TableCell;
import org.commonmark.ext.gfm.tables.TableHead;
import org.commonmark.ext.gfm.tables.TableRow;
import org.commonmark.ext.task.list.items.TaskListItemMarker;
import org.commonmark.node.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static com.oriens.oriens_api.service.TaskDescriptionCodec.*;

final class TaskDescriptionMarkdown {
    private static final String NOTE = "Nota:";
    private static final String TOGGLE = "Recolhível:";
    private static final String VIDEO = "Vídeo — ";
    private static final String QUOTE = "<!-- oriens:quote -->";

    private TaskDescriptionMarkdown() {}

    static ObjectNode toDocument(Node markdown) {
        return withChildren(node("doc"), blocks(markdown.getFirstChild()));
    }

    private static ArrayNode blocks(Node first) {
        ArrayNode blocks = JSON.arrayNode();
        for (Node child = first; child != null; child = child.getNext()) {
            switch (child) {
                case Heading heading -> {
                    ObjectNode block = node("heading");
                    block.putObject("attrs").put("level", heading.getLevel());
                    blocks.add(withChildren(block, inlines(child)));
                }
                case Paragraph paragraph -> blocks.add(withChildren(node("paragraph"), inlines(paragraph)));
                case BlockQuote quote -> blocks.add(quote(quote));
                case ThematicBreak ignored -> blocks.add(node("horizontalRule"));
                case FencedCodeBlock code -> blocks.add(code(withoutFinalNewline(code.getLiteral()), code.getInfo()));
                case IndentedCodeBlock code -> blocks.add(code(withoutFinalNewline(code.getLiteral()), ""));
                case ListBlock list -> blocks.addAll(lists(list));
                case TableBlock table -> blocks.add(table(table));
                case HtmlBlock html -> blocks.add(literalParagraph(withoutFinalNewline(html.getLiteral())));
                case LinkReferenceDefinition ignored -> { /* References are resolved into their link nodes. */ }
                default -> throw invalid("O Markdown contém um bloco que o editor não suporta.");
            }
        }
        if (blocks.isEmpty()) blocks.add(node("paragraph"));
        return blocks;
    }

    private static ObjectNode quote(BlockQuote quote) {
        Node first = quote.getFirstChild();
        if (first instanceof HtmlBlock html && html.getLiteral().strip().equals(QUOTE))
            return withChildren(node("blockquote"), blocks(first.getNext()));
        String marker = quoteMarker(first);
        if (TOGGLE.equals(marker)) {
            ObjectNode toggle = node("details");
            String title = literalText(first.getFirstChild().getNext()).strip();
            toggle.putObject("attrs").put("title", title);
            return withChildren(toggle, blocks(first.getNext()));
        }
        if (NOTE.equals(marker)) {
            Node strong = first.getFirstChild();
            Node next = strong.getNext();
            strong.unlink();
            if (next instanceof Text text && text.getLiteral().startsWith(" ")) {
                if (text.getLiteral().length() == 1) text.unlink();
                else text.setLiteral(text.getLiteral().substring(1));
            }
            return withChildren(node("callout"), blocks(first.getFirstChild() == null ? first.getNext() : first));
        }
        return withChildren(node("blockquote"), blocks(first));
    }

    private static String quoteMarker(Node first) {
        if (first instanceof Paragraph && first.getFirstChild() instanceof StrongEmphasis strong)
            return literalText(strong.getFirstChild());
        return "";
    }

    private static ObjectNode code(String source, String language) {
        ObjectNode block = node("codeBlock");
        if (language != null && !language.isEmpty()) block.putObject("attrs").put("language", language);
        return source.isEmpty() ? block : withChildren(block, JSON.arrayNode().add(text(source)));
    }

    private static String withoutFinalNewline(String value) {
        return value.endsWith("\n") ? value.substring(0, value.length() - 1) : value;
    }

    private static ObjectNode literalParagraph(String literal) {
        ArrayNode lines = JSON.arrayNode();
        String[] split = literal.split("\n", -1);
        for (int i = 0; i < split.length; i++) {
            if (i > 0) lines.add(node("hardBreak"));
            if (!split[i].isEmpty()) lines.add(text(split[i]));
        }
        return withChildren(node("paragraph"), lines);
    }

    private static ArrayNode lists(ListBlock list) {
        ArrayNode result = JSON.arrayNode();
        ArrayNode items = null;
        String previousType = "";
        int number = list instanceof OrderedList ordered ? ordered.getMarkerStartNumber() : 1;
        for (Node child = list.getFirstChild(); child != null; child = child.getNext(), number++) {
            Node content = child.getFirstChild();
            var marker = content instanceof TaskListItemMarker task ? task : null;
            String listType = marker != null ? "taskList" : list instanceof OrderedList ? "orderedList" : "bulletList";
            if (!listType.equals(previousType)) {
                ObjectNode block = node(listType);
                if (listType.equals("orderedList")) block.putObject("attrs").put("start", number);
                items = block.putArray("content");
                result.add(block);
                previousType = listType;
            }
            ObjectNode item = node(marker != null ? "taskItem" : "listItem");
            if (marker != null) item.putObject("attrs").put("checked", marker.isChecked());
            ArrayNode body = blocks(marker == null ? content : content.getNext());
            if (!"paragraph".equals(type(body.get(0)))) body.insert(0, node("paragraph"));
            items.add(withChildren(item, body));
        }
        return result;
    }

    private static ObjectNode table(TableBlock table) {
        ArrayNode rows = JSON.arrayNode();
        for (Node section = table.getFirstChild(); section != null; section = section.getNext()) {
            for (Node row = section.getFirstChild(); row != null; row = row.getNext()) {
                ArrayNode cells = JSON.arrayNode();
                for (Node col = row.getFirstChild(); col instanceof TableCell cell; col = col.getNext()) {
                    ObjectNode output = node(cell.isHeader() ? "tableHeader" : "tableCell");
                    if (cell.getAlignment() != null)
                        output.putObject("attrs").put("align", cell.getAlignment().name().toLowerCase(Locale.ROOT));
                    cells.add(withChildren(output, JSON.arrayNode().add(withChildren(node("paragraph"), inlines(cell)))));
                }
                rows.add(withChildren(node("tableRow"), cells));
            }
        }
        return withChildren(node("table"), rows);
    }

    private static ArrayNode inlines(Node parent) {
        ArrayNode result = JSON.arrayNode();
        inlines(parent.getFirstChild(), List.of(), result);
        return result;
    }

    private static void inlines(Node first, List<ObjectNode> marks, ArrayNode result) {
        for (Node child = first; child != null; child = child.getNext()) {
            switch (child) {
                case Text text -> addText(text.getLiteral(), marks, result);
                case HtmlInline html -> addText(html.getLiteral(), marks, result);
                case SoftLineBreak ignored -> result.add(node("hardBreak"));
                case HardLineBreak ignored -> result.add(node("hardBreak"));
                case Code code -> addText(code.getLiteral(), withMark(marks, node("code")), result);
                case Emphasis ignored -> inlines(child.getFirstChild(), withMark(marks, node("italic")), result);
                case StrongEmphasis ignored -> inlines(child.getFirstChild(), withMark(marks, node("bold")), result);
                case Strikethrough ignored -> inlines(child.getFirstChild(), withMark(marks, node("strike")), result);
                case Image image -> result.add(media("image", literalText(child.getFirstChild()), image.getDestination()));
                case Link link -> {
                    String label = literalText(child.getFirstChild());
                    if (label.startsWith(VIDEO) && child.getFirstChild() instanceof Text && child.getFirstChild().getNext() == null) {
                        result.add(media("video", label.substring(VIDEO.length()), link.getDestination()));
                    } else {
                        ObjectNode mark = node("link");
                        ObjectNode attrs = mark.putObject("attrs").put("href", link.getDestination());
                        if (link.getTitle() != null) attrs.put("title", link.getTitle());
                        inlines(child.getFirstChild(), withMark(marks, mark), result);
                    }
                }
                default -> throw invalid("O Markdown contém uma formatação que o editor não suporta.");
            }
        }
    }

    private static ObjectNode media(String kind, String label, String src) {
        ObjectNode node = node("media");
        node.putObject("attrs").put("kind", kind).put("label", label).put("src", src);
        return node;
    }

    private static void addText(String literal, List<ObjectNode> marks, ArrayNode result) {
        if (literal.isEmpty()) return;
        ObjectNode text = text(literal);
        if (!marks.isEmpty()) text.set("marks", JSON.arrayNode().addAll(marks));
        result.add(text);
    }

    private static List<ObjectNode> withMark(List<ObjectNode> marks, ObjectNode mark) {
        if (marks.stream().anyMatch(existing -> type(existing).equals(type(mark)))) return marks;
        var result = new ArrayList<>(marks);
        result.add(mark);
        return result;
    }

    private static String literalText(Node first) {
        var value = new StringBuilder();
        for (Node child = first; child != null; child = child.getNext()) {
            value.append(switch (child) {
                case Text text -> text.getLiteral();
                case Code code -> code.getLiteral();
                case HtmlInline html -> html.getLiteral();
                case SoftLineBreak ignored -> " ";
                case HardLineBreak ignored -> " ";
                default -> literalText(child.getFirstChild());
            });
        }
        return value.toString();
    }

    static Document toMarkdown(ObjectNode document) {
        var result = new Document();
        appendBlocks(document, result);
        return result;
    }

    private static void appendBlocks(JsonNode document, Node target) {
        for (JsonNode child : document.path("content")) target.appendChild(block(child));
    }

    private static Node block(JsonNode node) {
        JsonNode attrs = node.path("attrs");
        return switch (type(node)) {
            case "paragraph" -> appendInlines(node, new Paragraph());
            case "heading" -> {
                var heading = new Heading();
                heading.setLevel(attrs.path("level").intValue());
                yield appendInlines(node, heading);
            }
            case "horizontalRule" -> {
                var rule = new ThematicBreak();
                rule.setLiteral("---");
                yield rule;
            }
            case "blockquote", "callout", "details" -> blockquote(node);
            case "codeBlock" -> fenced(node);
            case "orderedList", "bulletList", "taskList" -> list(node);
            case "table" -> markdownTable(node);
            default -> throw invalid("A descrição contém um bloco que o editor não suporta.");
        };
    }

    private static BlockQuote blockquote(JsonNode node) {
        var quote = new BlockQuote();
        if (type(node).equals("callout")) quote.appendChild(marker(NOTE, ""));
        if (type(node).equals("details")) quote.appendChild(marker(TOGGLE, node.path("attrs").path("title").asString()));
        appendBlocks(node, quote);
        if (type(node).equals("blockquote") && List.of(NOTE, TOGGLE).contains(quoteMarker(quote.getFirstChild()))) {
            var escape = new HtmlBlock();
            escape.setLiteral(QUOTE);
            quote.prependChild(escape);
        }
        return quote;
    }

    private static Paragraph marker(String label, String title) {
        var header = new Paragraph();
        var marker = new StrongEmphasis("**");
        marker.appendChild(new Text(label));
        header.appendChild(marker);
        if (!title.isEmpty()) header.appendChild(new Text(" " + title));
        return header;
    }

    private static FencedCodeBlock fenced(JsonNode node) {
        var code = new FencedCodeBlock();
        code.setInfo(node.path("attrs").path("language").asString(""));
        code.setLiteral(plainText(node) + "\n");
        return code;
    }

    private static ListBlock list(JsonNode node) {
        boolean tasks = type(node).equals("taskList");
        ListBlock list;
        if (type(node).equals("orderedList")) {
            var ordered = new OrderedList();
            ordered.setMarkerStartNumber(node.path("attrs").path("start").intValue());
            ordered.setMarkerDelimiter(".");
            list = ordered;
        } else {
            var bullet = new BulletList();
            bullet.setMarker("-");
            list = bullet;
        }
        list.setTight(node.path("content").valueStream().allMatch(item -> item.path("content").size() == 1));
        for (JsonNode item : node.path("content")) {
            var li = new ListItem();
            if (tasks) li.appendChild(new TaskListItemMarker(item.path("attrs").path("checked").asBoolean(false)));
            appendBlocks(item, li);
            list.appendChild(li);
        }
        return list;
    }

    private static TableBlock markdownTable(JsonNode node) {
        var table = new TableBlock();
        var head = new TableHead();
        var body = new TableBody();
        table.appendChild(head);
        for (JsonNode row : node.path("content")) {
            var output = new TableRow();
            boolean header = head.getFirstChild() == null;
            for (JsonNode cell : row.path("content")) {
                var entry = new TableCell();
                entry.setHeader(header);
                String align = cell.path("attrs").path("align").asString("");
                if (!align.isEmpty()) entry.setAlignment(TableCell.Alignment.valueOf(align.toUpperCase(Locale.ROOT)));
                appendInlines(cell.path("content").get(0), entry);
                output.appendChild(entry);
            }
            (header ? head : body).appendChild(output);
        }
        if (body.getFirstChild() != null) table.appendChild(body);
        return table;
    }

    private static Node appendInlines(JsonNode node, Node target) {
        List<JsonNode> active = new ArrayList<>();
        List<Node> parents = new ArrayList<>();
        parents.add(target);
        for (JsonNode child : node.path("content")) {
            List<JsonNode> marks = child.path("marks").valueStream()
                .filter(mark -> List.of("bold", "italic", "strike", "link").contains(type(mark))).toList();
            int prefix = 0;
            while (prefix < Math.min(active.size(), marks.size()) && active.get(prefix).equals(marks.get(prefix))) prefix++;
            active.subList(prefix, active.size()).clear();
            parents.subList(prefix + 1, parents.size()).clear();
            for (JsonNode mark : marks.subList(prefix, marks.size())) {
                Node wrapper = mark(mark);
                parents.getLast().appendChild(wrapper);
                active.add(mark);
                parents.add(wrapper);
            }
            parents.getLast().appendChild(inline(child));
        }
        return target;
    }

    private static Node mark(JsonNode mark) {
        JsonNode attrs = mark.path("attrs");
        return switch (type(mark)) {
            case "bold" -> new StrongEmphasis("**");
            case "italic" -> new Emphasis("*");
            case "strike" -> new Strikethrough("~~");
            case "link" -> new Link(attrs.path("href").asString(), attrs.path("title").asString(null));
            default -> throw invalid("Formatação inline inválida.");
        };
    }

    private static Node inline(JsonNode node) {
        return switch (type(node)) {
            case "hardBreak" -> new HardLineBreak();
            case "media" -> {
                JsonNode attrs = node.path("attrs");
                String url = attrs.path("src").asString();
                String label = attrs.path("label").asString();
                if (attrs.path("kind").asString().equals("image")) {
                    var image = new Image(url, null);
                    image.appendChild(new Text(label));
                    yield image;
                }
                var link = new Link(url, null);
                link.appendChild(new Text(VIDEO + label));
                yield link;
            }
            case "text" -> {
                String value = node.path("text").asString();
                yield node.path("marks").valueStream().anyMatch(mark -> type(mark).equals("code")) ? new Code(value) : new Text(value);
            }
            default -> throw invalid("Conteúdo inline inválido.");
        };
    }
}
