import { configureStore } from '@reduxjs/toolkit';
import { analyzeDC } from '@/engine/analysis/dcAnalysis';
import circuitReducer from '@/store/circuitSlice';
import simulationReducer from '@/store/simulationSlice';
import type { AppExtraArgument } from '@/store/types';

export const engineDeps: AppExtraArgument = { analyzeDC };

export const store = configureStore({
  reducer: {
    circuit: circuitReducer,
    simulation: simulationReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({ thunk: { extraArgument: engineDeps } }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
