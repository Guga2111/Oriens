import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageCircle } from "lucide-react";

interface SummaryAsideProps {
  totalTasks: number;
  concludedTasks: number;
  pendingTasks: number;
  progress: number;
}

export function SummaryAside({
  totalTasks,
  concludedTasks,
  pendingTasks,
  progress,
}: SummaryAsideProps) {
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
              className="h-2 rounded-full bg-gradient-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6 border-primary/30 bg-primary/10">
        <CardHeader className="p-0">
          <div className="flex items-center gap-2 p-6 pb-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-primary">Integração WhatsApp</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <p className="text-sm text-primary/80 mb-4">
            Receba lembretes e compartilhe suas tarefas diretamente pelo WhatsApp.
          </p>
          <Button className="w-full text-primary-foreground bg-gradient-primary hover:opacity-80 transition-opacity">
            Conectar WhatsApp
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}