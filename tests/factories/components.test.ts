/**
 * Tests for component factory functions
 */

import { describe, expect, it } from 'vitest';
import {
  createTestACCurrentSource,
  createTestACVoltageSource,
  createTestCapacitor,
  createTestCurrentSource,
  createTestGround,
  createTestInductor,
  createTestResistor,
  createTestVoltageSource,
} from './components';

describe('Component Factories', () => {
  describe('createTestResistor', () => {
    it('should create resistor with default values', () => {
      const resistor = createTestResistor();

      expect(resistor.type).toBe('resistor');
      expect(resistor.id).toBe('R1');
      expect(resistor.resistance).toBe(1000);
      expect(resistor.terminals).toHaveLength(2);
      expect(resistor.terminals[0].nodeId).toBe('1');
      expect(resistor.terminals[1].nodeId).toBe('0');
    });

    it('should create resistor with custom values', () => {
      const resistor = createTestResistor({
        id: 'R_custom',
        name: 'Custom Resistor',
        resistance: 4700,
        nodes: ['nodeA', 'nodeB'],
      });

      expect(resistor.id).toBe('R_custom');
      expect(resistor.name).toBe('Custom Resistor');
      expect(resistor.resistance).toBe(4700);
      expect(resistor.terminals[0].nodeId).toBe('nodeA');
      expect(resistor.terminals[1].nodeId).toBe('nodeB');
    });

    it('should have correct terminal names', () => {
      const resistor = createTestResistor();

      expect(resistor.terminals[0].name).toBe('terminal1');
      expect(resistor.terminals[1].name).toBe('terminal2');
    });
  });

  describe('createTestCapacitor', () => {
    it('should create capacitor with default values', () => {
      const capacitor = createTestCapacitor();

      expect(capacitor.type).toBe('capacitor');
      expect(capacitor.id).toBe('C1');
      expect(capacitor.capacitance).toBe(1e-6);
      expect(capacitor.initialVoltage).toBeUndefined();
    });

    it('should create capacitor with initial voltage', () => {
      const capacitor = createTestCapacitor({
        capacitance: 100e-6,
        initialVoltage: 5,
      });

      expect(capacitor.capacitance).toBe(100e-6);
      expect(capacitor.initialVoltage).toBe(5);
    });
  });

  describe('createTestInductor', () => {
    it('should create inductor with default values', () => {
      const inductor = createTestInductor();

      expect(inductor.type).toBe('inductor');
      expect(inductor.id).toBe('L1');
      expect(inductor.inductance).toBe(1e-3);
      expect(inductor.initialCurrent).toBeUndefined();
    });

    it('should create inductor with initial current', () => {
      const inductor = createTestInductor({
        inductance: 10e-3,
        initialCurrent: 0.5,
      });

      expect(inductor.inductance).toBe(10e-3);
      expect(inductor.initialCurrent).toBe(0.5);
    });
  });

  describe('createTestVoltageSource', () => {
    it('should create DC voltage source with default values', () => {
      const source = createTestVoltageSource();

      expect(source.type).toBe('voltage_source');
      expect(source.sourceType).toBe('dc');
      expect(source.id).toBe('V1');
      expect(source.voltage).toBe(12);
    });

    it('should create DC voltage source with custom values', () => {
      const source = createTestVoltageSource({
        id: 'V_battery',
        voltage: 9,
        nodes: ['vcc', 'gnd'],
      });

      expect(source.id).toBe('V_battery');
      expect(source.voltage).toBe(9);
      expect(source.terminals[0].nodeId).toBe('vcc');
      expect(source.terminals[1].nodeId).toBe('gnd');
    });
  });

  describe('createTestACVoltageSource', () => {
    it('should create AC voltage source with default values', () => {
      const source = createTestACVoltageSource();

      expect(source.type).toBe('voltage_source');
      expect(source.sourceType).toBe('ac');
      expect(source.amplitude).toBe(10);
      expect(source.frequency).toBe(60);
      expect(source.phase).toBe(0);
    });

    it('should create AC voltage source with custom values', () => {
      const source = createTestACVoltageSource({
        amplitude: 5,
        frequency: 1000,
        phase: 90,
        dcOffset: 2.5,
      });

      expect(source.amplitude).toBe(5);
      expect(source.frequency).toBe(1000);
      expect(source.phase).toBe(90);
      expect(source.dcOffset).toBe(2.5);
    });
  });

  describe('createTestCurrentSource', () => {
    it('should create DC current source with default values', () => {
      const source = createTestCurrentSource();

      expect(source.type).toBe('current_source');
      expect(source.sourceType).toBe('dc');
      expect(source.current).toBe(0.001);
    });

    it('should create DC current source with custom values', () => {
      const source = createTestCurrentSource({
        id: 'I_load',
        current: 0.1,
      });

      expect(source.id).toBe('I_load');
      expect(source.current).toBe(0.1);
    });
  });

  describe('createTestACCurrentSource', () => {
    it('should create AC current source with default values', () => {
      const source = createTestACCurrentSource();

      expect(source.type).toBe('current_source');
      expect(source.sourceType).toBe('ac');
      expect(source.amplitude).toBe(0.001);
      expect(source.frequency).toBe(60);
    });

    it('should create AC current source with custom values', () => {
      const source = createTestACCurrentSource({
        amplitude: 0.05,
        frequency: 50,
        phase: 45,
      });

      expect(source.amplitude).toBe(0.05);
      expect(source.frequency).toBe(50);
      expect(source.phase).toBe(45);
    });
  });

  describe('createTestGround', () => {
    it('should create ground with default values', () => {
      const ground = createTestGround();

      expect(ground.type).toBe('ground');
      expect(ground.id).toBe('GND');
      expect(ground.nodeId).toBe('0');
    });

    it('should create ground with custom values', () => {
      const ground = createTestGround({
        id: 'GND1',
        name: 'System Ground',
        nodeId: 'ground_node',
      });

      expect(ground.id).toBe('GND1');
      expect(ground.name).toBe('System Ground');
      expect(ground.nodeId).toBe('ground_node');
    });

    it('should not have terminals property', () => {
      const ground = createTestGround();

      expect('terminals' in ground).toBe(false);
    });
  });
});
