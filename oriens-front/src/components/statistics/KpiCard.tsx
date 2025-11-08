import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {TrendingDown, TrendingUp } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: number; // Percentage variation (12.5, 20.0, etc...)
  description: string;
  additionalDescription?: string;
}

export function KpiCard({ title, value, change, description, additionalDescription }: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0;

  const formatChange = (changeValue: number) => {
    const sign = changeValue > 0 ? "+" : ""; 

    if (changeValue === 100 || changeValue === 0) {
      return `${sign}${changeValue}%`;
    } 
    else {
      return `${sign}${changeValue.toFixed(2)}%`;
    }
  };
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

       {change !== undefined && ( 
          <div
            className={cn(
              "flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs",
              isPositive ? "text-emerald-500" : "text-red-500" 
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{formatChange(change)}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-1">
        <div className="text-2xl font-semibold">{value}</div>

        <p className="font-medium line-clamp-1">
          {description}
        </p>

        {additionalDescription && (
          <p className="text-xs text-muted-foreground">
            {additionalDescription}
          </p>
        )}
      </CardContent>
    </Card>
  );
}