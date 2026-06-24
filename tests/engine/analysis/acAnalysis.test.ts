import { describe, expect, it } from 'vitest';
import { analyzeAC } from '@/engine/analysis/acAnalysis';
import type { Complex } from '@/types/component';
import type { ACAnalysisConfig } from '@/types/simulation';
import { createTestCircuit } from '../../factories/circuits';
import {
  createACVoltageSource,
  createCapacitor,
  createGround,
  createInductor,
  createResistor,
} from '../../factories/components';

const SINGLE_POINT_AC: ACAnalysisConfig = {
  type: 'ac',
  startFrequency: 1000,
  endFrequency: 1001,
  pointsPerDecade: 1,
  sweepType: 'linear',
};

function magnitude(value: Complex): number {
  return Math.hypot(value.real, value.imag);
}

function phaseDegrees(value: Complex): number {
  return (Math.atan2(value.imag, value.real) * 180) / Math.PI;
}

describe('analyzeAC', () => {
  it('solves an RC low-pass filter at the cutoff frequency', () => {
    const resistance = 1000;
    const capacitance = 1e-6;
    const cutoff = 1 / (2 * Math.PI * resistance * capacitance);
    const circuit = createTestCircuit({
      components: [
        createACVoltageSource({
          id: 'V1',
          amplitude: 1,
          frequency: cutoff,
          nodes: ['in', '0'],
        }),
        createResistor({
          id: 'R1',
          resistance,
          nodes: ['in', 'out'],
        }),
        createCapacitor({
          id: 'C1',
          capacitance,
          nodes: ['out', '0'],
        }),
        createGround({ id: 'GND', nodeId: '0' }),
      ],
      groundNodeId: '0',
    });

    const result = analyzeAC(circuit, {
      type: 'ac',
      startFrequency: cutoff,
      endFrequency: cutoff + 1e-9,
      pointsPerDecade: 1,
      sweepType: 'linear',
    });
    const vout = result.frequencyPoints[0].nodeVoltages.out;

    expect(magnitude(vout)).toBeCloseTo(1 / Math.sqrt(2), 2);
    expect(phaseDegrees(vout)).toBeCloseTo(-45, 0);
  });

  it('solves a resistive voltage divider across all frequencies', () => {
    const circuit = createTestCircuit({
      components: [
        createACVoltageSource({
          id: 'V1',
          amplitude: 1,
          frequency: 1000,
          nodes: ['in', '0'],
        }),
        createResistor({
          id: 'R1',
          resistance: 1000,
          nodes: ['in', 'out'],
        }),
        createResistor({
          id: 'R2',
          resistance: 1000,
          nodes: ['out', '0'],
        }),
        createGround({ id: 'GND', nodeId: '0' }),
      ],
      groundNodeId: '0',
    });

    const result = analyzeAC(circuit, {
      type: 'ac',
      startFrequency: 10,
      endFrequency: 1000,
      pointsPerDecade: 2,
      sweepType: 'decade',
    });

    expect(result.type).toBe('ac');
    expect(result.frequencyPoints.length).toBeGreaterThan(1);
    for (const point of result.frequencyPoints) {
      expect(point.nodeVoltages.out.real).toBeCloseTo(0.5, 10);
      expect(point.nodeVoltages.out.imag).toBeCloseTo(0, 10);
    }
  });

  it('solves an RL circuit at 1 kHz', () => {
    const circuit = createTestCircuit({
      components: [
        createACVoltageSource({
          id: 'V1',
          amplitude: 1,
          frequency: 1000,
          nodes: ['in', '0'],
        }),
        createResistor({
          id: 'R1',
          resistance: 100,
          nodes: ['in', 'out'],
        }),
        createInductor({
          id: 'L1',
          inductance: 0.01,
          nodes: ['out', '0'],
        }),
        createGround({ id: 'GND', nodeId: '0' }),
      ],
      groundNodeId: '0',
    });

    const result = analyzeAC(circuit, SINGLE_POINT_AC);
    const current = result.frequencyPoints[0].branchCurrents.R1;
    const expectedMagnitude = 1 / Math.hypot(100, 2 * Math.PI * 1000 * 0.01);

    expect(magnitude(current)).toBeCloseTo(expectedMagnitude, 10);
  });

  it('throws when startFrequency is zero', () => {
    const circuit = createTestCircuit({
      components: [
        createACVoltageSource({
          id: 'V1',
          amplitude: 1,
          frequency: 1000,
          nodes: ['1', '0'],
        }),
        createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
        createGround({ id: 'GND', nodeId: '0' }),
      ],
      groundNodeId: '0',
    });

    expect(() =>
      analyzeAC(circuit, {
        ...SINGLE_POINT_AC,
        startFrequency: 0,
      })
    ).toThrowWebSpiceError('INVALID_PARAMETER');
  });
});
