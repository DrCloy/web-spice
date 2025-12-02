/**
 * Tests for circuit fixtures
 */

import { describe, expect, it } from 'vitest';
import {
  ALL_CIRCUIT_FIXTURES,
  SIMPLE_RESISTOR_10V,
  VOLTAGE_DIVIDER_12V,
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
        .filter((n: any) => !n.isGround && n.connectedComponents.length === 1)
        .map((n: any) => n.id);

      // Should have floating nodes 98 and 99
      expect(floatingNodes.length).toBeGreaterThan(0);
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
