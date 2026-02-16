
export type DiceType = 2 | 4 | 6 | 8 | 10 | 12 | 20 | string;

export const ThresholdType = {
  NONE: 'NONE',
  AT_LEAST: 'AT_LEAST',
  AT_MOST: 'AT_MOST',
  EXACTLY: 'EXACTLY',
  MATCH_ANY: 'MATCH_ANY'
} as const;

export type ThresholdType = typeof ThresholdType[keyof typeof ThresholdType];

export const PoolMode = {
  STANDARD: 'STANDARD',
  BLIND_BAG: 'BLIND_BAG'
} as const;

export type PoolMode = typeof PoolMode[keyof typeof PoolMode];

export interface RollResult {
  value: number | string;
  isSuccess?: boolean;
  color?: string;
  isCustom?: boolean;
  diceType: DiceType;
}

export interface CustomDieSide {
  id: string;
  content: string;
}

export interface CustomDieDefinition {
  id: string;
  name: string;
  color: string;
  sides: CustomDieSide[];
}

export interface RollEvent {
  id: string;
  poolName: string;
  timestamp: number;
  results: RollResult[];
  sum: number;
  successes: number;
  thresholdInfo: string;
  mode: PoolMode;
}

export interface DiceEntry {
  id: string;
  diceType: DiceType;
  count: number;
  color?: string;
  thresholdType: ThresholdType;
  threshold: number | string;
  targetValues: (string | number)[];
}

export interface DicePool {
  id: string;
  name: string;
  mode: PoolMode;
  entries: DiceEntry[]; 
  results: RollResult[];
  lastRolledAt: number | null;
  history: RollEvent[];
  availableColors: string[];
  bagDefinition: Record<string, number>;
  currentBag: string[];
}
