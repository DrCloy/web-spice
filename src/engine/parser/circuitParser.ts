import type { CircuitJSON, ComponentJSON } from '@/types/circuit';
import type { Component } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';
import { CircuitImpl } from '@/engine/circuit';
import { ResistorImpl } from '@/engine/components/resistor';
import { DCVoltageSourceImpl } from '@/engine/components/dcVoltageSource';
import { DCCurrentSourceImpl } from '@/engine/components/dcCurrentSource';
import { parseSIValue } from '@/engine/parser/siPrefix';

/**
 * Parses a CircuitJSON object into a CircuitImpl instance.
 *
 * Converts flat ComponentJSON representations (with generic parameters)
 * into typed Component domain objects using the appropriate Impl constructors.
 * Structural validation (null checks, required parameters, node counts) is done here;
 * value validation (resistance range, voltage finite, etc.) is delegated to Impl constructors.
 *
 * @param json - CircuitJSON object to parse
 * @returns CircuitImpl instance with all components
 * @throws {WebSpiceError} INVALID_CIRCUIT for invalid circuit structure
 * @throws {WebSpiceError} INVALID_COMPONENT for unsupported or malformed components
 * @throws {WebSpiceError} INVALID_PARAMETER for missing or invalid parameter values
 */
export function parseCircuit(json: CircuitJSON): CircuitImpl {
  // Validate input exists
  if (!json) {
    throw new WebSpiceError('INVALID_CIRCUIT', 'Circuit JSON is required');
  }

  // Validate components array is non-empty
  if (!json.components || json.components.length === 0) {
    throw new WebSpiceError(
      'INVALID_CIRCUIT',
      'Circuit must have at least one component'
    );
  }

  // Parse each component and collect
  const components = json.components.map(parseComponent);

  // Create CircuitImpl (name validation is delegated to CircuitImpl constructor)
  return new CircuitImpl({
    id: json.id,
    name: json.name,
    description: json.description,
    groundNodeId: json.ground || '0',
    components,
  });
}

/**
 * Converts a ComponentJSON into a typed Component domain object.
 * Validates structural correctness (required parameters, node count)
 * before delegating value validation to Impl constructors.
 */
function parseComponent(json: ComponentJSON): Component {
  switch (json.type) {
    case 'resistor':
      return parseResistor(json);
    case 'voltage_source':
      return parseVoltageSource(json);
    case 'current_source':
      return parseCurrentSource(json);
    case 'ground':
      return parseGround(json);
    default:
      throw new WebSpiceError(
        'UNSUPPORTED_ANALYSIS',
        `Component type '${json.type}' is not yet supported`,
        { componentId: json.id }
      );
  }
}

function parseResistor(json: ComponentJSON): Component {
  assertNodeCount(json, 2);
  assertRequiredParameter(json, 'resistance');

  return new ResistorImpl({
    id: json.id,
    type: 'resistor',
    name: json.name,
    resistance: parseSIValue(json.parameters.resistance),
    terminals: [
      { name: 'terminal1', nodeId: json.nodes[0] },
      { name: 'terminal2', nodeId: json.nodes[1] },
    ],
  });
}

function parseVoltageSource(json: ComponentJSON): Component {
  assertNodeCount(json, 2);

  const sourceType = json.parameters.sourceType ?? 'dc';
  if (sourceType !== 'dc') {
    throw new WebSpiceError(
      'UNSUPPORTED_ANALYSIS',
      `Voltage source '${json.id}' sourceType '${sourceType}' is not yet supported`,
      { componentId: json.id }
    );
  }

  assertRequiredParameter(json, 'voltage');

  return new DCVoltageSourceImpl({
    id: json.id,
    type: 'voltage_source',
    sourceType: 'dc',
    name: json.name,
    voltage: parseSIValue(json.parameters.voltage),
    terminals: [
      { name: 'pos', nodeId: json.nodes[0] },
      { name: 'neg', nodeId: json.nodes[1] },
    ],
  });
}

function parseCurrentSource(json: ComponentJSON): Component {
  assertNodeCount(json, 2);

  const sourceType = json.parameters.sourceType ?? 'dc';
  if (sourceType !== 'dc') {
    throw new WebSpiceError(
      'UNSUPPORTED_ANALYSIS',
      `Current source '${json.id}' sourceType '${sourceType}' is not yet supported`,
      { componentId: json.id }
    );
  }

  assertRequiredParameter(json, 'current');

  return new DCCurrentSourceImpl({
    id: json.id,
    type: 'current_source',
    sourceType: 'dc',
    name: json.name,
    current: parseSIValue(json.parameters.current),
    terminals: [
      { name: 'pos', nodeId: json.nodes[0] },
      { name: 'neg', nodeId: json.nodes[1] },
    ],
  });
}

function parseGround(json: ComponentJSON): Component {
  assertNodeCount(json, 1);

  return {
    id: json.id,
    type: 'ground',
    name: json.name,
    nodeId: json.nodes[0],
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

function componentLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

function assertNodeCount(json: ComponentJSON, expected: number): void {
  if (json.nodes.length !== expected) {
    throw new WebSpiceError(
      'INVALID_COMPONENT',
      `${componentLabel(json.type)} '${json.id}' must have exactly ${expected} node${expected === 1 ? '' : 's'}`,
      { componentId: json.id }
    );
  }
}

function assertRequiredParameter(json: ComponentJSON, key: string): void {
  if (json.parameters[key] === undefined) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `${componentLabel(json.type)} '${json.id}' requires '${key}' parameter`,
      { componentId: json.id }
    );
  }
}
