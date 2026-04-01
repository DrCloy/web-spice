import { describe, expect, it, vi } from 'vitest';
import simulationReducer, {
  clearResult,
  runDCAnalysis,
  setConfig,
  setSolverOptions,
} from '@/store/simulationSlice';
import type { SimulationState } from '@/store/types';
import type { AppExtraArgument, AppState } from '@/store/types';
import type { DCAnalysisResult } from '@/types/simulation';
import { DEFAULT_SOLVER_OPTIONS } from '@/types/simulation';
import { WebSpiceError } from '@/types/circuit';
import { VOLTAGE_DIVIDER_12V } from '../fixtures/circuits';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mockDCResult: DCAnalysisResult = {
  type: 'dc',
  operatingPoint: VOLTAGE_DIVIDER_12V.expectedResults,
  convergenceInfo: {
    converged: true,
    iterations: 1,
    maxIterations: 100,
    tolerance: 1e-12,
    finalError: 0,
  },
};

const dcConfig = { type: 'dc' as const };

const initialState: SimulationState = {
  status: 'idle',
  config: null,
  result: null,
  error: null,
  solverOptions: { ...DEFAULT_SOLVER_OPTIONS },
};

// ---------------------------------------------------------------------------
// Helper: build mock thunk arguments
// ---------------------------------------------------------------------------

function makeMockThunkArgs(overrides?: Partial<AppState['circuit']>) {
  const circuitState: AppState['circuit'] = {
    past: [],
    current: VOLTAGE_DIVIDER_12V.circuit,
    future: [],
    isDirty: false,
    ...overrides,
  };
  const mockState = {
    circuit: circuitState,
    simulation: { ...initialState },
  } as AppState;
  const dispatch = vi.fn();
  const getState = vi.fn().mockReturnValue(mockState);
  return { dispatch, getState };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('simulationSlice', () => {
  describe('initialState', () => {
    it('should have status=idle, null config/result/error, and DEFAULT_SOLVER_OPTIONS', () => {
      const state = simulationReducer(undefined, { type: '@@INIT' });
      expect(state).toEqual(initialState);
    });
  });

  describe('setConfig', () => {
    it('should store the given config', () => {
      const state = simulationReducer(initialState, setConfig(dcConfig));
      expect(state.config).toEqual(dcConfig);
    });
  });

  describe('setSolverOptions', () => {
    it('should merge partial options into solverOptions', () => {
      const state = simulationReducer(
        initialState,
        setSolverOptions({ maxIterations: 200, absoluteTolerance: 1e-9 })
      );
      expect(state.solverOptions.maxIterations).toBe(200);
      expect(state.solverOptions.absoluteTolerance).toBe(1e-9);
      // unchanged fields
      expect(state.solverOptions.relativeTolerance).toBe(
        DEFAULT_SOLVER_OPTIONS.relativeTolerance
      );
      expect(state.solverOptions.pivotTolerance).toBe(
        DEFAULT_SOLVER_OPTIONS.pivotTolerance
      );
    });
  });

  describe('clearResult', () => {
    it('should reset result, error, and status to idle', () => {
      const state = simulationReducer(
        {
          ...initialState,
          status: 'success',
          result: mockDCResult,
          error: { code: 'INVALID_CIRCUIT', message: 'oops' },
        },
        clearResult()
      );
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
      expect(state.status).toBe('idle');
    });
  });

  describe('runDCAnalysis', () => {
    describe('pending', () => {
      it('should set status=running and clear error while preserving result', () => {
        const stateWithResult: SimulationState = {
          ...initialState,
          status: 'success',
          result: mockDCResult,
          error: { code: 'INVALID_CIRCUIT', message: 'old' },
        };
        const action = runDCAnalysis.pending('req-id', {});
        const state = simulationReducer(stateWithResult, action);
        expect(state.status).toBe('running');
        expect(state.error).toBeNull();
        expect(state.result).toBe(mockDCResult);
      });
    });

    describe('fulfilled', () => {
      it('should set status=success and store result', async () => {
        const mockDeps: AppExtraArgument = {
          analyzeDC: vi.fn().mockReturnValue(mockDCResult),
        };
        const { dispatch, getState } = makeMockThunkArgs();

        await runDCAnalysis({})(dispatch, getState, mockDeps);

        const calls = dispatch.mock.calls.map(c => c[0]);
        const fulfilled = calls.find(
          a => a.type === runDCAnalysis.fulfilled.type
        );
        expect(fulfilled).toBeDefined();

        expect(mockDeps.analyzeDC).toHaveBeenCalledWith(
          VOLTAGE_DIVIDER_12V.circuit,
          undefined,
          DEFAULT_SOLVER_OPTIONS
        );

        const state = simulationReducer(initialState, fulfilled);
        expect(state.status).toBe('success');
        expect(state.result).toEqual(mockDCResult);
        expect(state.error).toBeNull();
      });
    });

    describe('rejected — circuit=null', () => {
      it('should set status=error with INVALID_CIRCUIT when no circuit is loaded', async () => {
        const mockDeps: AppExtraArgument = { analyzeDC: vi.fn() };
        const { dispatch, getState } = makeMockThunkArgs({ current: null });

        await runDCAnalysis({})(dispatch, getState, mockDeps);

        const calls = dispatch.mock.calls.map(c => c[0]);
        const rejected = calls.find(
          a => a.type === runDCAnalysis.rejected.type
        );
        expect(rejected).toBeDefined();

        const state = simulationReducer(initialState, rejected);
        expect(state.status).toBe('error');
        expect(state.error?.code).toBe('INVALID_CIRCUIT');
        expect(mockDeps.analyzeDC).not.toHaveBeenCalled();
      });
    });

    describe('rejected — WebSpiceError', () => {
      it('should map WebSpiceError to SimulationError and preserve previous result', async () => {
        const mockDeps: AppExtraArgument = {
          analyzeDC: vi.fn().mockImplementation(() => {
            throw new WebSpiceError('NO_GROUND', 'No ground node');
          }),
        };
        const { dispatch, getState } = makeMockThunkArgs();

        await runDCAnalysis({})(dispatch, getState, mockDeps);

        const calls = dispatch.mock.calls.map(c => c[0]);
        const rejected = calls.find(
          a => a.type === runDCAnalysis.rejected.type
        );

        const stateWithPrevResult: SimulationState = {
          ...initialState,
          result: mockDCResult,
        };
        const state = simulationReducer(stateWithPrevResult, rejected);
        expect(state.status).toBe('error');
        expect(state.error?.code).toBe('NO_GROUND');
        expect(state.result).toBe(mockDCResult);
      });
    });

    describe('rejected — unknown error', () => {
      it('should fall back to INVALID_CIRCUIT code and preserve previous result', async () => {
        const mockDeps: AppExtraArgument = {
          analyzeDC: vi.fn().mockImplementation(() => {
            throw new Error('unexpected');
          }),
        };
        const { dispatch, getState } = makeMockThunkArgs();

        await runDCAnalysis({})(dispatch, getState, mockDeps);

        const calls = dispatch.mock.calls.map(c => c[0]);
        const rejected = calls.find(
          a => a.type === runDCAnalysis.rejected.type
        );

        const stateWithPrevResult: SimulationState = {
          ...initialState,
          result: mockDCResult,
        };
        const state = simulationReducer(stateWithPrevResult, rejected);
        expect(state.status).toBe('error');
        expect(state.error?.code).toBe('INVALID_CIRCUIT');
        expect(state.result).toBe(mockDCResult);
      });
    });
  });
});
