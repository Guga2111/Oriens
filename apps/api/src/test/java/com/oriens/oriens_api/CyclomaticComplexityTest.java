package com.oriens.oriens_api;

import com.sun.source.tree.CaseTree;
import com.sun.source.tree.ClassTree;
import com.sun.source.tree.LambdaExpressionTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.Tree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.TreePath;
import com.sun.source.util.TreePathScanner;
import com.sun.source.util.TreeScanner;
import com.sun.source.util.Trees;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaFileObject;
import javax.tools.ToolProvider;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class CyclomaticComplexityTest {
    private static final int LIMIT = 20;
    private static final Path SOURCES = Path.of("src/main/java");
    private static final Path BASELINE = Path.of("src/test/resources/complexity-baseline.tsv");

    @Test
    void productionFunctionsStayWithinTheirComplexityBudget() throws Exception {
        Map<String, Integer> baseline = new HashMap<>();
        for (String row : Files.readAllLines(BASELINE)) {
            if (row.isBlank() || row.startsWith("#")) continue;
            String[] fields = row.split("\\t");
            assertThat(baseline.put(fields[0], Integer.parseInt(fields[1])))
                    .as("duplicate exception %s", fields[0]).isNull();
        }

        List<String> violations = findViolations(SOURCES, baseline);
        assertThat(baseline).as("exceções sem método correspondente").isEmpty();
        assertThat(violations).as("limite de complexidade ou exceção a remover").isEmpty();
    }

    @Test
    void newMethodAboveTheLimitIsReported(@TempDir Path source) throws Exception {
        String branches = IntStream.range(0, LIMIT)
                .mapToObj(value -> "if (input == " + value + ") return " + value + ";")
                .collect(Collectors.joining("\n"));
        Files.writeString(source.resolve("Probe.java"),
                "class Probe { int score(int input) {\n" + branches + "\nreturn -1; } }");

        assertThat(findViolations(source, new HashMap<>()))
                .singleElement().asString().contains("Probe.score(int)", "21 (limite 20");
    }

    private static List<String> findViolations(Path sources, Map<String, Integer> baseline) throws Exception {
        List<String> violations = new ArrayList<>();
        var compiler = ToolProvider.getSystemJavaCompiler();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        try (var paths = Files.walk(sources);
             var fileManager = compiler.getStandardFileManager(diagnostics, null, null)) {
            var files = paths.filter(path -> path.toString().endsWith(".java")).sorted().toList();
            assertThat(files).isNotEmpty();
            var task = (JavacTask) compiler.getTask(null, fileManager, diagnostics,
                    List.of("-proc:none"), null, fileManager.getJavaFileObjectsFromPaths(files));
            var positions = Trees.instance(task).getSourcePositions();
            for (var unit : task.parse()) {
                String file = sources.toAbsolutePath().relativize(Path.of(unit.getSourceFile().toUri())).toString();
                new TreePathScanner<Void, Void>() {
                    private final Map<String, Integer> lambdaCounts = new HashMap<>();

                    @Override
                    public Void visitMethod(MethodTree method, Void unused) {
                        if (method.getBody() != null) {
                            check(method.getBody(), symbol(getCurrentPath()), method);
                        }
                        return super.visitMethod(method, unused);
                    }

                    @Override
                    public Void visitLambdaExpression(LambdaExpressionTree lambda, Void unused) {
                        String scope = file;
                        for (var path = getCurrentPath().getParentPath(); path != null; path = path.getParentPath()) {
                            if (path.getLeaf() instanceof MethodTree) {
                                scope = symbol(path);
                                break;
                            }
                        }
                        int position = lambdaCounts.merge(scope, 1, Integer::sum);
                        check(lambda.getBody(), scope + "/lambda[" + position + "]", lambda);
                        return super.visitLambdaExpression(lambda, unused);
                    }

                    private String symbol(TreePath path) {
                        var method = (MethodTree) path.getLeaf();
                        var owner = (ClassTree) path.getParentPath().getLeaf();
                        String parameters = method.getParameters().stream()
                                .map(parameter -> parameter.getType().toString())
                                .collect(Collectors.joining(","));
                        return file + "#" + owner.getSimpleName() + "." + method.getName() + "(" + parameters + ")";
                    }

                    private void check(Tree body, String symbol, Tree declaration) {
                        int score = 1 + new Decisions().scan(body, null);
                        Integer previous = baseline.remove(symbol);
                        int maximum = previous == null ? LIMIT : previous;
                        if (score > maximum || (previous != null && score <= LIMIT)) {
                            long line = unit.getLineMap().getLineNumber(positions.getStartPosition(unit, declaration));
                            violations.add("%s\\t%d (limite %d, linha %d)".formatted(symbol, score, maximum, line));
                        }
                    }
                }.scan(unit, null);
            }
        }
        assertThat(diagnostics.getDiagnostics()).noneMatch(diagnostic -> diagnostic.getKind() == Diagnostic.Kind.ERROR);
        return violations;
    }

    private static final class Decisions extends TreeScanner<Integer, Void> {
        @Override
        public Integer scan(Tree tree, Void unused) {
            if (tree == null) return 0;
            return switch (tree.getKind()) {
                case CLASS, INTERFACE, ENUM, RECORD, ANNOTATION_TYPE, LAMBDA_EXPRESSION -> 0;
                case IF, CONDITIONAL_EXPRESSION, CONDITIONAL_AND, CONDITIONAL_OR, CATCH,
                     FOR_LOOP, ENHANCED_FOR_LOOP, WHILE_LOOP, DO_WHILE_LOOP -> 1 + value(super.scan(tree, unused));
                default -> value(super.scan(tree, unused));
            };
        }

        @Override
        public Integer visitCase(CaseTree branch, Void unused) {
            boolean otherwise = branch.getLabels().stream()
                    .anyMatch(label -> label.getKind() == Tree.Kind.DEFAULT_CASE_LABEL);
            return (otherwise ? 0 : 1) + (branch.getGuard() == null ? 0 : 1) + value(super.visitCase(branch, unused));
        }

        @Override
        public Integer reduce(Integer first, Integer second) {
            return value(first) + value(second);
        }

        private int value(Integer score) {
            return score == null ? 0 : score;
        }
    }
}
