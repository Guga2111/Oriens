package com.oriens.oriens_api.configuration;

import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.dto.financial.FinancialCommands;
import com.oriens.oriens_api.entity.dto.financial.TagDTO;
import com.oriens.oriens_api.entity.dto.statistics.HabitViews;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.*;
import com.oriens.oriens_api.entity.dto.work.WorkHome.*;
import com.oriens.oriens_api.entity.embeddable.Location;
import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.repository.*;
import com.oriens.oriens_api.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Disposable development fixtures; an existing account is never modified or reseeded. */
@Component
@Profile("dev & !prod")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {
    static final String EMAIL = "luisgosampaio@gmail.com";
    private static final String DESCRIPTION_EXAMPLE = """
        ## Fluxo de revisão

        Acompanhe a publicação do portfólio da primeira versão até a entrega.

        ```mermaid
        flowchart LR
            draft[Rascunho] --> review[Revisão] --> done[Publicação]
        ```

        ## Etapas da entrega

        | Etapa | Responsável | Situação |
        | --- | --- | --- |
        | Preparar a página | Design | Concluída |
        | Revisar o conteúdo | Conteúdo | Em andamento |
        | Publicar o portfólio | Desenvolvimento | Pendente |

        - [x] Preparar a primeira versão
        - [ ] Conferir links e revisar o conteúdo
        - [ ] Publicar o portfólio
        """;
    private final UserRepository users;
    private final UserService userService;
    private final ProjectWorkService work;
    private final TaskDescriptionCodec descriptions;
    private final ProjectColumnRepository columns;
    private final TaskLabelService labels;
    private final HabitService habits;
    private final FinancialEntryService finances;
    private final TagService tags;
    private final NotificationRepository notifications;
    private final SupportTicketRepository tickets;
    private final WorkHomeService home;
    private final JdbcTemplate db;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Serializes concurrent dev startups even before the account has a row to lock.
        db.execute("select pg_advisory_xact_lock(1869769061, 1)");
        if (users.findByEmail(EMAIL).isPresent()) return;

        LocalDate today = LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE));
        User user = new User();
        user.setName("Luis Sampaio");
        user.setEmail(EMAIL);
        user.setPassword("12345678");
        user = userService.saveUser(user);
        Long owner = user.getId();
        List<Long> labelIds = createLabels(owner);
        Project board = createProjects(owner, today);
        createTasks(owner, board, labelIds, today);
        createHabits(owner, today);
        createFinances(owner, today);
        createMessages(user);
        home.createLink(owner, new LinkInput("Meu planejamento", "/tasks"));
        home.createLink(owner, new LinkInput("Finanças", "/financial"));
        home.createLink(owner, new LinkInput("Projeto de demonstração", "/tasks/project/" + board.getId()));
        home.visit(owner, new VisitInput(ResourceType.PROJECT, board.getId()));
        log.info("Development demonstration data initialized successfully");
    }

    private List<Long> createLabels(Long owner) {
        List<Long> ids = new ArrayList<>();
        String[] names = {"Urgente", "Trabalho", "Estudos", "Saúde", "Pessoal", "Rotina"};
        for (TaskLabelColor color : TaskLabelColor.values()) {
            ids.add(labels.create(owner, new LabelInput(names[color.ordinal()], color)).getId());
        }
        return ids;
    }

    private Project createProjects(Long owner, LocalDate today) {
        Project board = work.createProject(owner, new CreateProject("Lançamento do portfólio",
            ProjectMode.DEVELOPMENT, "Projeto de demonstração com tarefas, objetivos e quadro kanban.", null, List.of()));
        work.setFavorite(owner, board.getId(), board.getVersion(), true);
        String[] objectives = {"Ideias para a próxima versão", "Publicar o portfólio", "Construir as páginas",
            "Revisar conteúdo com calma", "Definir identidade e conteúdo", "Descartar proposta antiga"};
        for (ObjectiveStatus status : ObjectiveStatus.values()) {
            work.createObjective(owner, board.getId(), new CreateObjective(board.getVersion(), objectives[status.ordinal()],
                today.plusDays(14 + status.ordinal()), "Etapa de demonstração para explorar os detalhes do objetivo.",
                today.minusDays(7), status));
        }
        work.createProject(owner, new CreateProject("Viagem de férias", ProjectMode.SIMPLE,
            "Planejar roteiro, hospedagem e orçamento.", null,
            List.of(new NewObjective("Escolher o destino", today.plusDays(10)),
                new NewObjective("Reservar hospedagem", today.plusDays(20)))));
        work.createProject(owner, new CreateProject("Ideias para o futuro", ProjectMode.SIMPLE, null, null, List.of()));
        Project archived = work.createProject(owner, new CreateProject("Organização do semestre passado",
            ProjectMode.SIMPLE, "Exemplo de projeto arquivado.", null, List.of()));
        work.setArchived(owner, archived.getId(), archived.getVersion(), true);
        return board;
    }

    private void createTasks(Long owner, Project board, List<Long> labelIds, LocalDate today) {
        List<ProjectColumn> workflow = columns.findByProjectIdOrderByPositionAscIdAsc(board.getId());
        String[] titles = {"Explorar referências de portfólio", "Escrever apresentação pessoal", "Montar página de projetos",
            "Rever proposta antiga", "Publicar primeira versão"};
        for (Status status : Status.values()) {
            ProjectColumn column = workflow.stream().filter(value -> value.getKind() == status).findFirst().orElseThrow();
            work.createTask(owner, new CreateTask(titles[status.ordinal()], "Abra esta tarefa para explorar os campos e vínculos.",
                board.getId(), board.getVersion(), board.getObjectives().get(1).getId(), column.getId(),
                today, LocalTime.of(9 + status.ordinal(), 0), today.plusDays(3),
                Priority.values()[status.ordinal() % Priority.values().length], null, labelIds.subList(0, 2)));
        }
        work.createTask(owner, new CreateTask("Explorar o editor de descrição", null,
            board.getId(), board.getVersion(), null, null, today, null, null,
            Priority.MEDIUM, null, List.of(), descriptions.fromMarkdown(DESCRIPTION_EXAMPLE)));
        work.createTask(owner, new CreateTask("Comprar itens para a semana", "Lista pessoal sem vínculo com projeto.",
            null, null, null, null, today, LocalTime.of(18, 30), today, Priority.MEDIUM,
            new Location("Recife, PE", -8.0476, -34.8770), List.of(labelIds.get(4))));
        work.createTask(owner, new CreateTask("Agendar revisão de rotina", "Exemplo de tarefa atrasada.",
            null, null, null, null, today.minusDays(3), null, today.minusDays(1), Priority.HIGH, null, List.of()));
        work.createTask(owner, new CreateTask("Ler um livro novo", null,
            null, null, null, null, null, null, null, Priority.LOW, null, List.of(labelIds.get(2))));
        work.createTask(owner, new CreateTask("Preparar planejamento da próxima semana", null,
            null, null, null, null, today.plusDays(5), null, today.plusDays(7), Priority.MEDIUM, null, List.of()));
        // Historical fixtures cannot be created via today's completion transition.
        List<Object[]> history = new ArrayList<>();
        for (int daysAgo = 1; daysAgo <= 45; daysAgo++) {
            if (daysAgo % 4 == 0) continue;
            LocalDate date = today.minusDays(daysAgo);
            history.add(new Object[]{owner, "Revisão diária · " + date, date, date, date,
                date.atTime(9, 0).atZone(ProductClockConfiguration.ZONE).toOffsetDateTime()});
        }
        db.batchUpdate("""
            insert into tasks(user_id,title,status,priority,planned_date,due_date,completed_at,created_at,
                reminder_sent,overdue_notification_sent,version)
            values(?,?,'CONCLUDED','MEDIUM',?,?,?,?,true,true,0)
            """, history);
    }

    private void createHabits(Long owner, LocalDate today) {
        var reading = habits.create(owner, new HabitViews.Input("Ler por 20 minutos", List.of(1,2,3,4,5,6,7), null, today, null));
        habits.execute(owner, reading.id(), today, new HabitViews.Execution(reading.version(), true));
        habits.create(owner, new HabitViews.Input("Exercitar-se", null, 3, today, null));
        var paused = habits.create(owner, new HabitViews.Input("Estudar inglês", List.of(1,3,5), null, today, null));
        habits.pause(owner, paused.id(), new HabitViews.PauseInput(paused.version(), today, today.plusDays(3)));
        var archived = habits.create(owner, new HabitViews.Input("Meditar", List.of(1,2,3,4,5,6,7), null, today, null));
        habits.archive(owner, archived.id(), archived.version());
        habits.create(owner, new HabitViews.Input("Praticar um novo idioma", null, 2, today.plusDays(7), today.plusDays(60)));

        // Only the new demo account receives synthetic past schedules and executions.
        LocalDate start = today.minusDays(45);
        db.update("update habits set created_on=?,start_date=? where user_id=? and id=?", start, start, owner, reading.id());
        db.update("update habit_schedules set start_date=? where user_id=? and habit_id=?", start, owner, reading.id());
        List<Object[]> executions = new ArrayList<>();
        for (int daysAgo = 1; daysAgo <= 45; daysAgo++) {
            if (daysAgo % 3 != 0) executions.add(new Object[]{reading.id(), owner, today.minusDays(daysAgo)});
        }
        db.batchUpdate("insert into habit_executions(habit_id,user_id,execution_date) values(?,?,?)", executions);
    }

    private void createFinances(Long owner, LocalDate today) {
        List<TagDTO> defaults = tags.getDefaultTags(owner);
        Long salary = defaults.stream().filter(tag -> tag.getName().equals("Salário")).findFirst().orElseThrow().getId();
        Long fixed = defaults.stream().filter(tag -> tag.getName().equals("Gastos Fixos")).findFirst().orElseThrow().getId();
        TagDTO leisure = new TagDTO();
        leisure.setName("Lazer e viagens");
        leisure.setColor("#3B82F6");
        Long custom = tags.createTag(leisure, owner).getId();
        for (int month = 0; month < 3; month++) {
            LocalDate date = today.minusMonths(month).withDayOfMonth(1);
            entry(owner, salary, date, "6500.00", "Salário mensal", null);
            entry(owner, fixed, date.plusDays(1), "-1800.00", "Moradia", null);
            entry(owner, fixed, date.plusDays(2), "-450.50", "Mercado", null);
            entry(owner, custom, date, "-180.00", "Passeio e lazer", null);
        }
        for (RecurrencePattern pattern : RecurrencePattern.values()) {
            entry(owner, fixed, today, "-39.90", "Recorrência de demonstração · " + pattern, pattern);
        }
        entry(owner, custom, today.plusDays(7), "-250.00", "Reserva para viagem", null);
    }

    private void entry(Long owner, Long tag, LocalDate date, String amount, String description, RecurrencePattern recurrence) {
        var input = new FinancialCommands.Input(new BigDecimal(amount), date, description, tag,
            recurrence != null, recurrence, recurrence == null ? null : date.plusYears(1));
        finances.write(owner, "dev-seed", UUID.randomUUID().toString(), new FinancialCommands.Create(input));
    }

    private void createMessages(User user) {
        Notification welcome = new Notification("Bem-vindo! Explore seus projetos e tarefas de demonstração.", user);
        welcome.setLinkTo("/projects");
        Notification read = new Notification("Seu planejamento de demonstração está pronto.", user);
        read.setRead(true);
        read.setLinkTo("/tasks");
        notifications.saveAll(List.of(welcome, read));
        List<SupportTicket> examples = new ArrayList<>();
        for (TicketStatus status : TicketStatus.values()) {
            examples.add(SupportTicket.builder().user(user).userEmail(user.getEmail()).status(status)
                .priority(Priority.values()[status.ordinal()]).subject("Chamado de demonstração · " + status)
                .message("Exemplo fictício para visualizar o acompanhamento de suporte.").build());
        }
        // Persist fixtures without invoking the support service's external email delivery.
        tickets.saveAll(examples);
    }
}
