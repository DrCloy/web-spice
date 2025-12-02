/**
 * Tests for circuit factory functions
 */

import { describe, expect, it } from 'vitest';
import {
  createParallelResistors,
  createSeriesResistors,
  createTestCircuit,
  createVoltageDivider,
} from './circuits';
import { createTestResistor, createTestVoltageSource } from './components';

describe('Circuit Factories', () => {
  describe('createTestCircuit', () => {
    it('should create basic circuit with components', () => {
      const v1 = createTestVoltageSource({ id: 'V1', voltage: 12 });
      const r1 = createTestResistor({ id: 'R1', resistance: 1000 });

      const circuit = createTestCircuit({
        id: 'test-1',
        name: 'Test Circuit',
        components: [v1, r1],
      });

      expect(circuit.id).toBe('test-1');
      expect(circuit.name).toBe('Test Circuit');
      expect(circuit.components).toHaveLength(2);
      expect(circuit.groundNodeId).toBe('0');
    });

    it('should extract nodes from components', () => {
      const v1 = createTestVoltageSource({
        nodes: ['1', '0'],
      });
      const r1 = createTestResistor({
        nodes: ['1', '2'],
      });

      const circuit = createTestCircuit({
        components: [v1, r1],
      });

      // Should have nodes: 0, 1, 2
      expect(circuit.nodes).toHaveLength(3);
      const nodeIds = circuit.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['0', '1', '2']);
    });

    it('should mark ground node correctly', () => {
      const v1 = createTestVoltageSource({ nodes: ['1', '0'] });

      const circuit = createTestCircuit({
        components: [v1],
        groundNodeId: '0',
      });

      const groundNode = circuit.nodes.find(n => n.id === '0');
      expect(groundNode?.isGround).toBe(true);

      const otherNode = circuit.nodes.find(n => n.id === '1');
      expect(otherNode?.isGround).toBe(false);
    });

    it('should track component connections to nodes', () => {
      const v1 = createTestVoltageSource({
        id: 'V1',
        nodes: ['1', '0'],
      });
      const r1 = createTestResistor({
        id: 'R1',
        nodes: ['1', '0'],
      });

      const circuit = createTestCircuit({
        components: [v1, r1],
      });

      const node1 = circuit.nodes.find(n => n.id === '1');
      expect(node1?.connectedComponents).toContain('V1');
      expect(node1?.connectedComponents).toContain('R1');
    });
  });

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

        // R3 connects node 3 to node 4
        expect(r3.terminals[0].nodeId).toBe('3');
        expect(r3.terminals[1].nodeId).toBe('4');
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
