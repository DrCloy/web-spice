/**
 * Tests for circuit factory functions
 */

import { describe, expect, it } from 'vitest';
import { createTestCircuit } from './circuits';
import { createDCVoltageSource, createResistor } from './components';

describe('Circuit Factories', () => {
  describe('createTestCircuit', () => {
    it('should create basic circuit with components', () => {
      const v1 = createDCVoltageSource({
        id: 'V1',
        voltage: 12,
        nodes: ['1', '0'],
      });
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });

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
      const v1 = createDCVoltageSource({
        id: 'V1',
        voltage: 12,
        nodes: ['1', '0'],
      });
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
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
      const v1 = createDCVoltageSource({
        id: 'V1',
        voltage: 12,
        nodes: ['1', '0'],
      });

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
      const v1 = createDCVoltageSource({
        id: 'V1',
        voltage: 12,
        nodes: ['1', '0'],
      });
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
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
});
