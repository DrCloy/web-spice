/**
 * WebSpice Circuit Type Definitions
 * Phase 1: Foundation Engine - Issue #1
 */

import type { Component, ComponentId, NodeId } from './component';

// =============================================================================
// Circuit Types
// =============================================================================

/** Node in the circuit (connection point) */
export interface Node {
  id: NodeId;
  name?: string;
  isGround: boolean;
  connectedComponents: ComponentId[];
}

/** Circuit definition */
export interface Circuit {
  id: string;
  name: string;
  description?: string;
  components: Component[];
  nodes: Node[];
  groundNodeId: NodeId;
}

// =============================================================================
// Matrix Types
// =============================================================================

/** Dense matrix representation using TypedArray for performance */
export interface Matrix {
  rows: number;
  cols: number;
  data: Float64Array; // Flattened row-major format
}

/** Vector representation using TypedArray for performance */
export interface Vector {
  length: number;
  data: Float64Array;
}

/** Sparse matrix entry */
export interface SparseEntry {
  row: number;
  col: number;
  value: number;
}

/** Sparse matrix in COO (Coordinate) format */
export interface SparseMatrix {
  rows: number;
  cols: number;
  entries: SparseEntry[];
}

/** Sparse matrix in CSR (Compressed Sparse Row) format for efficient operations */
export interface CSRMatrix {
  rows: number;
  cols: number;
  values: Float64Array; // Non-zero values
  columnIndices: Int32Array; // Column index for each value
  rowPointers: Int32Array; // Index where each row starts in values array
}

// =============================================================================
// Error Types
// =============================================================================

/** WebSpice error codes */
export type ErrorCode =
  | 'INVALID_COMPONENT'
  | 'INVALID_CIRCUIT'
  | 'NO_GROUND'
  | 'FLOATING_NODE'
  | 'SINGULAR_MATRIX'
  | 'CONVERGENCE_FAILED'
  | 'INVALID_PARAMETER'
  | 'UNSUPPORTED_ANALYSIS';

/** Context information for WebSpice errors */
export interface ErrorContext {
  componentId?: ComponentId;
  nodeId?: NodeId;
  [key: string]: unknown;
}

/** Custom error for WebSpice with debugging context */
export class WebSpiceError extends Error {
  public code: ErrorCode;
  public componentId?: ComponentId;
  public nodeId?: NodeId;
  public context?: ErrorContext;

  constructor(code: ErrorCode, message: string, context?: ErrorContext) {
    super(message);
    this.code = code;
    this.name = 'WebSpiceError';
    this.componentId = context?.componentId;
    this.nodeId = context?.nodeId;
    this.context = context;
  }
}

// =============================================================================
// JSON Schema Types (for parsing)
// =============================================================================

/** JSON representation of a component for parsing */
export interface ComponentJSON {
  id: string;
  type: string;
  name: string;
  nodes: string[];
  parameters: Record<string, number | string>;
}

/** JSON representation of a circuit for parsing */
export interface CircuitJSON {
  name: string;
  description?: string;
  components: ComponentJSON[];
  ground?: string;
}
