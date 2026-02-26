import { describe, expect, it } from 'vitest';
import { analyzeDC } from '@/engine/analysis/dcAnalysis';
import type { Circuit } from '@/types/circuit';
import { createTestCircuit } from '../../factories/circuits';
import {
  createACVoltageSource,
  createDCCurrentSource,
  createDCVoltageSource,
  createGround,
  createResistor,
} from '../../factories/components';
import {
  ALL_CIRCUIT_FIXTURES,
  BOUNDARY_LARGE_VALUES,
  BOUNDARY_SMALL_VALUES,
  PARALLEL_RESISTORS_MIXED,
  SERIES_RESISTORS_EQUAL,
  SIMPLE_RESISTOR_10V,
  VOLTAGE_DIVIDER_12V,
  createVoltageDivider,
} from '../../fixtures/circuits';
import { SINGULAR_MATRIX_ERROR } from '../../fixtures/error-cases';

// ============================================================================
// Input Validation
// ============================================================================

describe('analyzeDC', () => {
  describe('Input Validation', () => {
    it('should throw for null circuit', () => {
      expect(() => analyzeDC(null as unknown as Circuit)).toThrow(
        'Circuit cannot be null or undefined'
      );
    });

    it('should throw for empty circuit', () => {
      const circuit: Circuit = {
        id: 'empty',
        name: 'Empty',
        components: [],
        nodes: [],
        groundNodeId: '0',
      };
      expect(() => analyzeDC(circuit)).toThrow(
        'Circuit must have at least one component'
      );
    });

    it('should throw for circuit without ground node', () => {
      const circuit = createTestCircuit({
        components: [
          createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '2'] }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '2'] }),
        ],
        groundNodeId: '0', // node '0' doesn't exist in circuit
      });
      expect(() => analyzeDC(circuit)).toThrow('Ground node');
    });

    it('should throw for floating node', () => {
      const circuit = createTestCircuit({
        components: [
          createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '2'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });
      // Node '2' is only connected to R1 (floating)
      expect(() => analyzeDC(circuit)).toThrow('Node');
    });

    it('should throw for unsupported component type', () => {
      const circuit = createTestCircuit({
        components: [
          createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
          {
            id: 'C1',
            type: 'capacitor',
            name: 'C1',
            capacitance: 1e-6,
            terminals: [
              { name: 'positive', nodeId: '1' },
              { name: 'negative', nodeId: '0' },
            ],
          } as any,
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });
      expect(() => analyzeDC(circuit)).toThrow('not supported in DC analysis');
    });

    it('should throw for AC voltage source', () => {
      const circuit = createTestCircuit({
        components: [
          createACVoltageSource({
            id: 'V1',
            amplitude: 10,
            frequency: 60,
            nodes: ['1', '0'],
          }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });
      expect(() => analyzeDC(circuit)).toThrow('not supported in DC analysis');
    });
  });

  // ============================================================================
  // Simple Circuits
  // ============================================================================

  describe('Simple Circuits', () => {
    it('should solve single resistor with voltage source', () => {
      // V1(10V) -- R1(1kΩ) -- GND
      const circuit = createTestCircuit({
        components: [
          createDCVoltageSource({ id: 'V1', voltage: 10, nodes: ['1', '0'] }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });

      const result = analyzeDC(circuit);

      expect(result.type).toBe('dc');
      expect(result.operatingPoint.nodeVoltages['0']).toBe(0);
      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(10);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0.01);
      expect(result.operatingPoint.branchCurrents['V1']).toBeCloseTo(0.01);
    });

    it('should solve voltage divider', () => {
      // V1(12V) -- R1(1kΩ) -- node2 -- R2(2kΩ) -- GND
      const circuit = createVoltageDivider({
        inputVoltage: 12,
        r1: 1000,
        r2: 2000,
      });

      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(12);
      expect(result.operatingPoint.nodeVoltages['2']).toBeCloseTo(8);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0.004);
      expect(result.operatingPoint.branchCurrents['R2']).toBeCloseTo(0.004);
    });

    it('should handle zero voltage source', () => {
      const circuit = createTestCircuit({
        components: [
          createDCVoltageSource({ id: 'V1', voltage: 0, nodes: ['1', '0'] }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });

      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(0);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0);
    });
  });

  // ============================================================================
  // Series and Parallel
  // ============================================================================

  describe('Series and Parallel Circuits', () => {
    it('should solve series resistors', () => {
      // V1(9V) -- R1(1kΩ) -- R2(1kΩ) -- R3(1kΩ) -- GND
      const circuit = SERIES_RESISTORS_EQUAL.circuit;
      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(9);
      expect(result.operatingPoint.nodeVoltages['2']).toBeCloseTo(6);
      expect(result.operatingPoint.nodeVoltages['3']).toBeCloseTo(3);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0.003);
    });

    it('should solve parallel resistors', () => {
      const circuit = PARALLEL_RESISTORS_MIXED.circuit;
      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(12);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0.12);
      expect(result.operatingPoint.branchCurrents['R2']).toBeCloseTo(0.06);
      expect(result.operatingPoint.branchCurrents['R3']).toBeCloseTo(0.04);
    });

    it('should solve unequal voltage divider', () => {
      const circuit = createVoltageDivider({
        inputVoltage: 5,
        r1: 10000,
        r2: 40000,
      });
      const result = analyzeDC(circuit);

      // V_out = 5 * 40000 / (10000 + 40000) = 4V
      expect(result.operatingPoint.nodeVoltages['2']).toBeCloseTo(4);
    });
  });

  // ============================================================================
  // Current Source Circuits
  // ============================================================================

  describe('Current Source Circuits', () => {
    it('should solve current source with parallel resistor', () => {
      // I1(10mA) flowing into node 1, R1(1kΩ) from node 1 to GND
      // V = I * R = 0.01 * 1000 = 10V
      const circuit = createTestCircuit({
        components: [
          createDCCurrentSource({
            id: 'I1',
            current: 0.01,
            nodes: ['0', '1'],
          }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });

      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(10);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0.01);
      expect(result.operatingPoint.branchCurrents['I1']).toBeCloseTo(0.01);
    });

    it('should solve voltage source with current source and resistor', () => {
      // V1(5V) at node 1, R1(1kΩ) from node 1 to node 2,
      // I1(2mA) into node 2, R2(2kΩ) from node 2 to GND
      //
      // KCL at node 2: (V1 - V2)/R1 + I1 = V2/R2
      // (5 - V2)/1000 + 0.002 = V2/2000
      // 5 - V2 + 2 = V2/2  =>  7 = 1.5*V2  =>  V2 ≈ 4.667V
      const circuit = createTestCircuit({
        components: [
          createDCVoltageSource({ id: 'V1', voltage: 5, nodes: ['1', '0'] }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '2'] }),
          createDCCurrentSource({
            id: 'I1',
            current: 0.002,
            nodes: ['0', '2'],
          }),
          createResistor({ id: 'R2', resistance: 2000, nodes: ['2', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });

      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(5);
      expect(result.operatingPoint.nodeVoltages['2']).toBeCloseTo(14 / 3, 6);
    });

    it('should solve zero current source (open circuit)', () => {
      const circuit = createTestCircuit({
        components: [
          createDCCurrentSource({
            id: 'I1',
            current: 0,
            nodes: ['0', '1'],
          }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });

      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(0);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0);
    });

    it('should solve current source with two parallel resistors', () => {
      // I1(6mA) into node 1, R1(1kΩ) and R2(2kΩ) both from node 1 to GND
      // R_parallel = 1/(1/1000 + 1/2000) = 2000/3 Ω
      // V = 0.006 * 2000/3 = 4V
      const circuit = createTestCircuit({
        components: [
          createDCCurrentSource({
            id: 'I1',
            current: 0.006,
            nodes: ['0', '1'],
          }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
          createResistor({ id: 'R2', resistance: 2000, nodes: ['1', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });

      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(4);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0.004);
      expect(result.operatingPoint.branchCurrents['R2']).toBeCloseTo(0.002);
    });
  });

  // ============================================================================
  // Multiple Voltage Sources
  // ============================================================================

  describe('Multiple Voltage Sources', () => {
    it('should solve series voltage sources', () => {
      // V1(5V) node1→GND, V2(3V) node2→node1, R1(1kΩ) node2→GND
      // V(node1) = 5V, V(node2) = V(node1) + 3 = 8V
      // I = 8V / 1000Ω = 8mA
      const circuit = createTestCircuit({
        components: [
          createDCVoltageSource({ id: 'V1', voltage: 5, nodes: ['1', '0'] }),
          createDCVoltageSource({ id: 'V2', voltage: 3, nodes: ['2', '1'] }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['2', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });

      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(5);
      expect(result.operatingPoint.nodeVoltages['2']).toBeCloseTo(8);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0.008);
    });

    it('should solve opposing voltage sources with resistor', () => {
      // V1(10V) node1→GND, V2(4V) node2→GND, R1(1kΩ) between node1 and node2
      // I = (10 - 4) / 1000 = 6mA from node1 to node2
      const circuit = createTestCircuit({
        components: [
          createDCVoltageSource({ id: 'V1', voltage: 10, nodes: ['1', '0'] }),
          createDCVoltageSource({ id: 'V2', voltage: 4, nodes: ['2', '0'] }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '2'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });

      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(10);
      expect(result.operatingPoint.nodeVoltages['2']).toBeCloseTo(4);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0.006);
    });
  });

  // ============================================================================
  // Fixture Verification
  // ============================================================================

  describe('Fixture Verification', () => {
    it.each([
      ['VOLTAGE_DIVIDER_12V', VOLTAGE_DIVIDER_12V],
      ['SIMPLE_RESISTOR_10V', SIMPLE_RESISTOR_10V],
      ['SERIES_RESISTORS_EQUAL', SERIES_RESISTORS_EQUAL],
      ['PARALLEL_RESISTORS_MIXED', PARALLEL_RESISTORS_MIXED],
      ['BOUNDARY_SMALL_VALUES', BOUNDARY_SMALL_VALUES],
      ['BOUNDARY_LARGE_VALUES', BOUNDARY_LARGE_VALUES],
    ])('%s: node voltages should match', (_name, fixture) => {
      const result = analyzeDC(fixture.circuit);

      for (const [nodeId, expected] of Object.entries(
        fixture.expectedResults.nodeVoltages
      )) {
        expect(result.operatingPoint.nodeVoltages[nodeId]).toBeCloseTo(
          expected,
          6
        );
      }
    });

    it.each([
      ['VOLTAGE_DIVIDER_12V', VOLTAGE_DIVIDER_12V],
      ['SIMPLE_RESISTOR_10V', SIMPLE_RESISTOR_10V],
      ['SERIES_RESISTORS_EQUAL', SERIES_RESISTORS_EQUAL],
      ['PARALLEL_RESISTORS_MIXED', PARALLEL_RESISTORS_MIXED],
      ['BOUNDARY_SMALL_VALUES', BOUNDARY_SMALL_VALUES],
      ['BOUNDARY_LARGE_VALUES', BOUNDARY_LARGE_VALUES],
    ])('%s: branch currents should match', (_name, fixture) => {
      const result = analyzeDC(fixture.circuit);

      for (const [compId, expected] of Object.entries(
        fixture.expectedResults.branchCurrents
      )) {
        expect(result.operatingPoint.branchCurrents[compId]).toBeCloseTo(
          expected,
          6
        );
      }
    });

    it.each([
      ['VOLTAGE_DIVIDER_12V', VOLTAGE_DIVIDER_12V],
      ['SIMPLE_RESISTOR_10V', SIMPLE_RESISTOR_10V],
      ['SERIES_RESISTORS_EQUAL', SERIES_RESISTORS_EQUAL],
      ['PARALLEL_RESISTORS_MIXED', PARALLEL_RESISTORS_MIXED],
      ['BOUNDARY_SMALL_VALUES', BOUNDARY_SMALL_VALUES],
      ['BOUNDARY_LARGE_VALUES', BOUNDARY_LARGE_VALUES],
    ])('%s: component powers should match', (_name, fixture) => {
      const result = analyzeDC(fixture.circuit);

      for (const [compId, expected] of Object.entries(
        fixture.expectedResults.componentPowers
      )) {
        expect(result.operatingPoint.componentPowers[compId]).toBeCloseTo(
          expected,
          6
        );
      }
    });

    it('should pass all fixtures from ALL_CIRCUIT_FIXTURES', () => {
      for (const fixture of ALL_CIRCUIT_FIXTURES) {
        const result = analyzeDC(fixture.circuit);
        expect(result.type).toBe('dc');
        expect(result.convergenceInfo.converged).toBe(true);
      }
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('Error Cases', () => {
    it('should throw SINGULAR_MATRIX for parallel voltage sources', () => {
      const circuit = SINGULAR_MATRIX_ERROR.circuit as Circuit;
      expect(() => analyzeDC(circuit)).toThrow('singular');
    });

    it('should throw for voltage source loop without resistance', () => {
      // V1(5V) node1→GND, V2(3V) node1→GND (same nodes, different voltages)
      const circuit = createTestCircuit({
        components: [
          createDCVoltageSource({ id: 'V1', voltage: 5, nodes: ['1', '0'] }),
          createDCVoltageSource({ id: 'V2', voltage: 3, nodes: ['1', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });
      expect(() => analyzeDC(circuit)).toThrow('singular');
    });

    it('should return trivial result for ground-only circuit', () => {
      const circuit: Circuit = {
        id: 'only-ground',
        name: 'Only Ground',
        components: [createGround({ id: 'GND', nodeId: '0' })],
        nodes: [
          {
            id: '0',
            isGround: true,
            connectedComponents: ['GND'],
          },
        ],
        groundNodeId: '0',
      };
      // Ground-only circuit has no non-ground nodes to solve;
      // analyzeDC is expected to return a trivial result (and not throw).
      const result = analyzeDC(circuit);
      expect(result.operatingPoint.nodeVoltages['0']).toBe(0);
    });
  });

  // ============================================================================
  // Boundary Values
  // ============================================================================

  describe('Boundary Values', () => {
    it('should handle very small values', () => {
      const result = analyzeDC(BOUNDARY_SMALL_VALUES.circuit);
      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(0.001, 6);
    });

    it('should handle very large values', () => {
      const result = analyzeDC(BOUNDARY_LARGE_VALUES.circuit);
      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(1000, 6);
    });

    it('should handle negative voltage source', () => {
      const circuit = createTestCircuit({
        components: [
          createDCVoltageSource({
            id: 'V1',
            voltage: -5,
            nodes: ['1', '0'],
          }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });

      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(-5);
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(-0.005);
    });

    it('should handle negative current source', () => {
      const circuit = createTestCircuit({
        components: [
          createDCCurrentSource({
            id: 'I1',
            current: -0.01,
            nodes: ['0', '1'],
          }),
          createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
          createGround({ id: 'GND', nodeId: '0' }),
        ],
        groundNodeId: '0',
      });

      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(-10);
    });
  });

  // ============================================================================
  // Result Format
  // ============================================================================

  describe('Result Format', () => {
    it('should return correct result type and convergence info', () => {
      const circuit = SIMPLE_RESISTOR_10V.circuit;
      const result = analyzeDC(circuit);

      expect(result.type).toBe('dc');
      expect(result.convergenceInfo.converged).toBe(true);
      expect(result.convergenceInfo.iterations).toBe(1);
    });

    it('should include ground node in voltages', () => {
      const circuit = SIMPLE_RESISTOR_10V.circuit;
      const result = analyzeDC(circuit);

      expect(result.operatingPoint.nodeVoltages).toHaveProperty('0');
      expect(result.operatingPoint.nodeVoltages['0']).toBe(0);
    });

    it('should have power conservation (sum of powers ≈ 0)', () => {
      const circuit = VOLTAGE_DIVIDER_12V.circuit;
      const result = analyzeDC(circuit);

      const totalPower = Object.values(
        result.operatingPoint.componentPowers
      ).reduce((sum, p) => sum + p, 0);

      expect(totalPower).toBeCloseTo(0, 10);
    });
  });
});
