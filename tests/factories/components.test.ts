/**
 * Tests for component factory functions
 */

import { describe, expect, it } from 'vitest';
import {
  createACCurrentSource,
  createACVoltageSource,
  createCapacitor,
  createDCCurrentSource,
  createDCVoltageSource,
  createGround,
  createInductor,
  createResistor,
} from './components';

describe('Component Factories', () => {
  describe('createGround', () => {
    it('should create ground component', () => {
      const ground = createGround({
        id: 'GND',
        nodeId: '0',
      });

      expect(ground.type).toBe('ground');
      expect(ground.id).toBe('GND');
      expect(ground.nodeId).toBe('0');
      expect(ground.name).toBe('GND'); // Uses id as default name
    });

    it('should create ground with custom name', () => {
      const ground = createGround({
        id: 'GND1',
        name: 'System Ground',
        nodeId: 'ground_node',
      });

      expect(ground.id).toBe('GND1');
      expect(ground.name).toBe('System Ground');
      expect(ground.nodeId).toBe('ground_node');
    });

    it('should not have terminals property', () => {
      const ground = createGround({
        id: 'GND',
        nodeId: '0',
      });

      expect('terminals' in ground).toBe(false);
    });
  });

  describe('createResistor', () => {
    it('should create resistor component', () => {
      const resistor = createResistor({
        id: 'R1',
        resistance: 1000,
        nodes: ['1', '0'],
      });

      expect(resistor.type).toBe('resistor');
      expect(resistor.id).toBe('R1');
      expect(resistor.resistance).toBe(1000);
      expect(resistor.name).toBe('R1'); // Uses id as default name
      expect(resistor.terminals).toHaveLength(2);
      expect(resistor.terminals[0]).toEqual({
        name: 'terminal1',
        nodeId: '1',
      });
      expect(resistor.terminals[1]).toEqual({
        name: 'terminal2',
        nodeId: '0',
      });
    });

    it('should create resistor with custom name', () => {
      const resistor = createResistor({
        id: 'R1',
        name: 'Load Resistor',
        resistance: 2200,
        nodes: ['n1', 'n2'],
      });

      expect(resistor.id).toBe('R1');
      expect(resistor.name).toBe('Load Resistor');
      expect(resistor.resistance).toBe(2200);
    });
  });

  describe('createDCVoltageSource', () => {
    it('should create DC voltage source component', () => {
      const source = createDCVoltageSource({
        id: 'V1',
        voltage: 12,
        nodes: ['1', '0'],
      });

      expect(source.type).toBe('voltage_source');
      expect(source.sourceType).toBe('dc');
      expect(source.id).toBe('V1');
      expect(source.voltage).toBe(12);
      expect(source.name).toBe('V1'); // Uses id as default name
      expect(source.terminals).toHaveLength(2);
      expect(source.terminals[0]).toEqual({ name: 'pos', nodeId: '1' });
      expect(source.terminals[1]).toEqual({ name: 'neg', nodeId: '0' });
    });

    it('should create DC voltage source with custom name', () => {
      const source = createDCVoltageSource({
        id: 'V1',
        name: 'Battery',
        voltage: 9,
        nodes: ['vcc', 'gnd'],
      });

      expect(source.id).toBe('V1');
      expect(source.name).toBe('Battery');
      expect(source.voltage).toBe(9);
    });
  });

  describe('createDCCurrentSource', () => {
    it('should create DC current source component', () => {
      const source = createDCCurrentSource({
        id: 'I1',
        current: 0.001,
        nodes: ['1', '0'],
      });

      expect(source.type).toBe('current_source');
      expect(source.sourceType).toBe('dc');
      expect(source.id).toBe('I1');
      expect(source.current).toBe(0.001);
      expect(source.name).toBe('I1'); // Uses id as default name
      expect(source.terminals).toHaveLength(2);
      expect(source.terminals[0]).toEqual({ name: 'pos', nodeId: '1' });
      expect(source.terminals[1]).toEqual({ name: 'neg', nodeId: '0' });
    });

    it('should create DC current source with custom name', () => {
      const source = createDCCurrentSource({
        id: 'I1',
        name: 'Test Current',
        current: 0.05,
        nodes: ['in', 'out'],
      });

      expect(source.id).toBe('I1');
      expect(source.name).toBe('Test Current');
      expect(source.current).toBe(0.05);
    });
  });

  describe('createCapacitor', () => {
    it('should create capacitor component', () => {
      const capacitor = createCapacitor({
        id: 'C1',
        capacitance: 1e-6,
        nodes: ['1', '0'],
      });

      expect(capacitor.type).toBe('capacitor');
      expect(capacitor.id).toBe('C1');
      expect(capacitor.capacitance).toBe(1e-6);
      expect(capacitor.name).toBe('C1'); // Uses id as default name
      expect(capacitor.initialVoltage).toBeUndefined();
      expect(capacitor.terminals).toHaveLength(2);
    });

    it('should create capacitor with initial voltage', () => {
      const capacitor = createCapacitor({
        id: 'C1',
        capacitance: 100e-6,
        nodes: ['1', '0'],
        initialVoltage: 5,
      });

      expect(capacitor.capacitance).toBe(100e-6);
      expect(capacitor.initialVoltage).toBe(5);
    });

    it('should create capacitor with custom name', () => {
      const capacitor = createCapacitor({
        id: 'C1',
        name: 'Filter Cap',
        capacitance: 10e-6,
        nodes: ['1', '0'],
      });

      expect(capacitor.name).toBe('Filter Cap');
    });
  });

  describe('createInductor', () => {
    it('should create inductor component', () => {
      const inductor = createInductor({
        id: 'L1',
        inductance: 1e-3,
        nodes: ['1', '0'],
      });

      expect(inductor.type).toBe('inductor');
      expect(inductor.id).toBe('L1');
      expect(inductor.inductance).toBe(1e-3);
      expect(inductor.name).toBe('L1'); // Uses id as default name
      expect(inductor.initialCurrent).toBeUndefined();
      expect(inductor.terminals).toHaveLength(2);
    });

    it('should create inductor with initial current', () => {
      const inductor = createInductor({
        id: 'L1',
        inductance: 10e-3,
        nodes: ['1', '0'],
        initialCurrent: 0.5,
      });

      expect(inductor.inductance).toBe(10e-3);
      expect(inductor.initialCurrent).toBe(0.5);
    });

    it('should create inductor with custom name', () => {
      const inductor = createInductor({
        id: 'L1',
        name: 'Choke',
        inductance: 100e-3,
        nodes: ['1', '0'],
      });

      expect(inductor.name).toBe('Choke');
    });
  });

  describe('createACVoltageSource', () => {
    it('should create AC voltage source component', () => {
      const source = createACVoltageSource({
        id: 'V1',
        amplitude: 10,
        frequency: 60,
        nodes: ['1', '0'],
      });

      expect(source.type).toBe('voltage_source');
      expect(source.sourceType).toBe('ac');
      expect(source.id).toBe('V1');
      expect(source.amplitude).toBe(10);
      expect(source.frequency).toBe(60);
      expect(source.phase).toBe(0); // Default phase
      expect(source.name).toBe('V1'); // Uses id as default name
      expect(source.terminals).toHaveLength(2);
    });

    it('should create AC voltage source with optional parameters', () => {
      const source = createACVoltageSource({
        id: 'V1',
        amplitude: 5,
        frequency: 1000,
        nodes: ['1', '0'],
        phase: 90,
        dcOffset: 2.5,
      });

      expect(source.amplitude).toBe(5);
      expect(source.frequency).toBe(1000);
      expect(source.phase).toBe(90);
      expect(source.dcOffset).toBe(2.5);
    });

    it('should create AC voltage source with custom name', () => {
      const source = createACVoltageSource({
        id: 'V1',
        name: 'AC Input',
        amplitude: 10,
        frequency: 50,
        nodes: ['1', '0'],
      });

      expect(source.name).toBe('AC Input');
    });
  });

  describe('createACCurrentSource', () => {
    it('should create AC current source component', () => {
      const source = createACCurrentSource({
        id: 'I1',
        amplitude: 0.001,
        frequency: 60,
        nodes: ['1', '0'],
      });

      expect(source.type).toBe('current_source');
      expect(source.sourceType).toBe('ac');
      expect(source.id).toBe('I1');
      expect(source.amplitude).toBe(0.001);
      expect(source.frequency).toBe(60);
      expect(source.phase).toBe(0); // Default phase
      expect(source.name).toBe('I1'); // Uses id as default name
      expect(source.terminals).toHaveLength(2);
    });

    it('should create AC current source with optional parameters', () => {
      const source = createACCurrentSource({
        id: 'I1',
        amplitude: 0.05,
        frequency: 50,
        nodes: ['1', '0'],
        phase: 45,
      });

      expect(source.amplitude).toBe(0.05);
      expect(source.frequency).toBe(50);
      expect(source.phase).toBe(45);
    });

    it('should create AC current source with custom name', () => {
      const source = createACCurrentSource({
        id: 'I1',
        name: 'AC Test Source',
        amplitude: 0.01,
        frequency: 1000,
        nodes: ['1', '0'],
      });

      expect(source.name).toBe('AC Test Source');
    });
  });
});
