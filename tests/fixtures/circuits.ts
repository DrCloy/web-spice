/**
 * Circuit fixtures with known solutions for testing
 * These fixtures provide test cases with analytically verified results
 * Also includes circuit pattern functions (voltage divider, series, parallel, etc.)
 */

import type { Circuit } from '@/types/circuit';
import type { Component, NodeId } from '@/types/component';
import type { DCOperatingPoint } from '@/types/simulation';
import { createTestCircuit } from '../factories/circuits';
import {
  createDCVoltageSource,
  createGround,
  createResistor,
} from '../factories/components';

/**
 * Circuit fixture with expected results
 */
export interface CircuitFixture {
  circuit: Circuit;
  expectedResults: DCOperatingPoint;
  description: string;
}

/**
 * Creates a simple voltage divider circuit
 *
 * Circuit:
 *   V1(+) -- R1 -- Node1 -- R2 -- GND
 *
 * @example
 * const circuit = createVoltageDivider({
 *   inputVoltage: 12,
 *   r1: 1000,
 *   r2: 2000
 * });
 */
export function createVoltageDivider(params?: {
  inputVoltage?: number;
  r1?: number;
  r2?: number;
}): Circuit {
  const { inputVoltage = 12, r1 = 1000, r2 = 2000 } = params || {};

  const v1 = createDCVoltageSource({
    id: 'V1',
    name: 'Input Voltage',
    voltage: inputVoltage,
    nodes: ['1', '0'],
  });

  const resistor1 = createResistor({
    id: 'R1',
    name: 'R1',
    resistance: r1,
    nodes: ['1', '2'],
  });

  const resistor2 = createResistor({
    id: 'R2',
    name: 'R2',
    resistance: r2,
    nodes: ['2', '0'],
  });

  const ground = createGround({
    id: 'GND',
    nodeId: '0',
  });

  return createTestCircuit({
    id: 'voltage-divider',
    name: 'Voltage Divider',
    description: `Voltage divider with V=${inputVoltage}V, R1=${r1}Ω, R2=${r2}Ω`,
    components: [v1, resistor1, resistor2, ground],
    groundNodeId: '0',
  });
}

/**
 * Creates a simple series resistor circuit
 *
 * Circuit:
 *   V1(+) -- R1 -- R2 -- R3 -- GND
 *
 * @example
 * const circuit = createSeriesResistors({
 *   voltage: 12,
 *   resistances: [100, 200, 300]
 * });
 */
export function createSeriesResistors(params?: {
  voltage?: number;
  resistances?: number[];
}): Circuit {
  const { voltage = 12, resistances = [100, 200, 300] } = params || {};

  const components: Component[] = [];

  // Create voltage source
  components.push(
    createDCVoltageSource({
      id: 'V1',
      name: 'Input Voltage',
      voltage,
      nodes: ['1', '0'],
    })
  );

  // Create series resistors
  resistances.forEach((resistance, index) => {
    const nodeA = (index + 1).toString();
    const nodeB = (index + 2).toString();
    components.push(
      createResistor({
        id: `R${index + 1}`,
        name: `R${index + 1}`,
        resistance,
        nodes: [nodeA, nodeB] as [NodeId, NodeId],
      })
    );
  });

  // Create ground
  components.push(
    createGround({
      id: 'GND',
      nodeId: '0',
    })
  );

  return createTestCircuit({
    id: 'series-resistors',
    name: 'Series Resistors',
    description: `Series resistors with V=${voltage}V, R=[${resistances.join(', ')}]Ω`,
    components,
    groundNodeId: '0',
  });
}

/**
 * Creates a parallel resistor circuit
 *
 * Circuit:
 *        +-- R1 --+
 *   V1 -+-- R2 --+-- GND
 *        +-- R3 --+
 *
 * @example
 * const circuit = createParallelResistors({
 *   voltage: 12,
 *   resistances: [100, 200, 300]
 * });
 */
export function createParallelResistors(params?: {
  voltage?: number;
  resistances?: number[];
}): Circuit {
  const { voltage = 12, resistances = [100, 200, 300] } = params || {};

  const components: Component[] = [];

  // Create voltage source
  components.push(
    createDCVoltageSource({
      id: 'V1',
      name: 'Input Voltage',
      voltage,
      nodes: ['1', '0'],
    })
  );

  // Create parallel resistors (all connected between node 1 and ground)
  resistances.forEach((resistance, index) => {
    components.push(
      createResistor({
        id: `R${index + 1}`,
        name: `R${index + 1}`,
        resistance,
        nodes: ['1', '0'],
      })
    );
  });

  // Create ground
  components.push(
    createGround({
      id: 'GND',
      nodeId: '0',
    })
  );

  return createTestCircuit({
    id: 'parallel-resistors',
    name: 'Parallel Resistors',
    description: `Parallel resistors with V=${voltage}V, R=[${resistances.join(', ')}]Ω`,
    components,
    groundNodeId: '0',
  });
}

/**
 * Simple voltage divider: 12V across 1kΩ and 2kΩ resistors
 *
 * Circuit:
 *   V1(12V) -- R1(1kΩ) -- Node2 -- R2(2kΩ) -- GND
 *
 * Expected results:
 *   - Total resistance: 3kΩ
 *   - Current: I = 12V / 3000Ω = 0.004A = 4mA
 *   - V(Node1) = 12V (voltage source)
 *   - V(Node2) = I × R2 = 0.004 × 2000 = 8V
 *   - V(GND) = 0V
 */
export const VOLTAGE_DIVIDER_12V: CircuitFixture = (() => {
  const circuit = createVoltageDivider({
    inputVoltage: 12,
    r1: 1000,
    r2: 2000,
  });
  circuit.id = 'fixture-voltage-divider-12v';
  circuit.name = 'Fixture: Voltage Divider 12V';
  return {
    circuit,
    expectedResults: {
      nodeVoltages: {
        '0': 0, // Ground
        '1': 12, // Voltage source positive terminal
        '2': 8, // Middle node (voltage divider output)
      },
      branchCurrents: {
        V1: 0.004, // 4mA through voltage source
        R1: 0.004, // 4mA through R1
        R2: 0.004, // 4mA through R2
      },
      componentPowers: {
        V1: -0.048, // -48mW (source supplies power)
        R1: 0.016, // 16mW dissipated in R1
        R2: 0.032, // 32mW dissipated in R2
      },
    },
    description: 'Simple voltage divider with 1:2 ratio',
  };
})();

/**
 * Single resistor circuit: 10V across 1kΩ
 *
 * Circuit:
 *   V1(10V) -- R1(1kΩ) -- GND
 *
 * Expected results:
 *   - Current: I = 10V / 1000Ω = 0.01A = 10mA
 *   - Power: P = V × I = 10 × 0.01 = 0.1W = 100mW
 */
export const SIMPLE_RESISTOR_10V: CircuitFixture = (() => {
  const circuit = createSeriesResistors({
    voltage: 10,
    resistances: [1000],
  });
  circuit.id = 'fixture-simple-resistor-10v';
  circuit.name = 'Fixture: Simple Resistor 10V';
  return {
    circuit,
    expectedResults: {
      nodeVoltages: {
        '0': 0, // Ground
        '1': 10, // Voltage source positive terminal
        '2': 0, // After R1 (connects to ground)
      },
      branchCurrents: {
        V1: 0.01, // 10mA
        R1: 0.01, // 10mA
      },
      componentPowers: {
        V1: -0.1, // -100mW (source supplies)
        R1: 0.1, // 100mW dissipated
      },
    },
    description: 'Single resistor - simplest possible circuit',
  };
})();

/**
 * Series resistors: 9V across three equal 1kΩ resistors
 *
 * Circuit:
 *   V1(9V) -- R1(1kΩ) -- Node2 -- R2(1kΩ) -- Node3 -- R3(1kΩ) -- GND
 *
 * Expected results:
 *   - Total resistance: 3kΩ
 *   - Current: I = 9V / 3000Ω = 0.003A = 3mA
 *   - V(Node2) = 9 - 3 = 6V
 *   - V(Node3) = 6 - 3 = 3V
 */
export const SERIES_RESISTORS_EQUAL: CircuitFixture = (() => {
  const circuit = createSeriesResistors({
    voltage: 9,
    resistances: [1000, 1000, 1000],
  });
  circuit.id = 'fixture-series-equal';
  circuit.name = 'Fixture: Series Resistors Equal';
  return {
    circuit,
    expectedResults: {
      nodeVoltages: {
        '0': 0, // Ground
        '1': 9, // Voltage source
        '2': 6, // After R1
        '3': 3, // After R2
        '4': 0, // After R3 (ground)
      },
      branchCurrents: {
        V1: 0.003, // 3mA
        R1: 0.003, // 3mA
        R2: 0.003, // 3mA
        R3: 0.003, // 3mA
      },
      componentPowers: {
        V1: -0.027, // -27mW
        R1: 0.009, // 9mW
        R2: 0.009, // 9mW
        R3: 0.009, // 9mW
      },
    },
    description: 'Three equal resistors in series',
  };
})();

/**
 * Parallel resistors: 12V across three resistors (100Ω, 200Ω, 300Ω)
 *
 * Circuit:
 *        +-- R1(100Ω) --+
 *   V1 -+-- R2(200Ω) --+-- GND
 *        +-- R3(300Ω) --+
 *
 * Expected results:
 *   - I1 = 12V / 100Ω = 0.12A = 120mA
 *   - I2 = 12V / 200Ω = 0.06A = 60mA
 *   - I3 = 12V / 300Ω = 0.04A = 40mA
 *   - Total current = 0.22A = 220mA
 */
export const PARALLEL_RESISTORS_MIXED: CircuitFixture = (() => {
  const circuit = createParallelResistors({
    voltage: 12,
    resistances: [100, 200, 300],
  });
  circuit.id = 'fixture-parallel-mixed';
  circuit.name = 'Fixture: Parallel Resistors Mixed';
  return {
    circuit,
    expectedResults: {
      nodeVoltages: {
        '0': 0, // Ground
        '1': 12, // All resistors connected here
      },
      branchCurrents: {
        V1: 0.22, // Total: 220mA
        R1: 0.12, // 120mA
        R2: 0.06, // 60mA
        R3: 0.04, // 40mA
      },
      componentPowers: {
        V1: -2.64, // -2.64W (source)
        R1: 1.44, // 1.44W
        R2: 0.72, // 0.72W
        R3: 0.48, // 0.48W
      },
    },
    description: 'Three different resistors in parallel',
  };
})();
/**
 * Very small voltage and resistance (boundary test)
 *
 * Circuit:
 *   V1(1mV) -- R1(1Ω) -- GND
 *
 * Expected results:
 *   - Current: I = 0.001V / 1Ω = 0.001A = 1mA
 */
export const BOUNDARY_SMALL_VALUES: CircuitFixture = (() => {
  const circuit = createSeriesResistors({
    voltage: 0.001,
    resistances: [1],
  });
  circuit.id = 'fixture-boundary-small';
  circuit.name = 'Fixture: Boundary Small Values';
  return {
    circuit,
    expectedResults: {
      nodeVoltages: {
        '0': 0,
        '1': 0.001,
        '2': 0,
      },
      branchCurrents: {
        V1: 0.001,
        R1: 0.001,
      },
      componentPowers: {
        V1: -0.000001, // -1μW
        R1: 0.000001, // 1μW
      },
    },
    description: 'Boundary test with very small values',
  };
})();

/**
 * Large voltage and resistance (boundary test)
 *
 * Circuit:
 *   V1(1000V) -- R1(1MΩ) -- GND
 *
 * Expected results:
 *   - Current: I = 1000V / 1000000Ω = 0.001A = 1mA
 */
export const BOUNDARY_LARGE_VALUES: CircuitFixture = (() => {
  const circuit = createSeriesResistors({
    voltage: 1000,
    resistances: [1000000],
  });
  circuit.id = 'fixture-boundary-large';
  circuit.name = 'Fixture: Boundary Large Values';
  return {
    circuit,
    expectedResults: {
      nodeVoltages: {
        '0': 0,
        '1': 1000,
        '2': 0,
      },
      branchCurrents: {
        V1: 0.001,
        R1: 0.001,
      },
      componentPowers: {
        V1: -1, // -1W
        R1: 1, // 1W
      },
    },
    description: 'Boundary test with large values',
  };
})();

/**
 * All circuit fixtures for iteration in tests
 */
export const ALL_CIRCUIT_FIXTURES: CircuitFixture[] = [
  VOLTAGE_DIVIDER_12V,
  SIMPLE_RESISTOR_10V,
  SERIES_RESISTORS_EQUAL,
  PARALLEL_RESISTORS_MIXED,
  BOUNDARY_SMALL_VALUES,
  BOUNDARY_LARGE_VALUES,
];
