/**
 * Performance benchmark fixtures for testing solver performance
 * These fixtures provide circuits of varying complexity for benchmarking
 */

import type { Circuit } from '@/types/circuit';
import {
  createParallelResistors,
  createSeriesResistors,
} from '../factories/circuits';
import {
  createTestGround,
  createTestResistor,
  createTestVoltageSource,
} from '../factories/components';
import { createTestCircuit } from '../factories/circuits';

/**
 * Performance benchmark fixture
 */
export interface PerformanceBenchmark {
  circuit: Circuit;
  description: string;
  expectedComplexity: 'O(n)' | 'O(n^2)' | 'O(n^3)';
  nodeCount: number;
  componentCount: number;
}

/**
 * Small circuit for baseline performance (10 nodes)
 *
 * Simple series resistor chain
 */
export const SMALL_CIRCUIT_10_NODES: PerformanceBenchmark = (() => {
  const circuit = createSeriesResistors({
    voltage: 12,
    resistances: Array(10).fill(1000),
  });
  circuit.id = 'perf-small-10-resistors';
  circuit.name = 'Performance: Small Circuit (10 resistors)';
  return {
    circuit,
    description: 'Small circuit with 10 resistors (12 nodes)',
    expectedComplexity: 'O(n)' as const,
    nodeCount: 12, // Nodes 0-11 (10 resistors create 12 nodes total)
    componentCount: 12, // 10 resistors + voltage source + ground
  };
})();

/**
 * Medium circuit for moderate performance testing (100 nodes)
 *
 * Series resistor chain
 */
export const MEDIUM_CIRCUIT_100_NODES: PerformanceBenchmark = (() => {
  const circuit = createSeriesResistors({
    voltage: 12,
    resistances: Array(100).fill(1000),
  });
  circuit.id = 'perf-medium-100-resistors';
  circuit.name = 'Performance: Medium Circuit (100 resistors)';
  return {
    circuit,
    description: 'Medium circuit with 100 resistors (102 nodes)',
    expectedComplexity: 'O(n^2)' as const,
    nodeCount: 102, // Nodes 0-101
    componentCount: 102, // 100 resistors + voltage source + ground
  };
})();

/**
 * Large circuit for stress testing (1000 nodes)
 *
 * Series resistor chain - tests solver scalability
 */
export const LARGE_CIRCUIT_1000_NODES: PerformanceBenchmark = (() => {
  const circuit = createSeriesResistors({
    voltage: 12,
    resistances: Array(1000).fill(1000),
  });
  circuit.id = 'perf-large-1000-resistors';
  circuit.name = 'Performance: Large Circuit (1000 resistors)';
  return {
    circuit,
    description: 'Large circuit with 1000 resistors (1002 nodes)',
    expectedComplexity: 'O(n^3)' as const,
    nodeCount: 1002, // Nodes 0-1001
    componentCount: 1002, // 1000 resistors + voltage source + ground
  };
})();

/**
 * Dense circuit with many connections (100 parallel resistors)
 *
 * All resistors share the same two nodes - creates dense matrix
 */
export const DENSE_MATRIX_CIRCUIT: PerformanceBenchmark = (() => {
  const circuit = createParallelResistors({
    voltage: 12,
    resistances: Array(100)
      .fill(0)
      .map((_, i) => 1000 * (i + 1)),
  });
  circuit.id = 'perf-dense-100-parallel';
  circuit.name = 'Performance: Dense Circuit (100 parallel resistors)';
  return {
    circuit,
    description: 'Dense circuit with 100 parallel resistors (dense matrix)',
    expectedComplexity: 'O(n^3)' as const,
    nodeCount: 2, // Only voltage and ground nodes
    componentCount: 102, // 100 resistors + voltage source + ground
  };
})();

/**
 * Sparse circuit with minimal connections (ladder network)
 *
 * Creates a sparse matrix - most elements are zero
 *
 * Circuit (simplified):
 *   V1 -- R1 -- R2 -- R3 -- ... -- GND
 *         |     |     |
 *         R     R     R
 *         |     |     |
 *         GND   GND   GND
 */
export function createSparseCircuit(size: number): Circuit {
  const components = [];

  // Add voltage source
  components.push(
    createTestVoltageSource({
      id: 'V1',
      voltage: 12,
      nodes: ['1', '0'],
    })
  );

  // Create ladder network (series resistors with shunt resistors to ground)
  for (let i = 0; i < size; i++) {
    const node1 = `${i + 1}`;
    const node2 = `${i + 2}`;

    // Series resistor
    components.push(
      createTestResistor({
        id: `R_series_${i + 1}`,
        resistance: 1000,
        nodes: [node1, node2] as [string, string],
      })
    );

    // Shunt resistor to ground
    components.push(
      createTestResistor({
        id: `R_shunt_${i + 1}`,
        resistance: 10000,
        nodes: [node1, '0'],
      })
    );
  }

  // Add ground
  components.push(createTestGround({ id: 'GND', nodeId: '0' }));

  return createTestCircuit({
    id: 'sparse-ladder-network',
    name: 'Sparse Ladder Network',
    description: `Ladder network with ${size} stages (sparse matrix)`,
    components,
    groundNodeId: '0',
  });
}

/**
 * Sparse ladder network (50 stages)
 */
export const SPARSE_CIRCUIT_50_NODES: PerformanceBenchmark = (() => {
  const circuit = createSparseCircuit(50);
  circuit.id = 'perf-sparse-ladder-50';
  circuit.name = 'Performance: Sparse Ladder (50 stages)';
  return {
    circuit,
    description: 'Sparse ladder network with 50 stages (sparse matrix)',
    expectedComplexity: 'O(n^2)' as const,
    nodeCount: 51, // 50 stages + ground
    componentCount: 102, // 50 series + 50 shunt resistors + voltage + ground
  };
})();

/**
 * Ill-conditioned circuit (very large and very small resistances)
 *
 * Tests numerical stability when resistance values span many orders of magnitude
 *
 * Circuit:
 *   V1(12V) -- R1(1Ω) -- R2(1MΩ) -- R3(1Ω) -- GND
 */
export const ILL_CONDITIONED_CIRCUIT: PerformanceBenchmark = (() => {
  const circuit = createSeriesResistors({
    voltage: 12,
    resistances: [
      1, // 1Ω
      1000000, // 1MΩ (6 orders of magnitude difference)
      1, // 1Ω
      1000000, // 1MΩ
      1, // 1Ω
    ],
  });
  circuit.id = 'perf-ill-conditioned';
  circuit.name = 'Performance: Ill-Conditioned Circuit';
  return {
    circuit,
    description:
      'Ill-conditioned circuit with resistance values spanning 6 orders of magnitude',
    expectedComplexity: 'O(n)' as const,
    nodeCount: 6,
    componentCount: 7,
  };
})();

/**
 * Well-conditioned circuit (all similar resistances)
 *
 * Good numerical properties - baseline for comparison with ill-conditioned
 */
export const WELL_CONDITIONED_CIRCUIT: PerformanceBenchmark = (() => {
  const circuit = createSeriesResistors({
    voltage: 12,
    resistances: [1000, 1200, 900, 1100, 1000], // All within 20% of nominal
  });
  circuit.id = 'perf-well-conditioned';
  circuit.name = 'Performance: Well-Conditioned Circuit';
  return {
    circuit,
    description: 'Well-conditioned circuit with similar resistance values',
    expectedComplexity: 'O(n)' as const,
    nodeCount: 6,
    componentCount: 7,
  };
})();

/**
 * Resistor mesh network (grid topology)
 *
 * Creates a 2D mesh of resistors - tests multi-path circuits
 *
 * Circuit (5x5 grid):
 *   V1 -- R -- R -- R -- R -- R
 *         |    |    |    |    |
 *         R -- R -- R -- R -- R
 *         |    |    |    |    |
 *         R -- R -- R -- R -- R
 *         |    |    |    |    |
 *         R -- R -- R -- R -- R
 *         |    |    |    |    |
 *         GND  GND  GND  GND  GND
 */
export function createMeshNetwork(rows: number, cols: number): Circuit {
  const components = [];

  // Add voltage source at top-left corner
  components.push(
    createTestVoltageSource({
      id: 'V1',
      voltage: 12,
      nodes: ['0_0', '0'],
    })
  );

  // Create horizontal resistors
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const node1 = `${r}_${c}`;
      const node2 = `${r}_${c + 1}`;
      components.push(
        createTestResistor({
          id: `R_h_${r}_${c}`,
          resistance: 1000,
          nodes: [node1, node2] as [string, string],
        })
      );
    }
  }

  // Create vertical resistors
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const node1 = `${r}_${c}`;
      const node2 = `${r + 1}_${c}`;
      components.push(
        createTestResistor({
          id: `R_v_${r}_${c}`,
          resistance: 1000,
          nodes: [node1, node2] as [string, string],
        })
      );
    }
  }

  // Connect bottom row to ground
  for (let c = 0; c < cols; c++) {
    const node = `${rows - 1}_${c}`;
    components.push(
      createTestResistor({
        id: `R_gnd_${c}`,
        resistance: 1000,
        nodes: [node, '0'],
      })
    );
  }

  // Add ground
  components.push(createTestGround({ id: 'GND', nodeId: '0' }));

  return createTestCircuit({
    id: `mesh-network-${rows}x${cols}`,
    name: `Mesh Network ${rows}x${cols}`,
    description: `2D resistor mesh with ${rows} rows and ${cols} columns`,
    components,
    groundNodeId: '0',
  });
}

/**
 * Small mesh network (5x5)
 */
export const MESH_NETWORK_5X5: PerformanceBenchmark = (() => {
  const circuit = createMeshNetwork(5, 5);
  circuit.id = 'perf-mesh-5x5';
  circuit.name = 'Performance: 5x5 Mesh Network';
  return {
    circuit,
    description: '5x5 resistor mesh network (25 nodes)',
    expectedComplexity: 'O(n^3)' as const,
    nodeCount: 25, // 5x5 grid
    componentCount: 40 + 5 + 2, // 40 mesh resistors + 5 ground resistors + voltage + ground
  };
})();

/**
 * All performance benchmark fixtures
 */
export const ALL_PERFORMANCE_BENCHMARKS: PerformanceBenchmark[] = [
  SMALL_CIRCUIT_10_NODES,
  MEDIUM_CIRCUIT_100_NODES,
  DENSE_MATRIX_CIRCUIT,
  SPARSE_CIRCUIT_50_NODES,
  ILL_CONDITIONED_CIRCUIT,
  WELL_CONDITIONED_CIRCUIT,
  MESH_NETWORK_5X5,
  // Large circuit commented out for normal testing (uncomment for stress tests)
  // LARGE_CIRCUIT_1000_NODES,
];

/**
 * Stress test benchmarks (very large circuits)
 * Only run these in dedicated performance testing
 */
export const STRESS_TEST_BENCHMARKS: PerformanceBenchmark[] = [
  LARGE_CIRCUIT_1000_NODES,
  {
    circuit: createMeshNetwork(10, 10),
    description: '10x10 resistor mesh network (100 nodes)',
    expectedComplexity: 'O(n^3)',
    nodeCount: 100,
    componentCount: 180 + 10 + 2,
  },
];
