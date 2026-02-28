import { describe, expect, it } from 'vitest';
import type { CircuitJSON, ComponentJSON } from '@/types/circuit';
import { parseCircuit } from '@/engine/parser/circuitParser';

// ============================================================================
// Test Helpers
// ============================================================================

/** 기본 ComponentJSON 생성. overrides로 특정 필드만 변경 가능 */
function makeComponentJSON(overrides?: Partial<ComponentJSON>): ComponentJSON {
  return {
    id: 'R1',
    type: 'resistor',
    name: 'R1',
    nodes: ['1', '0'],
    parameters: { resistance: 1000 },
    ...overrides,
  };
}

/**
 * 기본 CircuitJSON 생성 (R1 + V1 + GND 포함).
 * overrides로 name, ground, components 등을 테스트별로 변경 가능.
 */
function makeCircuitJSON(overrides?: Partial<CircuitJSON>): CircuitJSON {
  return {
    name: 'Test Circuit',
    ground: '0',
    components: [
      makeComponentJSON(),
      {
        id: 'V1',
        type: 'voltage_source',
        name: 'V1',
        nodes: ['1', '0'],
        parameters: { sourceType: 'dc', voltage: 12 },
      },
      {
        id: 'GND',
        type: 'ground',
        name: 'GND',
        nodes: ['0'],
        parameters: {},
      },
    ],
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Circuit Parser', () => {
  describe('valid circuit parsing', () => {
    it('should parse a voltage divider circuit', () => {
      const json: CircuitJSON = {
        name: 'Voltage Divider',
        description: '12V voltage divider with 1kΩ and 2kΩ resistors',
        ground: '0',
        components: [
          {
            id: 'V1',
            type: 'voltage_source',
            name: 'V1',
            nodes: ['1', '0'],
            parameters: { sourceType: 'dc', voltage: 12 },
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
          {
            id: 'GND',
            type: 'ground',
            name: 'GND',
            nodes: ['0'],
            parameters: {},
          },
        ],
      };

      const circuit = parseCircuit(json);

      expect(circuit.name).toBe('Voltage Divider');
      expect(circuit.description).toBe(
        '12V voltage divider with 1kΩ and 2kΩ resistors'
      );
      expect(circuit.groundNodeId).toBe('0');
      expect(circuit.components).toHaveLength(4);
    });

    it('should parse a circuit with multiple source types', () => {
      const json: CircuitJSON = {
        name: 'Multi Source',
        ground: '0',
        components: [
          {
            id: 'V1',
            type: 'voltage_source',
            name: 'V1',
            nodes: ['1', '0'],
            parameters: { sourceType: 'dc', voltage: 12 },
          },
          {
            id: 'I1',
            type: 'current_source',
            name: 'I1',
            nodes: ['2', '0'],
            parameters: { sourceType: 'dc', current: 0.001 },
          },
          {
            id: 'R1',
            type: 'resistor',
            name: 'R1',
            nodes: ['1', '2'],
            parameters: { resistance: 1000 },
          },
          {
            id: 'GND',
            type: 'ground',
            name: 'GND',
            nodes: ['0'],
            parameters: {},
          },
        ],
      };

      const circuit = parseCircuit(json);

      expect(circuit.components).toHaveLength(4);

      const v1 = circuit.components.find(c => c.id === 'V1');
      expect(v1).toBeDefined();
      expect(v1!.type).toBe('voltage_source');

      const i1 = circuit.components.find(c => c.id === 'I1');
      expect(i1).toBeDefined();
      expect(i1!.type).toBe('current_source');
    });

    it('should parse a circuit without description', () => {
      const json = makeCircuitJSON({ description: undefined });

      const circuit = parseCircuit(json);

      expect(circuit.description).toBeUndefined();
    });
  });

  describe('component parsing - resistor', () => {
    it('should parse a resistor with correct properties', () => {
      const json = makeCircuitJSON({
        components: [
          {
            id: 'R1',
            type: 'resistor',
            name: 'Load Resistor',
            nodes: ['1', '0'],
            parameters: { resistance: 4700 },
          },
          {
            id: 'V1',
            type: 'voltage_source',
            name: 'V1',
            nodes: ['1', '0'],
            parameters: { sourceType: 'dc', voltage: 5 },
          },
          {
            id: 'GND',
            type: 'ground',
            name: 'GND',
            nodes: ['0'],
            parameters: {},
          },
        ],
      });

      const circuit = parseCircuit(json);
      const resistor = circuit.components.find(c => c.id === 'R1');

      expect(resistor).toBeDefined();
      expect(resistor!.type).toBe('resistor');
      if (resistor!.type === 'resistor') {
        expect(resistor!.resistance).toBe(4700);
        expect(resistor!.name).toBe('Load Resistor');
        expect(resistor!.terminals[0].nodeId).toBe('1');
        expect(resistor!.terminals[1].nodeId).toBe('0');
      }
    });
  });

  describe('component parsing - voltage source', () => {
    it('should parse a DC voltage source with explicit sourceType', () => {
      const json = makeCircuitJSON();

      const circuit = parseCircuit(json);
      const source = circuit.components.find(c => c.id === 'V1');

      expect(source).toBeDefined();
      expect(source!.type).toBe('voltage_source');
      if (source!.type === 'voltage_source' && source!.sourceType === 'dc') {
        expect(source!.voltage).toBe(12);
      }
    });

    it('should default sourceType to dc when not specified', () => {
      const json = makeCircuitJSON({
        components: [
          {
            id: 'V1',
            type: 'voltage_source',
            name: 'V1',
            nodes: ['1', '0'],
            parameters: { voltage: 5 },
          },
          makeComponentJSON(),
          {
            id: 'GND',
            type: 'ground',
            name: 'GND',
            nodes: ['0'],
            parameters: {},
          },
        ],
      });

      const circuit = parseCircuit(json);
      const source = circuit.components.find(c => c.id === 'V1');

      expect(source).toBeDefined();
      if (source!.type === 'voltage_source' && source!.sourceType === 'dc') {
        expect(source!.voltage).toBe(5);
      }
    });
  });

  describe('component parsing - current source', () => {
    it('should parse a DC current source', () => {
      const json = makeCircuitJSON({
        components: [
          {
            id: 'I1',
            type: 'current_source',
            name: 'I1',
            nodes: ['1', '0'],
            parameters: { sourceType: 'dc', current: 0.005 },
          },
          makeComponentJSON(),
          {
            id: 'GND',
            type: 'ground',
            name: 'GND',
            nodes: ['0'],
            parameters: {},
          },
        ],
      });

      const circuit = parseCircuit(json);
      const source = circuit.components.find(c => c.id === 'I1');

      expect(source).toBeDefined();
      expect(source!.type).toBe('current_source');
      if (source!.type === 'current_source' && source!.sourceType === 'dc') {
        expect(source!.current).toBe(0.005);
      }
    });
  });

  describe('component parsing - ground', () => {
    it('should parse a ground component with nodeId from nodes[0]', () => {
      const json = makeCircuitJSON();

      const circuit = parseCircuit(json);
      const ground = circuit.components.find(c => c.id === 'GND');

      expect(ground).toBeDefined();
      expect(ground!.type).toBe('ground');
      if (ground!.type === 'ground') {
        expect(ground!.nodeId).toBe('0');
      }
    });
  });

  describe('ground handling', () => {
    it('should use circuit-level ground field as groundNodeId', () => {
      const json = makeCircuitJSON({ ground: 'gnd' });

      const circuit = parseCircuit(json);

      expect(circuit.groundNodeId).toBe('gnd');
    });

    it('should default groundNodeId to 0 when ground field is missing', () => {
      const json = makeCircuitJSON({ ground: undefined });

      const circuit = parseCircuit(json);

      expect(circuit.groundNodeId).toBe('0');
    });
  });

  describe('error: circuit-level validation', () => {
    it('should throw error for null input', () => {
      expect(() =>
        parseCircuit(null as unknown as CircuitJSON)
      ).toThrowWebSpiceError('INVALID_CIRCUIT', 'Circuit JSON is required');
    });

    it('should throw error for undefined input', () => {
      expect(() =>
        parseCircuit(undefined as unknown as CircuitJSON)
      ).toThrowWebSpiceError('INVALID_CIRCUIT', 'Circuit JSON is required');
    });

    it('should throw error for empty circuit name', () => {
      expect(() =>
        parseCircuit(makeCircuitJSON({ name: '' }))
      ).toThrowWebSpiceError('INVALID_CIRCUIT');
    });

    it('should throw error for empty components array', () => {
      expect(() =>
        parseCircuit(makeCircuitJSON({ components: [] }))
      ).toThrowWebSpiceError('INVALID_CIRCUIT', 'at least one component');
    });
  });

  describe('error: unsupported component types', () => {
    it('should throw error for capacitor (not yet supported)', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'C1',
                type: 'capacitor',
                name: 'C1',
                nodes: ['1', '0'],
                parameters: { capacitance: 1e-6 },
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_COMPONENT', 'not yet supported');
    });

    it('should throw error for inductor (not yet supported)', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'L1',
                type: 'inductor',
                name: 'L1',
                nodes: ['1', '0'],
                parameters: { inductance: 1e-3 },
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_COMPONENT', 'not yet supported');
    });

    it('should throw error for AC voltage source (not yet supported)', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'V1',
                type: 'voltage_source',
                name: 'V1',
                nodes: ['1', '0'],
                parameters: { sourceType: 'ac', amplitude: 10, frequency: 60 },
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_COMPONENT', 'not yet supported');
    });

    it('should throw error for AC current source (not yet supported)', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'I1',
                type: 'current_source',
                name: 'I1',
                nodes: ['1', '0'],
                parameters: {
                  sourceType: 'ac',
                  amplitude: 0.01,
                  frequency: 60,
                },
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_COMPONENT', 'not yet supported');
    });
  });

  describe('error: missing required parameters', () => {
    it('should throw error for resistor without resistance parameter', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'R1',
                type: 'resistor',
                name: 'R1',
                nodes: ['1', '0'],
                parameters: {},
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_PARAMETER', 'resistance');
    });

    it('should throw error for voltage source without voltage parameter', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'V1',
                type: 'voltage_source',
                name: 'V1',
                nodes: ['1', '0'],
                parameters: { sourceType: 'dc' },
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_PARAMETER', 'voltage');
    });

    it('should throw error for current source without current parameter', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'I1',
                type: 'current_source',
                name: 'I1',
                nodes: ['1', '0'],
                parameters: { sourceType: 'dc' },
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_PARAMETER', 'current');
    });
  });

  describe('error: invalid nodes', () => {
    it('should throw error for two-terminal component with wrong number of nodes', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'R1',
                type: 'resistor',
                name: 'R1',
                nodes: ['1'],
                parameters: { resistance: 1000 },
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_COMPONENT', 'exactly 2 nodes');
    });

    it('should throw error for ground component with no nodes', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'GND',
                type: 'ground',
                name: 'GND',
                nodes: [],
                parameters: {},
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_COMPONENT', 'exactly 1 node');
    });
  });

  describe('error: component value validation (delegated to Impl)', () => {
    it('should throw error for invalid resistance value', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'R1',
                type: 'resistor',
                name: 'R1',
                nodes: ['1', '0'],
                parameters: { resistance: -100 },
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for NaN voltage value', () => {
      expect(() =>
        parseCircuit(
          makeCircuitJSON({
            components: [
              {
                id: 'V1',
                type: 'voltage_source',
                name: 'V1',
                nodes: ['1', '0'],
                parameters: { sourceType: 'dc', voltage: NaN },
              },
            ],
          })
        )
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });
  });
});
