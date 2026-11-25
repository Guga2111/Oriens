export interface FinancialInput {
  amount: number;
  entryDate: string;
  description?: string | null;
  tagId: number;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern | null;
  recurrenceEndDate?: string | null;
}

export interface EntryDTO extends FinancialInput {
  id: number;
  version: number;
  parentEntryId?: number | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export enum RecurrencePattern {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  BIWEEKLY = "BIWEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  SEMIANNUALLY = "SEMIANNUALLY",
  YEARLY = "YEARLY"
}

export const RecurrencePatternLabels: Record<RecurrencePattern, string> = {
  [RecurrencePattern.DAILY]: "Diário",
  [RecurrencePattern.WEEKLY]: "Semanal",
  [RecurrencePattern.BIWEEKLY]: "Quinzenal",
  [RecurrencePattern.MONTHLY]: "Mensal",
  [RecurrencePattern.QUARTERLY]: "Trimestral",
  [RecurrencePattern.SEMIANNUALLY]: "Semestral",
  [RecurrencePattern.YEARLY]: "Anual"
}

export interface TagDTO {
  id?: number;
  name: string;
  color: string; 
  isDefault?: boolean;
  createdAt?: string;
}

export interface PeriodSummary {
  receitas: number;
  gastos: number;
  saldo: number;
}

export interface EntryFilters {
  tagId: number | null;
  search: string;
  startDate: string | null;
  endDate: string | null;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  last: boolean;
  first: boolean;
}
