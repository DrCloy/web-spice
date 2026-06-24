import { describe, expect, it } from 'vitest';
import {
  createDefaultComponent,
  generateComponentId,
  typeToPrefix,
} from '@/utils/componentFactory';

// ---------------------------------------------------------------------------
// typeToPrefix
// ---------------------------------------------------------------------------

describe('typeToPrefix', () => {
  it.each([
    ['resistor', 'R'],
    ['capacitor', 'C'],
    ['inductor', 'L'],
    ['voltage_source', 'V'],
    ['current_source', 'I'],
    ['ground', 'GND'],
  ] as const)('maps %s to %s', (type, expected) => {
    expect(typeToPrefix(type)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// generateComponentId
// ---------------------------------------------------------------------------

describe('generateComponentId', () => {
  it('returns prefix+1 when no existing IDs', () => {
    expect(generateComponentId('resistor', [])).toBe('R1');
  });

  it('increments past the highest occupied number', () => {
    expect(generateComponentId('resistor', ['R1', 'R2', 'R3'])).toBe('R4');
  });

  it('fills the first gap', () => {
    expect(generateComponentId('resistor', ['R1', 'R3'])).toBe('R2');
  });

  it('ignores IDs with different prefixes', () => {
    expect(generateComponentId('capacitor', ['R1', 'R2'])).toBe('C1');
  });

  it('ignores IDs with matching prefix but non-integer suffix', () => {
    expect(generateComponentId('resistor', ['Rabc', 'R0'])).toBe('R1');
  });

  it('works for voltage_source prefix V', () => {
    expect(generateComponentId('voltage_source', ['V1'])).toBe('V2');
  });

  it('works for ground prefix GND', () => {
    expect(generateComponentId('ground', [])).toBe('GND1');
  });
});

// ---------------------------------------------------------------------------
// createDefaultComponent
// ---------------------------------------------------------------------------

describe('createDefaultComponent', () => {
  it('creates a resistor with 1kΩ default and two terminals', () => {
    const comp = createDefaultComponent({ type: 'resistor' }, 'R1');
    expect(comp.type).toBe('resistor');
    expect(comp.id).toBe('R1');
    if (comp.type === 'resistor') {
      expect(comp.resistance).toBe(1000);
      expect(comp.terminals[0].nodeId).toBe('R1_1');
      expect(comp.terminals[1].nodeId).toBe('R1_2');
    }
  });

  it('creates a capacitor with 1µF default', () => {
    const comp = createDefaultComponent({ type: 'capacitor' }, 'C1');
    expect(comp.type).toBe('capacitor');
    if (comp.type === 'capacitor') {
      expect(comp.capacitance).toBe(1e-6);
      expect(comp.terminals[0].name).toBe('pos');
      expect(comp.terminals[1].name).toBe('neg');
    }
  });

  it('creates an inductor with 1mH default', () => {
    const comp = createDefaultComponent({ type: 'inductor' }, 'L1');
    expect(comp.type).toBe('inductor');
    if (comp.type === 'inductor') {
      expect(comp.inductance).toBe(1e-3);
      expect(comp.terminals[0].name).toBe('terminal1');
    }
  });

  it('creates a DC voltage source with 5V default', () => {
    const comp = createDefaultComponent(
      { type: 'voltage_source', sourceType: 'dc' },
      'V1'
    );
    expect(comp.type).toBe('voltage_source');
    if (comp.type === 'voltage_source' && comp.sourceType === 'dc') {
      expect(comp.voltage).toBe(5);
    }
  });

  it('creates an AC voltage source with amplitude and frequency', () => {
    const comp = createDefaultComponent(
      { type: 'voltage_source', sourceType: 'ac' },
      'V2'
    );
    expect(comp.type).toBe('voltage_source');
    if (comp.type === 'voltage_source' && comp.sourceType === 'ac') {
      expect(comp.amplitude).toBe(1);
      expect(comp.frequency).toBe(1000);
    }
  });

  it('creates a DC current source with 1mA default', () => {
    const comp = createDefaultComponent({ type: 'current_source' }, 'I1');
    expect(comp.type).toBe('current_source');
    if (comp.type === 'current_source' && comp.sourceType === 'dc') {
      expect(comp.current).toBe(0.001);
    }
  });

  it('creates a ground component referencing node 0', () => {
    const comp = createDefaultComponent({ type: 'ground' }, 'GND1');
    expect(comp.type).toBe('ground');
    if (comp.type === 'ground') {
      expect(comp.nodeId).toBe('0');
    }
  });

  it('uses the provided id as both id and name', () => {
    const comp = createDefaultComponent({ type: 'resistor' }, 'R42');
    expect(comp.id).toBe('R42');
    expect(comp.name).toBe('R42');
  });
});
