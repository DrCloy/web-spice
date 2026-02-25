/**
 * Tests for circuit fixtures
 */

import { describe, expect, it } from 'vitest';
import {
  ALL_CIRCUIT_FIXTURES,
  SIMPLE_RESISTOR_10V,
  VOLTAGE_DIVIDER_12V,
  createParallelResistors,
  createSeriesResistors,
  createVoltageDivider,
} from './circuits';
import { ALL_ERROR_FIXTURES, FLOATING_NODE_ERROR } from './error-cases';
import {
  ALL_PERFORMANCE_BENCHMARKS,
  SMALL_CIRCUIT_10_NODES,
  createMeshNetwork,
  createSparseCircuit,
} from './performance';
import { validateCircuit } from '../utils/helpers';

describe('Circuit Fixtures', () => {
  describe('Circuit Builder Functions', () => {
    describe('createVoltageDivider', () => {
      it('should create voltage divider with default values', () => {
        const circuit = createVoltageDivider();

        expect(circuit.id).toBe('voltage-divider');
        expect(circuit.name).toBe('Voltage Divider');
        expect(circuit.components).toHaveLength(4); // V1, R1, R2, GND
      });

      it('should have correct component values', () => {
        const circuit = createVoltageDivider({
          inputVoltage: 10,
          r1: 2000,
          r2: 3000,
        });

        const voltageSource = circuit.components.find(c => c.id === 'V1');
        expect(voltageSource?.type).toBe('voltage_source');
        if (
          voltageSource?.type === 'voltage_source' &&
          voltageSource.sourceType === 'dc'
        ) {
          expect(voltageSource.voltage).toBe(10);
        }

        const r1 = circuit.components.find(c => c.id === 'R1');
        expect(r1?.type).toBe('resistor');
        if (r1?.type === 'resistor') {
          expect(r1.resistance).toBe(2000);
        }

        const r2 = circuit.components.find(c => c.id === 'R2');
        expect(r2?.type).toBe('resistor');
        if (r2?.type === 'resistor') {
          expect(r2.resistance).toBe(3000);
        }
      });

      it('should have correct node connections', () => {
        const circuit = createVoltageDivider();

        // Should have nodes: 0 (ground), 1 (V+), 2 (middle)
        expect(circuit.nodes).toHaveLength(3);

        const groundNode = circuit.nodes.find(n => n.isGround);
        expect(groundNode?.id).toBe('0');
      });
    });

    describe('createSeriesResistors', () => {
      it('should create series circuit with default values', () => {
        const circuit = createSeriesResistors();

        expect(circuit.id).toBe('series-resistors');
        expect(circuit.components).toHaveLength(5); // V1 + 3 resistors + GND
      });

      it('should create correct number of resistors', () => {
        const circuit = createSeriesResistors({
          resistances: [100, 200, 300, 400, 500],
        });

        const resistors = circuit.components.filter(c => c.type === 'resistor');
        expect(resistors).toHaveLength(5);
      });

      it('should have resistors in series configuration', () => {
        const circuit = createSeriesResistors({
          voltage: 9,
          resistances: [1000, 2000, 3000],
        });

        // Check that resistors connect sequentially
        const r1 = circuit.components.find(c => c.id === 'R1');
        const r2 = circuit.components.find(c => c.id === 'R2');
        const r3 = circuit.components.find(c => c.id === 'R3');

        expect(r1?.type).toBe('resistor');
        expect(r2?.type).toBe('resistor');
        expect(r3?.type).toBe('resistor');

        if (
          r1?.type === 'resistor' &&
          r2?.type === 'resistor' &&
          r3?.type === 'resistor'
        ) {
          // R1 connects node 1 to node 2
          expect(r1.terminals[0].nodeId).toBe('1');
          expect(r1.terminals[1].nodeId).toBe('2');

          // R2 connects node 2 to node 3
          expect(r2.terminals[0].nodeId).toBe('2');
          expect(r2.terminals[1].nodeId).toBe('3');

          // R3 connects node 3 to ground (node 0)
          expect(r3.terminals[0].nodeId).toBe('3');
          expect(r3.terminals[1].nodeId).toBe('0');
        }
      });
    });

    describe('createParallelResistors', () => {
      it('should create parallel circuit with default values', () => {
        const circuit = createParallelResistors();

        expect(circuit.id).toBe('parallel-resistors');
        expect(circuit.components).toHaveLength(5); // V1 + 3 resistors + GND
      });

      it('should have resistors in parallel configuration', () => {
        const circuit = createParallelResistors({
          voltage: 12,
          resistances: [100, 200, 300],
        });

        const resistors = circuit.components.filter(c => c.type === 'resistor');

        // All resistors should connect between node 1 and node 0
        resistors.forEach(r => {
          if (r.type === 'resistor') {
            expect(r.terminals[0].nodeId).toBe('1');
            expect(r.terminals[1].nodeId).toBe('0');
          }
        });
      });

      it('should create correct number of resistors', () => {
        const circuit = createParallelResistors({
          resistances: [100, 200],
        });

        const resistors = circuit.components.filter(c => c.type === 'resistor');
        expect(resistors).toHaveLength(2);
      });

      it('should have only 2 nodes (voltage and ground)', () => {
        const circuit = createParallelResistors();

        // Parallel circuit should only have node 1 (voltage) and node 0 (ground)
        expect(circuit.nodes).toHaveLength(2);
      });
    });
  });

  describe('Valid Circuit Fixtures', () => {
    it('should have valid structure for all fixtures', () => {
      ALL_CIRCUIT_FIXTURES.forEach(fixture => {
        expect(fixture.circuit).toBeDefined();
        expect(fixture.expectedResults).toBeDefined();
        expect(fixture.description).toBeDefined();

        // Check circuit structure
        expect(fixture.circuit.id).toBeDefined();
        expect(fixture.circuit.name).toBeDefined();
        expect(fixture.circuit.components).toBeInstanceOf(Array);
        expect(fixture.circuit.nodes).toBeInstanceOf(Array);
        expect(fixture.circuit.groundNodeId).toBeDefined();
      });
    });

    it('should have expected results matching circuit structure', () => {
      ALL_CIRCUIT_FIXTURES.forEach(fixture => {
        const { circuit, expectedResults } = fixture;

        // Node voltages should include all nodes
        const nodeIds = circuit.nodes.map(n => n.id);
        nodeIds.forEach(nodeId => {
          expect(expectedResults.nodeVoltages).toHaveProperty(nodeId);
          expect(typeof expectedResults.nodeVoltages[nodeId]).toBe('number');
        });

        // Ground should be at 0V
        expect(expectedResults.nodeVoltages[circuit.groundNodeId]).toBe(0);
      });
    });

    it('should validate VOLTAGE_DIVIDER_12V circuit', () => {
      const validation = validateCircuit(VOLTAGE_DIVIDER_12V.circuit);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate SIMPLE_RESISTOR_10V circuit', () => {
      const validation = validateCircuit(SIMPLE_RESISTOR_10V.circuit);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should have power conservation in expected results', () => {
      // For simple resistive circuits, total power supplied should equal total power dissipated
      ALL_CIRCUIT_FIXTURES.forEach(fixture => {
        const { expectedResults } = fixture;
        const totalPower = Object.values(
          expectedResults.componentPowers
        ).reduce((sum, p) => sum + p, 0);

        // Should be close to zero (conservation of energy)
        expect(Math.abs(totalPower)).toBeLessThan(1e-9);
      });
    });
  });

  describe('Error Case Fixtures', () => {
    it('should have valid structure for all error fixtures', () => {
      ALL_ERROR_FIXTURES.forEach(fixture => {
        expect(fixture.circuit).toBeDefined();
        expect(fixture.description).toBeDefined();
      });
    });

    it('should detect floating node error', () => {
      const circuit = FLOATING_NODE_ERROR.circuit as any;
      const floatingNodes = circuit.nodes
        .filter((n: any) => !n.isGround && n.connectedComponents.length === 0)
        .map((n: any) => n.id);

      // Should have at least one floating node (node 99)
      expect(floatingNodes.length).toBeGreaterThan(0);
      expect(floatingNodes).toContain('99');
    });

    it('should have expected error codes defined', () => {
      ALL_ERROR_FIXTURES.forEach(fixture => {
        if (fixture.expectedErrorCode) {
          expect(typeof fixture.expectedErrorCode).toBe('string');
          expect(fixture.expectedErrorCode.length).toBeGreaterThan(0);
        }
      });
    });

    it('should have descriptive error messages', () => {
      ALL_ERROR_FIXTURES.forEach(fixture => {
        expect(fixture.description).toBeDefined();
        expect(fixture.description.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Performance Benchmark Fixtures', () => {
    it('should have valid structure for all benchmarks', () => {
      ALL_PERFORMANCE_BENCHMARKS.forEach(benchmark => {
        expect(benchmark.circuit).toBeDefined();
        expect(benchmark.description).toBeDefined();
        expect(benchmark.expectedComplexity).toBeDefined();
        expect(benchmark.nodeCount).toBeGreaterThan(0);
        expect(benchmark.componentCount).toBeGreaterThan(0);
      });
    });

    it('should have correct node count in SMALL_CIRCUIT_10_NODES', () => {
      const { circuit, nodeCount } = SMALL_CIRCUIT_10_NODES;
      expect(circuit.nodes).toHaveLength(nodeCount);
    });

    it('should validate small benchmark circuit', () => {
      const validation = validateCircuit(SMALL_CIRCUIT_10_NODES.circuit);
      expect(validation.valid).toBe(true);
    });

    it('should create sparse circuits with correct size', () => {
      const circuit = createSparseCircuit(10);

      // Should have 10 stages + ground = 11 nodes
      expect(circuit.nodes.length).toBeGreaterThan(10);

      // Should validate
      const validation = validateCircuit(circuit);
      expect(validation.valid).toBe(true);
    });

    it('should create mesh networks with correct dimensions', () => {
      const rows = 3;
      const cols = 3;
      const circuit = createMeshNetwork(rows, cols);

      // Should have rows * cols nodes (grid points) + ground
      expect(circuit.nodes.length).toBeGreaterThan(rows * cols);

      // Should validate
      const validation = validateCircuit(circuit);
      expect(validation.valid).toBe(true);
    });

    it('should have realistic component counts', () => {
      ALL_PERFORMANCE_BENCHMARKS.forEach(benchmark => {
        const { circuit, componentCount } = benchmark;

        // Actual component count should match expected
        expect(circuit.components.length).toBe(componentCount);
      });
    });
  });

  describe('Fixture Consistency', () => {
    it('should have unique IDs across all valid fixtures', () => {
      const ids = ALL_CIRCUIT_FIXTURES.map(f => f.circuit.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique IDs across all error fixtures', () => {
      const ids = ALL_ERROR_FIXTURES.map(f => {
        const circuit = f.circuit as any;
        return circuit.id;
      }).filter(Boolean);

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique IDs across all performance fixtures', () => {
      const ids = ALL_PERFORMANCE_BENCHMARKS.map(f => f.circuit.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
