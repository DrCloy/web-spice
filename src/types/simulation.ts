/**
 * WebSpice Simulation Type Definitions
 */

import type { Complex, ComponentId, NodeId } from './component';

// =============================================================================
// Analysis Types
// =============================================================================

/** Types of circuit analysis */
export type AnalysisType = 'dc' | 'ac' | 'transient';

/** Base analysis configuration */
export interface BaseAnalysisConfig {
  type: AnalysisType;
}

/** DC analysis configuration */
export interface DCAnalysisConfig extends BaseAnalysisConfig {
  type: 'dc';
  // DC sweep parameters (optional)
  sweep?: {
    sourceId: ComponentId;
    /**
     * Starting value for the sweep.
     */
    startValue: number;
    /**
     * Ending value for the sweep.
     */
    endValue: number;
    /**
     * Step size for the sweep.
     * Must be a positive number.
     * If startValue < endValue, the sweep increments by stepValue; if startValue > endValue, the sweep decrements by stepValue.
     * The sweep includes both startValue and endValue if possible.
     * If the range is not evenly divisible by stepValue, the last step may not land exactly on endValue.
     */
    stepValue: number;
  };
}

/** AC analysis configuration */
export interface ACAnalysisConfig extends BaseAnalysisConfig {
  type: 'ac';
  startFrequency: number; // Hz
  endFrequency: number; // Hz
  pointsPerDecade: number; // Must be positive integer, typically 10-100
  sweepType: 'linear' | 'decade' | 'octave';
}

/** Transient analysis configuration */
export interface TransientAnalysisConfig extends BaseAnalysisConfig {
  type: 'transient';
  stopTime: number; // seconds
  timeStep: number; // seconds
  maxTimeStep?: number; // Maximum adaptive time step
}

/** Union type for analysis configurations */
export type AnalysisConfig =
  | DCAnalysisConfig
  | ACAnalysisConfig
  | TransientAnalysisConfig;

// =============================================================================
// Result Types
// =============================================================================

/** DC analysis result for a single operating point */
export interface DCOperatingPoint {
  nodeVoltages: Record<NodeId, number>; // JSON-serializable
  branchCurrents: Record<ComponentId, number>;
  componentPowers: Record<ComponentId, number>;
  timestamp?: number; // Result generation time
}

/** DC sweep result */
export interface DCSweepResult {
  sweepValues: number[];
  operatingPoints: DCOperatingPoint[];
}

/** DC analysis result */
export interface DCAnalysisResult {
  type: 'dc';
  operatingPoint: DCOperatingPoint;
  sweep?: DCSweepResult;
  convergenceInfo: ConvergenceInfo;
}

/** AC analysis result at a single frequency */
export interface ACFrequencyPoint {
  frequency: number;
  nodeVoltages: Record<NodeId, Complex>; // JSON-serializable
  branchCurrents: Record<ComponentId, Complex>;
}

/** AC analysis result */
export interface ACAnalysisResult {
  type: 'ac';
  frequencyPoints: ACFrequencyPoint[];
}

/** Transient analysis result */
export interface TransientAnalysisResult {
  type: 'transient';
  timePoints: number[];
  /**
   * For each node/component, the array of values corresponds by index to the timePoints array.
   * That is, nodeVoltages[node][i] and branchCurrents[component][i] are the values at timePoints[i].
   */
  nodeVoltages: Record<NodeId, number[]>; // JSON-serializable
  branchCurrents: Record<ComponentId, number[]>;
}

/** Union type for analysis results */
export type AnalysisResult =
  | DCAnalysisResult
  | ACAnalysisResult
  | TransientAnalysisResult;

// =============================================================================
// Solver Types
// =============================================================================

/** Convergence information for iterative solvers */
export interface ConvergenceInfo {
  converged: boolean;
  iterations: number;
  maxIterations: number;
  tolerance: number;
  finalError: number;
}

/** Solver options */
export interface SolverOptions {
  maxIterations: number;
  absoluteTolerance: number;
  relativeTolerance: number;
  pivotTolerance: number;
}

/** Default solver options (immutable) */
export const DEFAULT_SOLVER_OPTIONS = {
  maxIterations: 100,
  absoluteTolerance: 1e-12,
  relativeTolerance: 1e-3,
  pivotTolerance: 1e-13,
} as const satisfies SolverOptions;

// =============================================================================
// JSON Schema Types (for analysis)
// =============================================================================

/** JSON representation of analysis configuration */
export interface AnalysisJSON {
  type: AnalysisType;
  parameters: Record<string, number | string>;
}
