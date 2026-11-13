import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OriensLogo } from "@/components/common/OriensLogo";
import { Github, Mail, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const highlights = [
  {
    title: "Planejamento por período",
    description:
      "Organize o dia em manhã, tarde e noite, com a lista completa sempre à vista.",
  },
  {
    title: "Visão semanal",
    description:
      "Veja a semana inteira de uma vez e salte para o dia que precisa.",
  },
  {
    title: "Lembretes no seu ritmo",
    description:
      "Notificações e som são opcionais e ficam em Configurações.",
  },
  {
    title: "Financeiro e projetos juntos",
    description:
      "Acompanhe gastos, projetos e objetivos no mesmo lugar.",
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background-brand">
      {/* Header */}
      <header className="px-4 md:px-6">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center">
          <Link to="/" className="flex items-center gap-2">
            <OriensLogo className="h-8 w-8" title="Oriens" />
            <span className="text-lg font-semibold tracking-tight">Oriens</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link to="/auth">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button>Criar conta</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <section className="w-full py-20 text-center md:py-24">
          <div className="mx-auto max-w-[1120px] px-4 md:px-6">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Organize suas tarefas com Oriens
            </h1>
            <p className="mx-auto mt-4 max-w-[640px] text-foreground md:text-lg">
              A solução completa e gratuita para gerenciar seu calendário e
              tarefas diárias. Sem mensalidades, sem limitações.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/auth">
                <Button size="lg">Começar agora</Button>
              </Link>
              <a href="#demo">
                <Button size="lg" variant="outline">
                  Ver demonstração
                </Button>
              </a>
            </div>
            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <li>100% gratuito</li>
              <li>Sem mensalidades</li>
              <li>Sem cartão de crédito</li>
            </ul>
          </div>
        </section>

        <section id="demo" className="w-full pb-20 md:pb-24">
          <div className="mx-auto max-w-[1120px] px-4 md:px-6">
            <img
              src="/oriens-tasks-screen.png"
              alt="Tela de hoje do Oriens com as tarefas do dia em três períodos"
              className="w-full rounded-xl"
            />
          </div>
        </section>

        <section
          id="features-detail"
          className="w-full bg-brand-burgundy py-20 text-brand-cream md:py-28"
        >
          <div className="mx-auto grid max-w-[1120px] gap-12 px-4 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                O dia inteiro em uma faixa
              </h2>
              <p className="mt-4 max-w-[52ch] text-brand-cream/80">
                O Oriens organiza o dia como um horizonte: a linha do dia
                mostra, de um vistazo, o que já passou e o que vem a seguir.
                Cada marca é uma tarefa que você abre em um clique.
              </p>

              <div
                aria-hidden
                className="mt-8 rounded-xl bg-brand-cream/5 p-5"
              >
                <div className="flex h-16 items-center gap-3 rounded-lg bg-brand-cream/10 px-4">
                  <span className="h-6 w-1 rounded-full bg-brand-cream/40" />
                  <span className="h-6 w-1 rounded-full bg-brand-cream/40" />
                  <span className="h-6 w-1 rounded-full bg-brand-yellow" />
                  <span className="h-6 w-1 rounded-full bg-brand-cream/40" />
                </div>
                <p className="mt-3 text-sm text-brand-cream/70">
                  Manhã, tarde e noite, com a contagem de concluídas sempre no
                  topo.
                </p>
              </div>
            </div>

            <dl className="flex flex-col gap-8">
              {highlights.map((highlight) => (
                <div key={highlight.title}>
                  <dt className="text-base font-semibold">{highlight.title}</dt>
                  <dd className="mt-1 text-brand-cream/75">
                    {highlight.description}
                  </dd>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <dt className="text-base font-semibold">
                  Lembretes no WhatsApp
                </dt>
                <dd>
                  <Badge className="border-brand-yellow/60 bg-brand-yellow/15 text-brand-yellow">
                    Em breve
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      <footer className="bg-background-brand py-16">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-8 px-4 text-center md:grid-cols-3 md:px-6 md:text-left">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <div className="flex items-center gap-2">
              <OriensLogo className="h-6 w-6" />
              <span className="text-lg font-semibold">Oriens</span>
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              Organize suas tarefas diárias sem custos
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 md:items-start">
            <h2 className="text-sm font-semibold text-foreground">Produto</h2>
            <a
              href="#features-detail"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Recursos
            </a>
            <Link
              to="/auth"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Criar conta
            </Link>
            <Link
              to="/auth"
              onClick={(e) => {
                e.preventDefault();
                toast.success("Em breve!", {
                  description: "A nossa documentação está sendo preparada.",
                });
              }}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Documentação
            </Link>
          </div>
          <div className="flex flex-col items-center gap-2 md:items-start">
            <h2 className="text-sm font-semibold text-foreground">Conecte-se</h2>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="icon">
                <a
                  href="https://github.com/Guga2111"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub do Oriens"
                >
                  <Github className="h-4 w-4" aria-hidden />
                </a>
              </Button>
              <Button asChild variant="outline" size="icon">
                <a
                  href="https://www.linkedin.com/in/luisgustavosampaio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn do Oriens"
                >
                  <Linkedin className="h-4 w-4" aria-hidden />
                </a>
              </Button>
              <Button asChild variant="outline" size="icon">
                <a href="mailto:luisgosampaio@gmail.com" aria-label="E-mail do Oriens">
                  <Mail className="h-4 w-4" aria-hidden />
                </a>
              </Button>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-[1120px] px-4 md:px-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Oriens. Desenvolvido com Spring Boot,
            React, Vite e TypeScript.
          </p>
        </div>
      </footer>
    </div>
  );
}
