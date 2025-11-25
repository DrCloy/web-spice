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
  resistance: number; // Ohms
}

/** Capacitor component */
export interface Capacitor extends TwoTerminalComponent {
  type: 'capacitor';
  capacitance: number; // Farads
  initialVoltage?: number; // Initial voltage for transient analysis
}

/** Inductor component */
export interface Inductor extends TwoTerminalComponent {
  type: 'inductor';
  inductance: number; // Henrys
  initialCurrent?: number; // Initial current for transient analysis
}

/** Voltage source waveform types */
export type VoltageSourceType = 'dc' | 'ac' | 'pulse' | 'sin';

/** DC voltage source */
export interface DCVoltageSource extends TwoTerminalComponent {
  type: 'voltage_source';
  sourceType: 'dc';
  voltage: number; // Volts
}

/** AC voltage source */
export interface ACVoltageSource extends TwoTerminalComponent {
  type: 'voltage_source';
  sourceType: 'ac';
  amplitude: number; // Peak voltage
  frequency: number; // Hz
  phase?: number; // Degrees
  dcOffset?: number; // DC offset
}

/** Voltage source union type */
export type VoltageSource = DCVoltageSource | ACVoltageSource;

/** Current source waveform types */
export type CurrentSourceType = 'dc' | 'ac';

/** DC current source */
export interface DCCurrentSource extends TwoTerminalComponent {
  type: 'current_source';
  sourceType: 'dc';
  current: number; // Amperes
}

/** AC current source */
export interface ACCurrentSource extends TwoTerminalComponent {
  type: 'current_source';
  sourceType: 'ac';
  amplitude: number; // Peak current
  frequency: number; // Hz
  phase?: number; // Degrees
  dcOffset?: number; // DC offset
}

/** Current source union type */
export type CurrentSource = DCCurrentSource | ACCurrentSource;

/** Ground reference node */
export interface Ground extends BaseComponent {
  type: 'ground';
}

/** Union type for all components */
export type Component =
  | Resistor
  | Capacitor
  | Inductor
  | VoltageSource
  | CurrentSource
  | Ground;
