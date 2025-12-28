import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EntryDTO } from '@/types/financial';

interface PeriodOverviewCardProps {
  entries: EntryDTO[];
  period: { month: number; year: number };
  onPeriodChange: (direction: 'prev' | 'next' | 'today') => void;
}

export function PeriodOverviewCard({ entries, period, onPeriodChange }: PeriodOverviewCardProps) {
  const [showBalance, setShowBalance] = useState(true);

  const periodDate = useMemo(() => {
    return new Date(period.year, period.month);
  }, [period]);

  const summary = useMemo(() => {
    const receitas = entries
      .filter(entry => entry.amount > 0)
      .reduce((sum, entry) => sum + entry.amount, 0);

    const gastos = Math.abs(
      entries
        .filter(entry => entry.amount < 0)
        .reduce((sum, entry) => sum + entry.amount, 0)
    );

    const saldo = receitas - gastos;

    return { receitas, gastos, saldo };
  }, [entries]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPeriod = (date: Date): string => {
    const formatted = format(date, 'MMM yyyy', { locale: ptBR });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            {formatPeriod(periodDate)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPeriodChange('prev')}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPeriodChange('next')}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPeriodChange('today')}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Hoje
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Saldo Geral - Principal */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground mb-1.5">Saldo geral</p>
              <p className="text-3xl font-bold tabular-nums tracking-tight">
                {showBalance ? formatCurrency(summary.saldo) : 'R$ ••••••'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBalance(!showBalance)}
              aria-label={showBalance ? 'Ocultar saldo' : 'Exibir saldo'}
              className="hover:bg-accent mt-0.5"
            >
              {showBalance ? (
                <Eye className="h-5 w-5 text-muted-foreground" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </div>

          {/* Receitas e Gastos - Secundário */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {showBalance ? formatCurrency(summary.receitas) : 'R$ ••••••'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Gastos</p>
              <p className="text-lg font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                {showBalance ? formatCurrency(summary.gastos) : 'R$ ••••••'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
