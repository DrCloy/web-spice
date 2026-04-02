import type { Circuit, ErrorCode } from '@/types/circuit';
import type {
  AnalysisConfig,
  AnalysisResult,
  SolverOptions,
} from '@/types/simulation';
import type { analyzeDC } from '@/engine/analysis/dcAnalysis';
import type { EditorState } from '@/types/editor';

export const MAX_HISTORY = 50;

export interface CircuitState {
  past: (Circuit | null)[];
  current: Circuit | null;
  future: (Circuit | null)[];
  isDirty: boolean;
}

export type SimulationStatus = 'idle' | 'running' | 'success' | 'error';

export interface SimulationError {
  code: ErrorCode;
  message: string;
}

export interface SimulationState {
  status: SimulationStatus;
  config: AnalysisConfig | null;
  result: AnalysisResult | null;
  error: SimulationError | null;
  solverOptions: SolverOptions;
}

export interface AppState {
  circuit: CircuitState;
  simulation: SimulationState;
  editor: EditorState;
}

export type { EditorState };

export interface AppExtraArgument {
  analyzeDC: typeof analyzeDC;
}
