export interface EntryDTO {
  id?: number;
  amount: number;
  entryDate: string; // "YYYY-MM-DD"
  description?: string;
  tagId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TagDTO {
  id?: number;
  name: string;
  color: string; // "#RRGGBB"
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
