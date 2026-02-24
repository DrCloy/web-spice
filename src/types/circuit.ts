/**
 * WebSpice Circuit Type Definitions
 */

import type {
  Component,
  ComponentId,
  ComponentType,
  NodeId,
} from './component';

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

/** Result of LU decomposition with partial pivoting (PA = LU) */
export interface LUResult {
  /** Combined LU matrix: upper triangle stores U, strict lower triangle stores L (unit diagonal implicit) */
  LU: Matrix;
  /** Permutation vector: row i of permuted system = row permutation[i] of original */
  permutation: Int32Array;
  /** Number of row swaps performed (for determinant sign) */
  swapCount: number;
  /** Size of the system (n x n) */
  size: number;
  /** Whether the matrix was found to be singular or near-singular */
  singular: boolean;
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
}

/** Custom error for WebSpice with debugging context */
export class WebSpiceError extends Error {
  public code: ErrorCode;
  public context?: ErrorContext;

  constructor(code: ErrorCode, message: string, context?: ErrorContext) {
    super(message);
    this.code = code;
    this.name = 'WebSpiceError';
    this.context = context;
  }

  /** Helper to get component ID from context */
  get componentId(): ComponentId | undefined {
    return this.context?.componentId;
  }

  /** Helper to get node ID from context */
  get nodeId(): NodeId | undefined {
    return this.context?.nodeId;
  }
}

// =============================================================================
// JSON Schema Types (for parsing)
// =============================================================================

/** JSON representation of a component for parsing */
export interface ComponentJSON {
  id: string;
  type: ComponentType;
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
