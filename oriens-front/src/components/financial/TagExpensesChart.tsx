import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { EntryDTO, TagDTO } from '@/types/financial';
import { BarChart, Bar, CartesianGrid, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface TagExpensesChartProps {
  entries: EntryDTO[];
  tags: TagDTO[];
}

export function TagExpensesChart({ entries, tags }: TagExpensesChartProps) {
  const { chartData, chartConfig, expenseTags } = useMemo(() => {
    const now = new Date();
    const last6Months: Date[] = [];

    for (let i = 5; i >= 0; i--) {
      last6Months.push(subMonths(now, i));
    }

    // Filtrar apenas despesas (amount < 0)
    const expenses = entries.filter(entry => entry.amount < 0);

    // Identificar quais tags têm despesas (excluir tags de receita como Salário)
    const tagsWithExpenses = tags.filter(tag => {
      return expenses.some(entry => entry.tagId === tag.id);
    });

    // Agrupar por mês e tag
    const monthlyData = last6Months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM', { locale: ptBR });

      const dataPoint: any = {
        month: monthLabel,
      };

      tagsWithExpenses.forEach(tag => {
        const tagExpenses = expenses.filter(entry => {
          const entryDate = parseISO(entry.entryDate);
          return (
            entry.tagId === tag.id &&
            entryDate >= monthStart &&
            entryDate <= monthEnd
          );
        });

        const total = Math.abs(
          tagExpenses.reduce((sum, entry) => sum + entry.amount, 0)
        );

        dataPoint[tag.name] = total;
      });

      return dataPoint;
    });

    // Criar configuração do chart apenas para tags com despesas
    const config: ChartConfig = {};
    tagsWithExpenses.forEach((tag) => {
      config[tag.name] = {
        label: tag.name,
        color: tag.color,
      };
    });

    return { chartData: monthlyData, chartConfig: config, expenseTags: tagsWithExpenses };
  }, [entries, tags]);

  const hasData = useMemo(() => {
    return chartData.some(month =>
      expenseTags.some(tag => month[tag.name] > 0)
    );
  }, [chartData, expenseTags]);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Custos por Tag (Últimos 6 Meses)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado de gastos disponível</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Calcular total de gastos dos últimos 6 meses
  const totalExpenses = useMemo(() => {
    return chartData.reduce((total, month) => {
      return total + expenseTags.reduce((sum, tag) => sum + (month[tag.name] || 0), 0);
    }, 0);
  }, [chartData, expenseTags]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Custos por Tag (Últimos 6 Meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const tag = expenseTags.find(t => t.name === name);
                    return (
                      <div className="flex items-center gap-2">
                        {tag && (
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                        )}
                        <span className="font-medium">{name}</span>
                        <span className="ml-auto">{formatCurrency(Number(value))}</span>
                      </div>
                    );
                  }}
                  labelFormatter={(label) => `${label}`}
                  className="min-w-[200px]"
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {expenseTags.map((tag, index) => (
              <Bar
                key={tag.id}
                dataKey={tag.name}
                stackId="a"
                fill={tag.color}
                radius={index === 0 ? [0, 0, 4, 4] : index === expenseTags.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="leading-none text-muted-foreground">
          Total de gastos: <span className="font-medium text-foreground">{formatCurrency(totalExpenses)}</span>
        </div>
        <div className="leading-none text-muted-foreground">
          Mostrando distribuição de despesas dos últimos 6 meses por categoria
        </div>
      </CardFooter>
    </Card>
  );
}
