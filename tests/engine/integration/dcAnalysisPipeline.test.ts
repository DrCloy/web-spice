/**
 * DC Analysis Pipeline Integration Tests
 *
 * End-to-end tests covering the full pipeline:
 * CircuitJSON → parseCircuit → analyzeDC → formatDCResult → serialize*
 */
import { describe, expect, it } from 'vitest';
import type { CircuitJSON } from '@/types/circuit';
import { validateCircuitStructure } from '@/engine/circuit';
import { parseCircuit } from '@/engine/parser/circuitParser';
import { parseAnalysis } from '@/engine/parser/analysisParser';
import { analyzeDC } from '@/engine/analysis/dcAnalysis';
import {
  formatDCResult,
  serializeDCResultToJSON,
  serializeDCResultToText,
} from '@/engine/formatter/resultFormatter';

// ============================================================================
// Shared inline JSON fixtures
// ============================================================================

const VOLTAGE_DIVIDER_JSON: CircuitJSON = {
  name: 'Voltage Divider',
  ground: '0',
  components: [
    {
      id: 'V1',
      type: 'voltage_source',
      name: 'V1',
      nodes: ['1', '0'],
      parameters: { voltage: 12 },
    },
    {
      id: 'R1',
      type: 'resistor',
      name: 'R1',
      nodes: ['1', '2'],
      parameters: { resistance: 1000 },
    },
    {
      id: 'R2',
      type: 'resistor',
      name: 'R2',
      nodes: ['2', '0'],
      parameters: { resistance: 2000 },
    },
  ],
};

const SIMPLE_RESISTOR_JSON: CircuitJSON = {
  name: 'Simple Resistor',
  ground: '0',
  components: [
    {
      id: 'V1',
      type: 'voltage_source',
      name: 'V1',
      nodes: ['1', '0'],
      parameters: { voltage: 10 },
    },
    {
      id: 'R1',
      type: 'resistor',
      name: 'R1',
      nodes: ['1', '0'],
      parameters: { resistance: 1000 },
    },
  ],
};

const CURRENT_SOURCE_JSON: CircuitJSON = {
  name: 'Current Source',
  ground: '0',
  components: [
    {
      id: 'I1',
      type: 'current_source',
      name: 'I1',
      nodes: ['0', '1'],
      parameters: { current: 0.002 },
    },
    {
      id: 'R1',
      type: 'resistor',
      name: 'R1',
      nodes: ['1', '0'],
      parameters: { resistance: 5000 },
    },
  ],
};

// ============================================================================
// Basic Pipeline
// ============================================================================

describe('DC Analysis Pipeline', () => {
  describe('basic pipeline', () => {
    it('should run full pipeline on voltage divider: JSON → parse → analyze → format', () => {
      const circuit = parseCircuit(VOLTAGE_DIVIDER_JSON);
      const result = analyzeDC(circuit);
      const formatted = formatDCResult(result);

      // Node voltages
      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(12);
      expect(result.operatingPoint.nodeVoltages['2']).toBeCloseTo(8);
      expect(result.operatingPoint.nodeVoltages['0']).toBe(0);

      // Branch current
      expect(result.operatingPoint.branchCurrents['V1']).toBeCloseTo(0.004);

      // Formatted SI strings
      expect(formatted.operatingPoint.nodeVoltages['1']).toBe('12.000 V');
      expect(formatted.operatingPoint.nodeVoltages['2']).toBe('8.000 V');
      expect(formatted.operatingPoint.branchCurrents['V1']).toBe('4.000 mA');
    });

    it('should run full pipeline on simple resistor: JSON → parse → analyze → format', () => {
      const circuit = parseCircuit(SIMPLE_RESISTOR_JSON);
      const result = analyzeDC(circuit);
      const formatted = formatDCResult(result);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(10);
      expect(result.operatingPoint.branchCurrents['V1']).toBeCloseTo(0.01);

      expect(formatted.operatingPoint.nodeVoltages['1']).toBe('10.000 V');
      expect(formatted.operatingPoint.branchCurrents['V1']).toBe('10.000 mA');
    });

    it('should run full pipeline on current source circuit: JSON → parse → analyze → format', () => {
      // I1=2mA from node0 to node1 (N+=0, N-=1 means current pumped into node1)
      // R1=5kΩ across node1 → V(1) = 2mA × 5kΩ = 10V
      const circuit = parseCircuit(CURRENT_SOURCE_JSON);
      const result = analyzeDC(circuit);
      const formatted = formatDCResult(result);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(10);
      expect(formatted.operatingPoint.nodeVoltages['1']).toBe('10.000 V');
    });

    it('should serialize voltage divider result to text with correct structure', () => {
      const circuit = parseCircuit(VOLTAGE_DIVIDER_JSON);
      const result = analyzeDC(circuit);
      const text = serializeDCResultToText(result);

      expect(text).toContain('Node Voltages');
      expect(text).toContain('Branch Currents');
      expect(text).toContain('12.000 V');
      expect(text).toContain('8.000 V');
      expect(text).toContain('4.000 mA');
    });

    it('should serialize voltage divider result to JSON and round-trip correctly', () => {
      const circuit = parseCircuit(VOLTAGE_DIVIDER_JSON);
      const result = analyzeDC(circuit);
      const json = serializeDCResultToJSON(result);
      const parsed = JSON.parse(json) as typeof result;

      expect(parsed.type).toBe('dc');
      expect(parsed.operatingPoint.nodeVoltages['1']).toBeCloseTo(12);
      expect(parsed.operatingPoint.nodeVoltages['2']).toBeCloseTo(8);
      expect(parsed.operatingPoint.branchCurrents['V1']).toBeCloseTo(0.004);
    });
  });

  // ============================================================================
  // DC Sweep Pipeline
  // ============================================================================

  describe('DC sweep pipeline', () => {
    it('should run voltage source sweep via parseAnalysis + analyzeDC', () => {
      // V(node2) = V1 * R2/(R1+R2) = V1 * 2/3
      const circuit = parseCircuit(VOLTAGE_DIVIDER_JSON);
      const config = parseAnalysis({
        type: 'dc',
        parameters: {
          sourceId: 'V1',
          startValue: 0,
          endValue: 12,
          stepValue: 6,
        },
      });
      const result = analyzeDC(circuit, config);

      expect(result.sweep).toBeDefined();
      expect(result.sweep!.sweepValues).toEqual([0, 6, 12]);
      expect(result.sweep!.operatingPoints[0].nodeVoltages['2']).toBeCloseTo(0);
      expect(result.sweep!.operatingPoints[1].nodeVoltages['2']).toBeCloseTo(4);
      expect(result.sweep!.operatingPoints[2].nodeVoltages['2']).toBeCloseTo(8);
    });

    it('should format sweep result with correct SI-prefixed sweep values', () => {
      const circuit = parseCircuit(VOLTAGE_DIVIDER_JSON);
      const config = parseAnalysis({
        type: 'dc',
        parameters: {
          sourceId: 'V1',
          startValue: 0,
          endValue: 12,
          stepValue: 6,
        },
      });
      const result = analyzeDC(circuit, config);
      const formatted = formatDCResult(result);

      expect(formatted.sweep).toBeDefined();
      expect(formatted.sweep!.sweepValues).toEqual([
        '0.000 V',
        '6.000 V',
        '12.000 V',
      ]);
      expect(formatted.sweep!.operatingPoints[2].nodeVoltages['2']).toBe(
        '8.000 V'
      );
    });

    it('should run current source sweep and verify node voltages', () => {
      // I1 sweep: 1mA, 2mA, 3mA across R1=5kΩ → V(1) = 5V, 10V, 15V
      const circuit = parseCircuit(CURRENT_SOURCE_JSON);
      const config = parseAnalysis({
        type: 'dc',
        parameters: {
          sourceId: 'I1',
          startValue: '1mA',
          endValue: '3mA',
          stepValue: '1mA',
        },
      });
      const result = analyzeDC(circuit, config);

      expect(result.sweep!.sweepValues).toHaveLength(3);
      expect(result.sweep!.operatingPoints[0].nodeVoltages['1']).toBeCloseTo(5);
      expect(result.sweep!.operatingPoints[1].nodeVoltages['1']).toBeCloseTo(
        10
      );
      expect(result.sweep!.operatingPoints[2].nodeVoltages['1']).toBeCloseTo(
        15
      );
    });

    it('should serialize sweep result to text with sweep section', () => {
      const circuit = parseCircuit(VOLTAGE_DIVIDER_JSON);
      const config = parseAnalysis({
        type: 'dc',
        parameters: {
          sourceId: 'V1',
          startValue: 0,
          endValue: 6,
          stepValue: 6,
        },
      });
      const result = analyzeDC(circuit, config);
      const text = serializeDCResultToText(result);

      expect(text).toContain('Sweep: 0.000 V');
      expect(text).toContain('Sweep: 6.000 V');
    });
  });

  // ============================================================================
  // Error Propagation
  // ============================================================================

  describe('error propagation', () => {
    it('should throw INVALID_CIRCUIT for null circuit JSON', () => {
      expect(() => parseCircuit(null as never)).toThrowWebSpiceError(
        'INVALID_CIRCUIT'
      );
    });

    it('should throw UNSUPPORTED_ANALYSIS for unsupported component type', () => {
      const json: CircuitJSON = {
        name: 'Bad Circuit',
        ground: '0',
        components: [
          {
            id: 'C1',
            type: 'capacitor',
            name: 'C1',
            nodes: ['1', '0'],
            parameters: { capacitance: 1e-6 },
          },
        ],
      };
      expect(() => parseCircuit(json)).toThrowWebSpiceError(
        'UNSUPPORTED_ANALYSIS'
      );
    });

    it('should throw FLOATING_NODE for floating node in parsed circuit', () => {
      const json: CircuitJSON = {
        name: 'Floating Node',
        ground: '0',
        components: [
          {
            id: 'V1',
            type: 'voltage_source',
            name: 'V1',
            nodes: ['1', '0'],
            parameters: { voltage: 12 },
          },
          {
            id: 'R1',
            type: 'resistor',
            name: 'R1',
            nodes: ['1', '2'], // node '2' is floating
            parameters: { resistance: 1000 },
          },
        ],
      };
      const circuit = parseCircuit(json);
      expect(() => analyzeDC(circuit)).toThrowWebSpiceError('FLOATING_NODE');
    });

    it('should throw WebSpiceError with SINGULAR_MATRIX for parallel voltage sources', () => {
      // Two voltage sources in parallel create a singular matrix
      const json: CircuitJSON = {
        name: 'Parallel VS',
        ground: '0',
        components: [
          {
            id: 'V1',
            type: 'voltage_source',
            name: 'V1',
            nodes: ['1', '0'],
            parameters: { voltage: 12 },
          },
          {
            id: 'V2',
            type: 'voltage_source',
            name: 'V2',
            nodes: ['1', '0'],
            parameters: { voltage: 10 },
          },
        ],
      };
      const circuit = parseCircuit(json);
      expect(() => analyzeDC(circuit)).toThrowWebSpiceError('SINGULAR_MATRIX');
    });

    it('should throw COMPONENT_NOT_FOUND for missing sweep source', () => {
      const circuit = parseCircuit(VOLTAGE_DIVIDER_JSON);
      const config = parseAnalysis({
        type: 'dc',
        parameters: {
          sourceId: 'nonexistent',
          startValue: 0,
          endValue: 10,
          stepValue: 5,
        },
      });
      expect(() => analyzeDC(circuit, config)).toThrowWebSpiceError(
        'COMPONENT_NOT_FOUND'
      );
    });
  });

  // ============================================================================
  // Data Integrity
  // ============================================================================

  describe('data integrity', () => {
    it('should preserve raw numeric values through JSON round-trip', () => {
      const circuit = parseCircuit(VOLTAGE_DIVIDER_JSON);
      const result = analyzeDC(circuit);
      const json = serializeDCResultToJSON(result);
      const parsed = JSON.parse(json) as typeof result;

      // Raw values must be preserved exactly (not SI-formatted strings)
      expect(typeof parsed.operatingPoint.nodeVoltages['1']).toBe('number');
      expect(typeof parsed.operatingPoint.branchCurrents['V1']).toBe('number');
      expect(parsed.operatingPoint.nodeVoltages['1']).toBeCloseTo(
        result.operatingPoint.nodeVoltages['1']
      );
      expect(parsed.operatingPoint.branchCurrents['V1']).toBeCloseTo(
        result.operatingPoint.branchCurrents['V1']
      );
    });

    it('should produce SI strings consistent with raw values', () => {
      const circuit = parseCircuit(VOLTAGE_DIVIDER_JSON);
      const result = analyzeDC(circuit);
      const formatted = formatDCResult(result);

      // 12V node → '12.000 V'
      const rawV = result.operatingPoint.nodeVoltages['1'];
      const formattedV = formatted.operatingPoint.nodeVoltages['1'];
      expect(rawV).toBeCloseTo(12);
      expect(formattedV).toBe('12.000 V');

      // 4mA branch current → '4.000 mA'
      const rawI = result.operatingPoint.branchCurrents['V1'];
      const formattedI = formatted.operatingPoint.branchCurrents['V1'];
      expect(rawI).toBeCloseTo(0.004);
      expect(formattedI).toBe('4.000 mA');
    });

    it('should preserve sweep raw values through JSON round-trip', () => {
      const circuit = parseCircuit(VOLTAGE_DIVIDER_JSON);
      const config = parseAnalysis({
        type: 'dc',
        parameters: {
          sourceId: 'V1',
          startValue: 0,
          endValue: 12,
          stepValue: 6,
        },
      });
      const result = analyzeDC(circuit, config);
      const json = serializeDCResultToJSON(result);
      const parsed = JSON.parse(json) as typeof result;

      expect(parsed.sweep!.sweepValues).toEqual([0, 6, 12]);
      expect(parsed.sweep!.operatingPoints[2].nodeVoltages['2']).toBeCloseTo(8);
    });
  });

  // ============================================================================
  // Branch Current Convention
  // ============================================================================

  describe('branch current convention', () => {
    it('resistor current flows from terminal[0] to terminal[1] when terminal[0] is at higher voltage', () => {
      // V1=12V, R1=1kΩ: nodes ['1','0'] → I = (12-0)/1000 = 12mA, positive
      const circuit = parseCircuit(SIMPLE_RESISTOR_JSON);
      const result = analyzeDC(circuit);

      // R1 terminal[0]='1' (12V), terminal[1]='0' (0V) → current = +10mA
      expect(result.operatingPoint.branchCurrents['R1']).toBeCloseTo(0.01);
      expect(result.operatingPoint.branchCurrents['R1']).toBeGreaterThan(0);
    });

    it('voltage source current is positive when conventional current flows out of N+ into the circuit', () => {
      // V1 nodes=['1','0']: N+=1, N-=0, V=12V
      // Circuit current flows from node1 through R1 to node0 (ground)
      // → V1 delivers current: positive branchCurrent means current out of N+
      const circuit = parseCircuit(SIMPLE_RESISTOR_JSON);
      const result = analyzeDC(circuit);

      expect(result.operatingPoint.branchCurrents['V1']).toBeCloseTo(0.01);
      expect(result.operatingPoint.branchCurrents['V1']).toBeGreaterThan(0);
    });

    it('voltage source power is negative when delivering energy (source convention)', () => {
      // Power = -V * I for voltage source; delivering current → negative power
      const circuit = parseCircuit(SIMPLE_RESISTOR_JSON);
      const result = analyzeDC(circuit);

      expect(result.operatingPoint.componentPowers['V1']).toBeCloseTo(-0.1); // -10V * 10mA
      expect(result.operatingPoint.componentPowers['V1']).toBeLessThan(0);
    });

    it('resistor power is positive (absorbing energy)', () => {
      const circuit = parseCircuit(SIMPLE_RESISTOR_JSON);
      const result = analyzeDC(circuit);

      expect(result.operatingPoint.componentPowers['R1']).toBeCloseTo(0.1); // 10V * 10mA
      expect(result.operatingPoint.componentPowers['R1']).toBeGreaterThan(0);
    });

    it('current source branchCurrent matches component current value', () => {
      // I1=2mA: branchCurrents['I1'] should equal 0.002
      const circuit = parseCircuit(CURRENT_SOURCE_JSON);
      const result = analyzeDC(circuit);

      expect(result.operatingPoint.branchCurrents['I1']).toBeCloseTo(0.002);
    });
  });

  // ============================================================================
  // Plain Circuit Interface
  // ============================================================================

  describe('plain Circuit interface', () => {
    it('analyzeDC accepts a plain Circuit object (not CircuitImpl)', () => {
      // applySourceValue inside analyzeDC creates plain Circuit objects;
      // this test verifies analyzeDC works with plain objects at the top level too.
      const circuitImpl = parseCircuit(SIMPLE_RESISTOR_JSON);
      const plainCircuit = circuitImpl.toJSON(); // plain Circuit, no class methods

      const result = analyzeDC(plainCircuit);

      expect(result.operatingPoint.nodeVoltages['1']).toBeCloseTo(10);
      expect(result.operatingPoint.branchCurrents['V1']).toBeCloseTo(0.01);
    });

    it('validateCircuitStructure works on plain Circuit object', () => {
      const circuitImpl = parseCircuit(SIMPLE_RESISTOR_JSON);
      const plainCircuit = circuitImpl.toJSON();

      const errors = validateCircuitStructure(plainCircuit);
      expect(errors).toHaveLength(0);
    });

    it('analyzeDC throws FLOATING_NODE for plain Circuit with floating node', () => {
      const circuitImpl = parseCircuit(SIMPLE_RESISTOR_JSON);
      const plain = circuitImpl.toJSON();

      // Manually introduce a floating node by appending to nodes array
      const brokenCircuit = {
        ...plain,
        nodes: [
          ...plain.nodes,
          { id: 'floating', isGround: false, connectedComponents: ['R_ghost'] },
        ],
      };

      // floating node has only 1 connection → FLOATING_NODE
      expect(() => analyzeDC(brokenCircuit)).toThrowWebSpiceError(
        'FLOATING_NODE'
      );
    });
  });
});
