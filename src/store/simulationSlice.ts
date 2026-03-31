import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  AnalysisConfig,
  DCAnalysisConfig,
  DCAnalysisResult,
  SolverOptions,
} from '@/types/simulation';
import { DEFAULT_SOLVER_OPTIONS } from '@/types/simulation';
import { WebSpiceError } from '@/types/circuit';
import type {
  AppExtraArgument,
  AppState,
  SimulationError,
  SimulationState,
} from '@/store/types';

const initialState: SimulationState = {
  status: 'idle',
  config: null,
  result: null,
  error: null,
  solverOptions: { ...DEFAULT_SOLVER_OPTIONS },
};

export const runDCAnalysis = createAsyncThunk<
  DCAnalysisResult,
  { config?: DCAnalysisConfig },
  { state: AppState; extra: AppExtraArgument; rejectValue: SimulationError }
>(
  'simulation/runDCAnalysis',
  async ({ config }, { getState, extra, rejectWithValue }) => {
    const circuit = getState().circuit.current;
    if (!circuit) {
      return rejectWithValue({
        code: 'INVALID_CIRCUIT',
        message: 'No circuit loaded',
      });
    }
    try {
      const { solverOptions } = getState().simulation;
      return extra.analyzeDC(circuit, config, solverOptions);
    } catch (err) {
      if (err instanceof WebSpiceError) {
        return rejectWithValue({ code: err.code, message: err.message });
      }
      return rejectWithValue({ code: 'INVALID_CIRCUIT', message: String(err) });
    }
  }
);

const simulationSlice = createSlice({
  name: 'simulation',
  initialState,
  reducers: {
    setConfig(state, action: PayloadAction<AnalysisConfig>) {
      state.config = action.payload;
    },

    setSolverOptions(state, action: PayloadAction<Partial<SolverOptions>>) {
      state.solverOptions = { ...state.solverOptions, ...action.payload };
    },

    clearResult(state) {
      state.result = null;
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers: builder => {
    builder
      .addCase(runDCAnalysis.pending, state => {
        state.status = 'running';
        state.error = null;
      })
      .addCase(runDCAnalysis.fulfilled, (state, action) => {
        state.status = 'success';
        state.result = action.payload;
        state.error = null;
      })
      .addCase(runDCAnalysis.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? {
          code: 'INVALID_CIRCUIT',
          message: 'Unknown error',
        };
      });
  },
});

export const { setConfig, setSolverOptions, clearResult } =
  simulationSlice.actions;

export default simulationSlice.reducer;
