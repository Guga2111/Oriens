import { CartesianGrid, LabelList, Line, LineChart, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useMemo, useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group"

export const description = "A line chart with a label"

interface ReusableLineChartCardProps {
  title: string;
  description: string;
  fullData: any[];
  dataKey: string;
  chartConfig: ChartConfig;
}

type FilterPeriod = "7days" | "30days" | "year";

export function ReusableLineChartCard({
  title,
  description,
  fullData,
  dataKey,
  chartConfig,
}: ReusableLineChartCardProps) {

  const [filter, setFilter] = useState<FilterPeriod>("30days");

  const filteredData = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();

    if (filter === "7days") {
      cutoff.setDate(now.getDate() - 7);
    } else if (filter === "30days") {
      cutoff.setMonth(now.getMonth() - 1);
    } else { 
      cutoff.setFullYear(now.getFullYear() - 1);
    }
    
    return (fullData ?? []).filter(item => new Date(item.date) >= cutoff);
  }, [fullData, filter]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="p-2 grid gap-2">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>

        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => value && setFilter(value as FilterPeriod)}
          className="gap-1"
          size="sm"
        >
          <ToggleGroupItem value="7days" aria-label="Last 7 days">
            7D
          </ToggleGroupItem>
          <ToggleGroupItem value="30days" aria-label="Last 30 days">
            30D
          </ToggleGroupItem>
          <ToggleGroupItem value="year" aria-label="Last year">
            1A
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>

        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <LineChart
            accessibilityLayer
            data={filteredData}
            margin={{
              top: 35,
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                  timeZone: 'UTC' 
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />

            <Line
              dataKey={dataKey} 
              type="natural"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ 
                fill: "hsl(var(--primary))",
              }}
              activeDot={{
                r: 6, 
              }}
            >
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
              />
            </Line>

          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
