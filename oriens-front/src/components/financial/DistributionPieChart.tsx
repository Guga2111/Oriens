import { useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { EntryDTO, TagDTO } from '@/types/financial';
import { PieChart, Pie } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface DistributionPieChartProps {
  entries: EntryDTO[];
  tags: TagDTO[];
  period: { month: number; year: number };
}

export function DistributionPieChart({ entries, tags }: DistributionPieChartProps) {
  const { chartData, chartConfig, totalForPercentage } = useMemo(() => {
    if (entries.length === 0) return { chartData: [], chartConfig: {} as ChartConfig, totalForPercentage: 0 };

    // Filtrar despesas (valores negativos) e receitas (valores positivos)
    const expenses = entries.filter(entry => entry.amount < 0);
    const revenues = entries.filter(entry => entry.amount > 0);

    // Calcular totais
    const totalRevenues = revenues.reduce((sum, entry) => sum + entry.amount, 0);
    const totalExpenses = Math.abs(expenses.reduce((sum, entry) => sum + entry.amount, 0));
    const saldoLivre = totalRevenues - totalExpenses;

    // Se não há gastos e nem saldo, não mostra nada
    if (totalExpenses === 0 && saldoLivre <= 0) {
      return { chartData: [], chartConfig: {} as ChartConfig, totalForPercentage: 0 };
    }

    // Calcular total de gastos por tag (apenas despesas)
    const tagTotals = new Map<number, { name: string; color: string; amount: number }>();

    tags.forEach(tag => {
      const tagExpenses = expenses.filter(entry => entry.tagId === tag.id);
      const total = tagExpenses.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

      if (total > 0) {
        tagTotals.set(tag.id!, { name: tag.name, color: tag.color, amount: total });
      }
    });

    // Montar dados para o gráfico (gastos por tag)
    const data = Array.from(tagTotals.values()).map((tag, index) => ({
      category: `tag-${index}`,
      name: tag.name,
      value: tag.amount,
      fill: tag.color,
    }));

    // Adicionar saldo livre se positivo
    if (saldoLivre > 0) {
      data.push({
        category: 'saldo-livre',
        name: 'Saldo Livre',
        value: saldoLivre,
        fill: '#14B8A6', // teal-500
      });
    }

    // Criar configuração do chart
    const config: ChartConfig = {
      value: {
        label: 'Valor',
      },
    };

    // Adicionar cada item à configuração
    data.forEach((item) => {
      config[item.category] = {
        label: item.name,
        color: item.fill,
      };
    });

    // Usar a soma dos valores do gráfico para calcular porcentagens (evita divisão por zero)
    const totalForPercentage = data.reduce((sum, item) => sum + item.value, 0);

    return { chartData: data, chartConfig: config, totalForPercentage };
  }, [entries, tags]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Distribuição Atual</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado para exibir</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Distribuição Atual</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => {
                    const percentage = ((Number(value) / totalForPercentage) * 100).toFixed(1);
                    return (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{name}</span>
                        <span className="text-sm">
                          {formatCurrency(Number(value))} ({percentage}%)
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ payload }) => {
                const percentage = ((payload.value / totalForPercentage) * 100).toFixed(1);
                return `${percentage}%`;
              }}
              labelLine={true}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-3 text-sm pt-4">
        <div className="grid grid-cols-2 gap-2 w-full">
          {chartData.map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-xs truncate">{item.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {((item.value / totalForPercentage) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
