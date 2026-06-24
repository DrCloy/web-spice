import type { Component, ComponentId, ComponentType } from '@/types/component';
import type { PaletteDragPayload } from '@/types/editor';

export function typeToPrefix(type: ComponentType): string {
  switch (type) {
    case 'resistor':
      return 'R';
    case 'capacitor':
      return 'C';
    case 'inductor':
      return 'L';
    case 'voltage_source':
      return 'V';
    case 'current_source':
      return 'I';
    case 'ground':
      return 'GND';
    default:
      return 'X';
  }
}

/** Returns the lowest available ID using SPICE-style prefix + integer suffix. */
export function generateComponentId(
  type: ComponentType,
  existingIds: ComponentId[]
): string {
  const prefix = typeToPrefix(type);
  const taken = new Set(
    existingIds
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.slice(prefix.length), 10))
      .filter(n => Number.isInteger(n) && n > 0)
  );
  let n = 1;
  while (taken.has(n)) n++;
  return `${prefix}${n}`;
}

/** Creates a plain Component object with sensible defaults for a palette drop. */
export function createDefaultComponent(
  payload: PaletteDragPayload,
  id: string
): Component {
  switch (payload.type) {
    case 'resistor':
      return {
        id,
        type: 'resistor',
        name: id,
        resistance: 1000,
        terminals: [
          { name: 'terminal1', nodeId: `${id}_1` },
          { name: 'terminal2', nodeId: `${id}_2` },
        ],
      };
    case 'capacitor':
      return {
        id,
        type: 'capacitor',
        name: id,
        capacitance: 1e-6,
        terminals: [
          { name: 'pos', nodeId: `${id}_p` },
          { name: 'neg', nodeId: `${id}_n` },
        ],
      };
    case 'inductor':
      return {
        id,
        type: 'inductor',
        name: id,
        inductance: 1e-3,
        terminals: [
          { name: 'terminal1', nodeId: `${id}_1` },
          { name: 'terminal2', nodeId: `${id}_2` },
        ],
      };
    case 'voltage_source':
      if (payload.sourceType === 'ac') {
        return {
          id,
          type: 'voltage_source',
          sourceType: 'ac',
          name: id,
          amplitude: 1,
          frequency: 1000,
          terminals: [
            { name: 'pos', nodeId: `${id}_p` },
            { name: 'neg', nodeId: `${id}_n` },
          ],
        };
      }
      return {
        id,
        type: 'voltage_source',
        sourceType: 'dc',
        name: id,
        voltage: 5,
        terminals: [
          { name: 'pos', nodeId: `${id}_p` },
          { name: 'neg', nodeId: `${id}_n` },
        ],
      };
    case 'current_source':
      return {
        id,
        type: 'current_source',
        sourceType: 'dc',
        name: id,
        current: 0.001,
        terminals: [
          { name: 'pos', nodeId: `${id}_p` },
          { name: 'neg', nodeId: `${id}_n` },
        ],
      };
    case 'ground':
      return {
        id,
        type: 'ground',
        name: id,
        nodeId: '0',
      };
  }
}
