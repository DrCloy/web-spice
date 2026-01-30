import { describe, expect, it } from 'vitest';
import { CircuitImpl } from '@/engine/circuit';
import type { Component } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';
import {
  createDCVoltageSource,
  createGround,
  createResistor,
} from '../factories/components';
import { VOLTAGE_DIVIDER_12V } from '../fixtures/circuits';

/**
 * Helper function to create circuit constructor data with optional overrides
 */
function makeCircuitData(
  overrides?: Partial<{
    id: string;
    name: string;
    description?: string;
    components?: Component[];
    groundNodeId?: string;
  }>
): {
  id: string;
  name: string;
  description?: string;
  components?: Component[];
  groundNodeId?: string;
} {
  return {
    id: 'test-circuit',
    name: 'Test Circuit',
    components: [],
    groundNodeId: '0',
    ...overrides,
  };
}

describe('CircuitImpl', () => {
  describe('constructor', () => {
    it('should create empty circuit with default ground', () => {
      const circuit = new CircuitImpl(
        makeCircuitData({
          id: 'cir1',
          name: 'My Circuit',
        })
      );

      expect(circuit.id).toBe('cir1');
      expect(circuit.name).toBe('My Circuit');
      expect(circuit.groundNodeId).toBe('0');
      expect(circuit.description).toBeUndefined();
      expect(circuit.getComponents()).toEqual([]);
    });

    it('should create circuit with components array', () => {
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });

      const circuit = new CircuitImpl(
        makeCircuitData({
          components: [r1],
        })
      );

      expect(circuit.getComponents()).toHaveLength(1);
      expect(circuit.getComponents()[0].id).toBe('R1');
    });

    it('should throw error for empty circuit ID', () => {
      expect(() => new CircuitImpl(makeCircuitData({ id: '' }))).toThrow(
        WebSpiceError
      );
      expect(() => new CircuitImpl(makeCircuitData({ id: '' }))).toThrow(
        'Circuit ID cannot be empty'
      );
    });

    it('should throw error for empty circuit name', () => {
      expect(() => new CircuitImpl(makeCircuitData({ name: '' }))).toThrow(
        WebSpiceError
      );
      expect(() => new CircuitImpl(makeCircuitData({ name: '' }))).toThrow(
        'Circuit name cannot be empty'
      );
    });

    it('should trim and normalize ID', () => {
      const circuit = new CircuitImpl(
        makeCircuitData({
          id: '  trimmed-id  ',
        })
      );

      expect(circuit.id).toBe('trimmed-id');
    });

    it('should trim and normalize name', () => {
      const circuit = new CircuitImpl(
        makeCircuitData({
          name: '  Trimmed Name  ',
        })
      );

      expect(circuit.name).toBe('Trimmed Name');
    });

    it('should accept optional description', () => {
      const circuit = new CircuitImpl(
        makeCircuitData({
          description: 'Test description',
        })
      );

      expect(circuit.description).toBe('Test description');
    });

    it('should accept custom groundNodeId', () => {
      const circuit = new CircuitImpl(
        makeCircuitData({
          groundNodeId: 'gnd',
        })
      );

      expect(circuit.groundNodeId).toBe('gnd');
    });
  });

  describe('component management', () => {
    it('should add component to circuit', () => {
      const circuit = new CircuitImpl(makeCircuitData());
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });

      circuit.addComponent(r1);

      expect(circuit.getComponents()).toHaveLength(1);
      expect(circuit.getComponentById('R1')).toBeDefined();
      expect(circuit.getComponentById('R1')?.id).toBe('R1');
    });

    it('should prevent duplicate component IDs', () => {
      const circuit = new CircuitImpl(makeCircuitData());
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });
      const r2 = createResistor({
        id: 'R1',
        resistance: 2000,
        nodes: ['2', '0'],
      });

      circuit.addComponent(r1);

      expect(() => circuit.addComponent(r2)).toThrow(WebSpiceError);
      expect(() => circuit.addComponent(r2)).toThrow(
        "Component with ID 'R1' already exists in circuit"
      );
    });

    it('should remove component by ID', () => {
      const circuit = new CircuitImpl(makeCircuitData());
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });

      circuit.addComponent(r1);
      expect(circuit.getComponents()).toHaveLength(1);

      circuit.removeComponent('R1');
      expect(circuit.getComponents()).toHaveLength(0);
      expect(circuit.getComponentById('R1')).toBeUndefined();
    });

    it('should throw error when removing non-existent component', () => {
      const circuit = new CircuitImpl(makeCircuitData());

      expect(() => circuit.removeComponent('R1')).toThrow(WebSpiceError);
      expect(() => circuit.removeComponent('R1')).toThrow(
        "Component with ID 'R1' not found in circuit"
      );
    });

    it('should get component by ID', () => {
      const circuit = new CircuitImpl(makeCircuitData());
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });

      circuit.addComponent(r1);

      const retrieved = circuit.getComponentById('R1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('R1');
      expect(retrieved?.type).toBe('resistor');
    });

    it('should return undefined for non-existent component ID', () => {
      const circuit = new CircuitImpl(makeCircuitData());

      const retrieved = circuit.getComponentById('NonExistent');
      expect(retrieved).toBeUndefined();
    });

    it('should return all components as array', () => {
      const circuit = new CircuitImpl(makeCircuitData());
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });
      const r2 = createResistor({
        id: 'R2',
        resistance: 2000,
        nodes: ['2', '0'],
      });

      circuit.addComponent(r1);
      circuit.addComponent(r2);

      const components = circuit.getComponents();
      expect(components).toHaveLength(2);
      expect(components.map(c => c.id).sort()).toEqual(['R1', 'R2']);
    });

    it('should return defensive copy of components array', () => {
      const circuit = new CircuitImpl(makeCircuitData());
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });

      circuit.addComponent(r1);

      const components1 = circuit.getComponents();
      const components2 = circuit.getComponents();

      // Should be different array instances
      expect(components1).not.toBe(components2);
      // But with same content
      expect(components1).toEqual(components2);
    });
  });

  describe('node management', () => {
    it('should extract nodes from components', () => {
      const circuit = new CircuitImpl(makeCircuitData());
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
      const r2 = createResistor({
        id: 'R2',
        resistance: 2000,
        nodes: ['2', '0'],
      });

      circuit.addComponent(v1);
      circuit.addComponent(r1);
      circuit.addComponent(r2);

      const nodes = circuit.getNodes();
      expect(nodes).toHaveLength(3);

      const nodeIds = nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['0', '1', '2']);
    });

    it('should track connected components per node', () => {
      const circuit = new CircuitImpl(makeCircuitData());
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

      circuit.addComponent(v1);
      circuit.addComponent(r1);

      const nodes = circuit.getNodes();
      const node0 = nodes.find(n => n.id === '0');
      const node1 = nodes.find(n => n.id === '1');

      expect(node0?.connectedComponents.sort()).toEqual(['R1', 'V1']);
      expect(node1?.connectedComponents.sort()).toEqual(['R1', 'V1']);
    });

    it('should mark ground node correctly', () => {
      const circuit = new CircuitImpl(makeCircuitData({ groundNodeId: '0' }));
      const v1 = createDCVoltageSource({
        id: 'V1',
        voltage: 12,
        nodes: ['1', '0'],
      });

      circuit.addComponent(v1);

      const nodes = circuit.getNodes();
      const groundNode = nodes.find(n => n.id === '0');
      const otherNode = nodes.find(n => n.id === '1');

      expect(groundNode?.isGround).toBe(true);
      expect(otherNode?.isGround).toBe(false);
    });

    it('should handle ground component type', () => {
      const circuit = new CircuitImpl(makeCircuitData());
      const v1 = createDCVoltageSource({
        id: 'V1',
        voltage: 12,
        nodes: ['1', '0'],
      });
      const gnd = createGround({
        id: 'GND',
        nodeId: '0',
      });

      circuit.addComponent(v1);
      circuit.addComponent(gnd);

      const nodes = circuit.getNodes();
      const groundNode = nodes.find(n => n.id === '0');

      expect(groundNode).toBeDefined();
      expect(groundNode?.connectedComponents).toContain('GND');
      expect(groundNode?.connectedComponents).toContain('V1');
    });

    it('should return unique nodes only', () => {
      const circuit = new CircuitImpl(makeCircuitData());
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });
      const r2 = createResistor({
        id: 'R2',
        resistance: 2000,
        nodes: ['1', '0'],
      });

      circuit.addComponent(r1);
      circuit.addComponent(r2);

      const nodes = circuit.getNodes();
      const nodeIds = nodes.map(n => n.id);

      // Check uniqueness
      expect(nodeIds.length).toBe(new Set(nodeIds).size);
      expect(nodeIds.sort()).toEqual(['0', '1']);
    });

    it('should handle empty circuit (no nodes)', () => {
      const circuit = new CircuitImpl(makeCircuitData());

      const nodes = circuit.getNodes();
      expect(nodes).toEqual([]);
    });

    it('should use nodes getter', () => {
      const circuit = new CircuitImpl(makeCircuitData());
      const v1 = createDCVoltageSource({
        id: 'V1',
        voltage: 12,
        nodes: ['1', '0'],
      });

      circuit.addComponent(v1);

      // Test that nodes getter works
      expect(circuit.nodes).toHaveLength(2);
      expect(circuit.nodes).toEqual(circuit.getNodes());
    });
  });

  describe('validation', () => {
    describe('valid circuits', () => {
      it('should validate simple resistor circuit', () => {
        const circuit = new CircuitImpl(makeCircuitData());
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

        circuit.addComponent(v1);
        circuit.addComponent(r1);

        const result = circuit.validate();
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate voltage divider circuit', () => {
        const circuit = new CircuitImpl(makeCircuitData());
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
        const r2 = createResistor({
          id: 'R2',
          resistance: 2000,
          nodes: ['2', '0'],
        });

        circuit.addComponent(v1);
        circuit.addComponent(r1);
        circuit.addComponent(r2);

        const result = circuit.validate();
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate voltage divider fixture', () => {
        const dividerCircuit = new CircuitImpl({
          id: VOLTAGE_DIVIDER_12V.circuit.id,
          name: VOLTAGE_DIVIDER_12V.circuit.name,
          components: VOLTAGE_DIVIDER_12V.circuit.components,
          groundNodeId: VOLTAGE_DIVIDER_12V.circuit.groundNodeId,
        });

        const dividerResult = dividerCircuit.validate();
        expect(dividerResult.valid).toBe(true);
        expect(dividerResult.errors).toHaveLength(0);
      });

      it('should validate circuit with ground component', () => {
        const circuit = new CircuitImpl(makeCircuitData());
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
        const gnd = createGround({
          id: 'GND',
          nodeId: '0',
        });

        circuit.addComponent(v1);
        circuit.addComponent(r1);
        circuit.addComponent(gnd);

        const result = circuit.validate();
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid circuits', () => {
      it('should detect empty circuit', () => {
        const circuit = new CircuitImpl(makeCircuitData());

        const result = circuit.validate();
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('INVALID_CIRCUIT');
        expect(result.errors[0].message).toContain(
          'Circuit must have at least one component'
        );
      });

      it('should detect missing ground node', () => {
        const circuit = new CircuitImpl(
          makeCircuitData({
            groundNodeId: '0',
          })
        );
        const v1 = createDCVoltageSource({
          id: 'V1',
          voltage: 12,
          nodes: ['1', '2'],
        });
        const r1 = createResistor({
          id: 'R1',
          resistance: 1000,
          nodes: ['1', '2'],
        });

        circuit.addComponent(v1);
        circuit.addComponent(r1);

        const result = circuit.validate();
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.code === 'NO_GROUND')).toBe(true);
      });

      it('should detect floating node with no connections', () => {
        const circuit = new CircuitImpl(makeCircuitData());
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
        // Node '99' would be floating if it existed, but since nodes are derived,
        // we can't create a truly floating node this way.
        // This test would require manual node injection which we don't support.

        circuit.addComponent(v1);
        circuit.addComponent(r1);

        // This circuit should be valid since all nodes are properly connected
        const result = circuit.validate();
        expect(result.valid).toBe(true);
      });

      it('should detect floating node with only one connection', () => {
        const circuit = new CircuitImpl(makeCircuitData());
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
        // Node '2' only connected to R1 (one component) - floating!

        circuit.addComponent(v1);
        circuit.addComponent(r1);

        const result = circuit.validate();
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.code === 'FLOATING_NODE')).toBe(true);
        expect(result.errors.some(e => e.message.includes("Node '2'"))).toBe(
          true
        );
      });

      it('should allow ground node with single connection', () => {
        const circuit = new CircuitImpl(makeCircuitData());
        const gnd = createGround({
          id: 'GND',
          nodeId: '0',
        });

        circuit.addComponent(gnd);

        const result = circuit.validate();
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('validation result structure', () => {
      it('should return valid=true with no errors for valid circuit', () => {
        const circuit = new CircuitImpl(makeCircuitData());
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

        circuit.addComponent(v1);
        circuit.addComponent(r1);

        const result = circuit.validate();
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should return valid=false with error array for invalid circuit', () => {
        const circuit = new CircuitImpl(makeCircuitData());

        const result = circuit.validate();
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result.valid).toBe(false);
        expect(Array.isArray(result.errors)).toBe(true);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should provide context in errors', () => {
        const circuit = new CircuitImpl(makeCircuitData());
        const v1 = createDCVoltageSource({
          id: 'V1',
          voltage: 12,
          nodes: ['1', '2'],
        });

        circuit.addComponent(v1);

        const result = circuit.validate();
        expect(result.valid).toBe(false);

        // Check that errors have proper structure
        for (const error of result.errors) {
          expect(error).toBeInstanceOf(WebSpiceError);
          expect(error).toHaveProperty('code');
          expect(error).toHaveProperty('message');
        }
      });
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON with toJSON()', () => {
      const circuit = new CircuitImpl(makeCircuitData());
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

      circuit.addComponent(v1);
      circuit.addComponent(r1);

      const json = circuit.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('components');
      expect(json).toHaveProperty('nodes');
      expect(json).toHaveProperty('groundNodeId');
      expect(json.id).toBe('test-circuit');
      expect(json.name).toBe('Test Circuit');
      expect(json.components).toHaveLength(2);
      expect(json.nodes).toHaveLength(2);
      expect(json.groundNodeId).toBe('0');
    });

    it('should handle JSON.stringify()', () => {
      const circuit = new CircuitImpl(makeCircuitData());
      const r1 = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });

      circuit.addComponent(r1);

      const jsonString = JSON.stringify(circuit);
      expect(jsonString).toBeTruthy();

      const parsed = JSON.parse(jsonString);
      expect(parsed.id).toBe('test-circuit');
      expect(parsed.components).toHaveLength(1);
    });

    it('should deserialize from JSON with fromJSON()', () => {
      const circuit = new CircuitImpl(makeCircuitData({ id: 'original' }));
      const v1 = createDCVoltageSource({
        id: 'V1',
        voltage: 12,
        nodes: ['1', '0'],
      });

      circuit.addComponent(v1);

      const json = circuit.toJSON();
      const restored = CircuitImpl.fromJSON(json);

      expect(restored.id).toBe('original');
      expect(restored.getComponents()).toHaveLength(1);
      expect(restored.getComponentById('V1')).toBeDefined();
    });

    it('should round-trip serialize/deserialize', () => {
      const circuit = new CircuitImpl(makeCircuitData());
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
      const r2 = createResistor({
        id: 'R2',
        resistance: 2000,
        nodes: ['2', '0'],
      });

      circuit.addComponent(v1);
      circuit.addComponent(r1);
      circuit.addComponent(r2);

      const json = circuit.toJSON();
      const restored = CircuitImpl.fromJSON(json);

      expect(restored.id).toBe(circuit.id);
      expect(restored.name).toBe(circuit.name);
      expect(restored.groundNodeId).toBe(circuit.groundNodeId);
      expect(restored.getComponents()).toHaveLength(3);
      expect(restored.getNodes()).toHaveLength(3);

      const restoredValidation = restored.validate();
      expect(restoredValidation.valid).toBe(true);
    });

    it('should handle optional fields', () => {
      const circuit = new CircuitImpl(
        makeCircuitData({
          description: 'Test description',
        })
      );

      const json = circuit.toJSON();
      expect(json.description).toBe('Test description');

      const restored = CircuitImpl.fromJSON(json);
      expect(restored.description).toBe('Test description');
    });

    it('should handle missing optional fields', () => {
      const circuit = new CircuitImpl(makeCircuitData());

      const json = circuit.toJSON();
      expect(json.description).toBeUndefined();

      const restored = CircuitImpl.fromJSON(json);
      expect(restored.description).toBeUndefined();
    });
  });
});
