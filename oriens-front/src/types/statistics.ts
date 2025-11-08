export interface ChartDataPoint {
  date: string;       
  completed: number;  
}

export interface KpiData {
  value: number;
  change: number | null;
  description: string;
  additionalDescription: string;
}

export interface DashboardKpis {
  completedTasks: KpiData;
  productivityRate: KpiData;
  overdueTasks: KpiData;
  activeProjects: KpiData;
}

export interface DashboardData {
  kpi: {
    kpis: DashboardKpis;
  };
  charts: {
    tasksCompletedByTimeRangeDTOS: ChartDataPoint[];
  };
}