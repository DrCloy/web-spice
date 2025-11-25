/**
 * WebSpice Component Type Definitions
 */

// =============================================================================
// Basic Types
// =============================================================================

/** Unique identifier for components */
export type ComponentId = string;

/** Unique identifier for nodes */
export type NodeId = string;

/** SI unit prefixes for engineering notation */
export type UnitPrefix =
  | 'f'
  | 'p'
  | 'n'
  | 'u'
  | 'm'
  | ''
  | 'k'
  | 'M'
  | 'G'
  | 'T';

/** Complex number representation for AC analysis */
export interface Complex {
  real: number;
  imag: number;
}

// =============================================================================
// Component Types
// =============================================================================

/** Supported component types in WebSpice */
export type ComponentType =
  | 'resistor'
  | 'capacitor'
  | 'inductor'
  | 'voltage_source'
  | 'current_source'
  | 'diode'
  | 'bjt'
  | 'mosfet'
  | 'ground';

/** Terminal connection point on a component */
export interface Terminal {
  name: string;
  nodeId: NodeId;
}

/** Base interface for all circuit components */
export interface BaseComponent {
  id: ComponentId;
  type: ComponentType;
  name: string;
  terminals: Terminal[];
}

/** Two-terminal component (most passive components) */
export interface TwoTerminalComponent extends BaseComponent {
  terminals: [Terminal, Terminal];
}

/** Resistor component */
export interface Resistor extends TwoTerminalComponent {
  type: 'resistor';
  resistance: number; // Ohms (must be > 0)
}

/** Capacitor component */
export interface Capacitor extends TwoTerminalComponent {
  type: 'capacitor';
  capacitance: number; // Farads (must be > 0)
  initialVoltage?: number; // Initial voltage for transient analysis (Volts)
}

/** Inductor component */
export interface Inductor extends TwoTerminalComponent {
  type: 'inductor';
  inductance: number; // Henrys (must be > 0)
  initialCurrent?: number; // Initial current for transient analysis (Amperes)
}

/** Voltage source waveform types */
export type VoltageSourceType = 'dc' | 'ac';

/** DC voltage source */
export interface DCVoltageSource extends TwoTerminalComponent {
  type: 'voltage_source';
  sourceType: 'dc';
  voltage: number; // Volts (can be negative for reversed polarity)
}

/** AC voltage source */
export interface ACVoltageSource extends TwoTerminalComponent {
  type: 'voltage_source';
  sourceType: 'ac';
  amplitude: number; // Peak voltage in Volts (must be >= 0)
  frequency: number; // Hz (must be > 0)
  phase?: number; // Degrees (typically 0-360)
  dcOffset?: number; // DC offset in Volts
}

/** Voltage source union type */
export type VoltageSource = DCVoltageSource | ACVoltageSource;

/** Current source waveform types */
export type CurrentSourceType = 'dc' | 'ac';

/** DC current source */
export interface DCCurrentSource extends TwoTerminalComponent {
  type: 'current_source';
  sourceType: 'dc';
  current: number; // Amperes (can be negative for reversed direction)
}

/** AC current source */
export interface ACCurrentSource extends TwoTerminalComponent {
  type: 'current_source';
  sourceType: 'ac';
  amplitude: number; // Peak current in Amperes (must be >= 0)
  frequency: number; // Hz (must be > 0)
  phase?: number; // Degrees (typically 0-360)
  dcOffset?: number; // DC offset in Amperes
}

/** Current source union type */
export type CurrentSource = DCCurrentSource | ACCurrentSource;

/** Ground reference node - special type without terminals */
export interface Ground {
  id: ComponentId;
  type: 'ground';
  name: string;
  nodeId: NodeId; // The node ID this ground references
}

/** Union type for all components */
export type Component =
  | Resistor
  | Capacitor
  | Inductor
  | VoltageSource
  | CurrentSource
  | Ground;
