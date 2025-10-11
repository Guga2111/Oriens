import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckSquare, Check, Calendar, BarChart, Github, Twitter, Mail, Linkedin,
  Shield, LayoutGrid, 
  Clock, Lock, Smartphone,
  LayoutList, CalendarDays, Bell, MessageCircle, Cloud,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <Link to="/" className="flex items-center" onClick={() => window.location.reload()}>
            <img src="/oriens-logo.png" 
            alt="Logo da Oriens" 
            className="h-[60px] w-auto"/>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link to="/auth">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/auth">
            <Button className="text-primary-foreground bg-gradient-primary hover:opacity-80 transition-opacity">
              Registrar
            </Button>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Secção Hero - Padding ajustado */}
        <section className="w-full py-20 md:py-24 lg:py-26 text-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6">
              <Badge variant="outline" className="border-primary/50 text-primary">
                ● Organize seu dia sem custos
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
                Organize suas tarefas <br /> com <span className="bg-gradient-primary bg-clip-text text-transparent">Oriens</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                A solução completa e gratuita para gerenciar seu calendário e tarefas diárias. Sem mensalidades, sem limitações.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="text-primary-foreground bg-gradient-primary hover:opacity-80 transition-opacity">
                    Começar agora →
                  </Button>
                </Link>
                {/* Link "Ver demonstração" agora aponta para a secção de features */}
                <a href="/#features-detail">
                  <Button size="lg" variant="outline">
                    Ver demonstração
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 pt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> 100% Gratuito
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Calendário Integrado
                </div>
                <div className="flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-primary" /> Dashboard de Produtividade
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- NOVA SECÇÃO DE DEMONSTRAÇÃO (Imagem de fundo) --- */}
        <section id="demo" className="w-full pb-20 md:pb-24 lg:pb-32">
          <div className="container px-4 md:px-6">
            <div className="relative mx-auto max-w-5xl">
              <img
                src="/oriens-tasks-screen.png" // Aponta para a imagem na sua pasta 'public/images'
                alt="Dashboard do Oriens em funcionamento"
                className="rounded-xl border border-border/50 shadow-2xl shadow-primary/10"
              />
            </div>
          </div>
        </section>

        {/* Secção de Features - Padding ajustado e animações adicionadas */}
        <section id="features-detail" className="w-full py-20 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6 text-center">
            <div className="max-w-[800px] mx-auto space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter">
                Tudo que você precisa para <span className="bg-gradient-primary bg-clip-text text-transparent">produtividade máxima</span>
              </h2>
              <p className="text-muted-foreground md:text-xl">
                Recursos poderosos para organizar sua rotina sem complicação
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              
              {/* Card 1: Planeamento Diário */}
              <div className="bg-card p-6 rounded-lg text-left border border-border/50 transition-transform duration-300 hover:-translate-y-2">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <LayoutList className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Planeamento Diário por Período</h3>
                <p className="text-muted-foreground">
                  Organize o seu dia de forma intuitiva, dividindo as suas tarefas em Manhã, Tarde e Noite para uma visão clara e focada.
                </p>
              </div>

              {/* Card 2: Visão Semanal */}
              <div className="bg-card p-6 rounded-lg text-left border border-primary/50 transition-transform duration-300 hover:-translate-y-2">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Visão Semanal Estratégica</h3>
                <p className="text-muted-foreground">
                  Planeie a sua semana com antecedência. A nossa vista semanal ajuda-o a distribuir a carga de trabalho e a antecipar compromissos.
                </p>
              </div>

              {/* Card 3: Lembretes Automáticos */}
              <div className="bg-card p-6 rounded-lg text-left border border-border/50 transition-transform duration-300 hover:-translate-y-2">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Lembretes Automáticos</h3>
                <p className="text-muted-foreground">
                  Nunca mais perca um prazo. Receba notificações sobre tarefas atrasadas e lembretes antes dos seus compromissos.
                </p>
              </div>

              {/* Card 4: Integração com WhatsApp */}
              <div className="bg-card p-6 rounded-lg text-left border border-border/50 transition-transform duration-300 hover:-translate-y-2">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Integração com WhatsApp</h3>
                <p className="text-muted-foreground">
                  Receba o seu plano do dia e insights de produtividade com IA diretamente no seu WhatsApp. A sua organização, na sua mão.
                </p>
              </div>

              {/* Card 5: Dashboard de Produtividade */}
              <div className="bg-card p-6 rounded-lg text-left border border-border/50 transition-transform duration-300 hover:-translate-y-2">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <BarChart className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Dashboard de Produtividade</h3>
                <p className="text-muted-foreground">
                  Acompanhe o seu progresso diário. Veja quantas tarefas concluiu e mantenha-se motivado com um resumo visual do seu desempenho.
                </p>
              </div>

              {/* Card 6: Acesso Multiplataforma */}
              <div className="bg-card p-6 rounded-lg text-left border border-border/50 transition-transform duration-300 hover:-translate-y-2">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Acesso Multiplataforma</h3>
                <p className="text-muted-foreground">
                  Hospedado na nuvem AWS, o Oriens sincroniza as suas tarefas para que você possa aceder e gerir o seu dia a partir de qualquer dispositivo.
                </p>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/20 border-t border-border/50 py-12">
        <div className="container grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-2">
            <h3 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">Oriens</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Organize suas tarefas diárias sem custos
            </p>
          </div>
          <div className="flex flex-col items-center md:items-start gap-2">
            <h4 className="font-semibold tracking-wider text-foreground">Produto</h4>
<a href="#features-detail" className="text-sm text-muted-foreground hover:text-primary">
              Recursos
            </a>
            <Link 
              to="#" 
              onClick={(e) => {
                e.preventDefault();
                toast({ title: "Em breve!", description: "A nossa documentação está a ser preparada." });
              }}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Documentação
            </Link>
            <Link 
              to="#" 
              onClick={(e) => {
                e.preventDefault();
                toast({ title: "Em breve!", description: "O nosso roadmap será publicado em breve." });
              }}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Roadmap
            </Link>
          </div>
          <div className="flex flex-col items-center md:items-start gap-2">
            <h4 className="font-semibold tracking-wider text-foreground">Conecte-se</h4>
            <div className="flex gap-2">
              <a href="https://github.com/Guga2111" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon"><Github className="h-4 w-4" /></Button>
              </a>
              <a href="https://www.linkedin.com/in/luisgustavosampaio/" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon"><Linkedin className="h-4 w-4" /></Button>
              </a>
              <a href="mailto:luisgosampaio@gmail.com">
                <Button variant="outline" size="icon"><Mail className="h-4 w-4" /></Button>
              </a>
            </div>
          </div>
        </div>
        <div className="container mt-8">
          <Separator />
          <p className="pt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Oriens. Desenvolvido com Spring Boot, React, Vite e TypeScript.
          </p>
        </div>
      </footer>
    </div>
  );
}