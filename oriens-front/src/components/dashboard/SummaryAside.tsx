import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, CheckCircle } from "lucide-react";

interface SummaryAsideProps {
  totalTasks: number;
  concludedTasks: number;
  pendingTasks: number;
  progress: number;
  userPhoneNumber?: string | null;
  onPhoneNumberUpdated?: () => void;
}

/**
 * A7 (P0.3): nenhum CTA é renderizado sem efeito — "Conectar WhatsApp" e
 * "Alterar Número" abriam um diálogo que não existe (isWhatsAppDialogOpen
 * nunca era consumido). O formulário de conexão só chega com o BE1, no PR 2;
 * aqui o card fica apenas informativo.
 */
export function SummaryAside({
  totalTasks,
  concludedTasks,
  pendingTasks,
  progress,
  userPhoneNumber,
}: SummaryAsideProps) {
  const isPhoneNumberConnected = !!userPhoneNumber;

  return (
    <aside className="w-80 border-l border-border p-6 hidden lg:block bg-white dark:bg-card">
      <Card>
        <CardHeader>
          <CardTitle>Resumo do dia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{totalTasks}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Concluídas</span>
            <span className="font-semibold text-orange-400">{concludedTasks}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pendentes</span>
            <span className="font-semibold text-orange-500">{pendingTasks}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/20">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6 border-primary/30 bg-primary/10">
        <CardHeader className="p-0">
          <div className="flex items-center gap-2 p-6 pb-2">
            {isPhoneNumberConnected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <MessageCircle className="h-5 w-5 text-primary" />
            )}
            <CardTitle className="text-primary">
              {isPhoneNumberConnected ? "WhatsApp Conectado" : "Integração WhatsApp"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {isPhoneNumberConnected ? (
            <>
              <p className="text-sm text-green-700 dark:text-green-400 mb-2 font-medium">
                Você receberá lembretes 15 minutos antes!
              </p>
              <p className="text-xs text-muted-foreground">
                {userPhoneNumber}
              </p>
            </>
          ) : (
            <p className="text-sm text-primary/80">
              Receba lembretes das suas tarefas 15 minutos antes pelo WhatsApp.
            </p>
          )}
        </CardContent>
      </Card>

    </aside>
  );
}
