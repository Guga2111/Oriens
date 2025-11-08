import { CheckSquare, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 

const TermsOfServicePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-background via-accent/20 to-background text-foreground">

      <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">

        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-[var(--shadow-soft)] bg-gradient-primary">
              <CheckSquare className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Oriens
            </h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/auth")} 
            className="h-10 w-10 rounded-full"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </header>

        <Card className="border-border/50 shadow-[var(--shadow-medium)]">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Termos de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">
              Última atualização: 29 de Outubro de 2025
            </p>

            <section className="space-y-2 text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">1. Aceitação dos Termos</h2>
              <p>
                Bem-vindo ao Oriens ("Nós", "Nosso"). Ao acessar ou usar nosso aplicativo de gerenciamento de tarefas e projetos ("Serviço"), você concorda em cumprir e ficar vinculado a estes Termos de Serviço ("Termos"). Se você não concordar com estes Termos, não deverá usar o Serviço.
              </p>
            </section>

            <section className="space-y-2 text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">2. O Serviço</h2>
              <p>
                O Oriens fornece uma plataforma para organizar tarefas, gerenciar projetos e colaborar com equipes. O Serviço é fornecido "como está" e "conforme disponível". Reservamo-nos o direito de modificar, suspender ou descontinuar o Serviço (ou qualquer parte dele) a qualquer momento, com ou sem aviso prévio.
              </p>
            </section>

            <section className="space-y-2 text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">3. Contas de Usuário</h2>
              <p>
                Para usar certos recursos do Serviço, você deve se registrar para uma conta. Você concorda em fornecer informações precisas, atuais e completas durante o processo de registro e em atualizar tais informações para mantê-las precisas. Você é responsável por proteger sua senha e por todas as atividades que ocorrem em sua conta.
              </p>
            </section>

            <section className="space-y-2 text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">4. Conteúdo do Usuário</h2>
              <p>
                Você é o único responsável por todo o conteúdo (tarefas, projetos, comentários, etc.) que você cria, envia ou armazena no Serviço ("Conteúdo do Usuário"). Você retém a propriedade do seu Conteúdo do Usuário, mas nos concede uma licença mundial, não exclusiva e isenta de royalties para usar, armazenar, reproduzir e exibir seu Conteúdo do Usuário exclusivamente para fins de operação e fornecimento do Serviço.
              </p>
            </section>

             <section className="space-y-2 text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">5. Conduta Aceitável</h2>
              <p>
                Você concorda em não usar o Serviço para:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Violar qualquer lei ou regulamento aplicável.</li>
                <li>Carregar ou transmitir qualquer conteúdo ilegal, prejudicial, ameaçador ou difamatório.</li>
                <li>Tentar obter acesso não autorizado aos sistemas ou contas de outros usuários.</li>
                <li>Interferir ou interromper a integridade ou o desempenho do Serviço.</li>
              </ul>
            </section>

            <section className="space-y-2 text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">6. Rescisão</h2>
              <p>
                Podemos suspender ou encerrar seu acesso ao Serviço imediatamente, sem aviso prévio ou responsabilidade, por qualquer motivo, incluindo, sem limitação, se você violar estes Termos.
              </p>
            </section>

            <section className="space-y-2 text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">7. Limitação de Responsabilidade</h2>
              <p>
                Em nenhuma circunstância o Oriens será responsável por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos, ou qualquer perda de lucros ou receitas, incorridos direta ou indiretamente, ou qualquer perda de dados, uso, boa vontade ou outras perdas intangíveis.
              </p>
            </section>
            
            <section className="space-y-2 text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">8. Contato</h2>
              <p>
                Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco em luisgosampaiowork@gmail.com/luisgosampaio@gmail.com .
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
