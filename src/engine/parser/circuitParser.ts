import type { CircuitJSON, ComponentJSON } from '@/types/circuit';
import type { Component } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';
import { CircuitImpl } from '@/engine/circuit';
import { ResistorImpl } from '@/engine/components/resistor';
import { DCVoltageSourceImpl } from '@/engine/components/dcVoltageSource';
import { DCCurrentSourceImpl } from '@/engine/components/dcCurrentSource';

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
    id: json.name,
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
        'INVALID_COMPONENT',
        `Component type '${json.type}' is not yet supported`,
        { componentId: json.id }
      );
  }
}

function parseResistor(json: ComponentJSON): Component {
  if (json.nodes.length !== 2) {
    throw new WebSpiceError(
      'INVALID_COMPONENT',
      `Resistor '${json.id}' must have exactly 2 nodes`,
      { componentId: json.id }
    );
  }

  if (json.parameters.resistance == null) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Resistor '${json.id}' requires 'resistance' parameter`,
      { componentId: json.id }
    );
  }

  return new ResistorImpl({
    id: json.id,
    type: 'resistor',
    name: json.name,
    resistance: Number(json.parameters.resistance),
    terminals: [
      { name: 'terminal1', nodeId: json.nodes[0] },
      { name: 'terminal2', nodeId: json.nodes[1] },
    ],
  });
}

function parseVoltageSource(json: ComponentJSON): Component {
  if (json.nodes.length !== 2) {
    throw new WebSpiceError(
      'INVALID_COMPONENT',
      `Voltage source '${json.id}' must have exactly 2 nodes`,
      { componentId: json.id }
    );
  }

  const sourceType = json.parameters.sourceType ?? 'dc';
  if (sourceType !== 'dc') {
    throw new WebSpiceError(
      'INVALID_COMPONENT',
      `Voltage source '${json.id}' sourceType '${sourceType}' is not yet supported`,
      { componentId: json.id }
    );
  }

  if (json.parameters.voltage == null) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Voltage source '${json.id}' requires 'voltage' parameter`,
      { componentId: json.id }
    );
  }

  return new DCVoltageSourceImpl({
    id: json.id,
    type: 'voltage_source',
    sourceType: 'dc',
    name: json.name,
    voltage: Number(json.parameters.voltage),
    terminals: [
      { name: 'pos', nodeId: json.nodes[0] },
      { name: 'neg', nodeId: json.nodes[1] },
    ],
  });
}

function parseCurrentSource(json: ComponentJSON): Component {
  if (json.nodes.length !== 2) {
    throw new WebSpiceError(
      'INVALID_COMPONENT',
      `Current source '${json.id}' must have exactly 2 nodes`,
      { componentId: json.id }
    );
  }

  const sourceType = json.parameters.sourceType ?? 'dc';
  if (sourceType !== 'dc') {
    throw new WebSpiceError(
      'INVALID_COMPONENT',
      `Current source '${json.id}' sourceType '${sourceType}' is not yet supported`,
      { componentId: json.id }
    );
  }

  if (json.parameters.current == null) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Current source '${json.id}' requires 'current' parameter`,
      { componentId: json.id }
    );
  }

  return new DCCurrentSourceImpl({
    id: json.id,
    type: 'current_source',
    sourceType: 'dc',
    name: json.name,
    current: Number(json.parameters.current),
    terminals: [
      { name: 'pos', nodeId: json.nodes[0] },
      { name: 'neg', nodeId: json.nodes[1] },
    ],
  });
}

function parseGround(json: ComponentJSON): Component {
  if (json.nodes.length !== 1) {
    throw new WebSpiceError(
      'INVALID_COMPONENT',
      `Ground '${json.id}' must have exactly 1 node`,
      { componentId: json.id }
    );
  }

  return {
    id: json.id,
    type: 'ground',
    name: json.name,
    nodeId: json.nodes[0],
  };
}
