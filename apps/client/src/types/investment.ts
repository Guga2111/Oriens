/** Manual portfolio contract (`/financial/user/{userId}/investments`). Money arrives as decimal strings. */
export type AssetClass = "FIXED_INCOME" | "STOCKS" | "REAL_ESTATE_FUNDS" | "OTHER";
export type MovementType = "CONTRIBUTION" | "WITHDRAWAL" | "INCOME";
/** VALUED and ESTIMATED carry a position; NEEDS_VALUATION and UNAVAILABLE stay out of the total. */
export type PositionStatus = "VALUED" | "ESTIMATED" | "NEEDS_VALUATION" | "UNAVAILABLE";

export interface Valuation {
  id: number;
  investmentId: number;
  amount: string;
  valuedOn: string;
  version: number;
  createdAt: string;
}

export interface Investment {
  id: number;
  name: string;
  assetClass: AssetClass;
  version: number;
  position: string | null;
  positionStatus: PositionStatus;
  lastValuation: Valuation | null;
  createdAt: string;
}

export interface Movement {
  id: number;
  investmentId: number;
  type: MovementType;
  amount: string;
  occurredOn: string;
  description: string | null;
  entryId: number;
  version: number;
  createdAt: string;
}

export interface ClassTotal {
  assetClass: AssetClass;
  total: string;
  investments: number;
}

/** `total` covers `covered` of `investments`; it is partial when they differ. */
export interface InvestmentSummary {
  total: string;
  covered: number;
  investments: number;
  netContributions: string;
  incomeReceived: string;
  composition: ClassTotal[];
}

export interface InvestmentCreate {
  name: string;
  assetClass: AssetClass;
  initialValue: number;
  valuedOn: string;
}

export interface InvestmentPatch {
  name?: string;
  assetClass?: AssetClass;
}

export interface ValuationInput {
  amount: number;
  valuedOn: string;
}

export interface MovementInput {
  type: MovementType;
  amount: number;
  occurredOn: string;
  description: string | null;
}

export interface MovementFilters {
  investmentId?: number;
  page: number;
}
