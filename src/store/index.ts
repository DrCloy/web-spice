import { configureStore } from '@reduxjs/toolkit';
import { analyzeDC } from '@/engine/analysis/dcAnalysis';
import circuitReducer from '@/store/circuitSlice';
import simulationReducer from '@/store/simulationSlice';
import editorReducer from '@/store/editorSlice';
import type { AppExtraArgument } from '@/store/types';

export const engineDeps: AppExtraArgument = { analyzeDC };

export const store = configureStore({
  reducer: {
    circuit: circuitReducer,
    simulation: simulationReducer,
    editor: editorReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      thunk: { extraArgument: engineDeps },
      // CircuitImpl is a class instance (with Map internals) stored until #18
      // migrates circuit state to a plain serializable object.
      serializableCheck: { ignoredPaths: ['circuit.current'] },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
