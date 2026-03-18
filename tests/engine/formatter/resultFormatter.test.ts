import { describe, expect, it } from 'vitest';
import type { DCAnalysisResult, DCOperatingPoint } from '@/types/simulation';
import {
  formatDCOperatingPoint,
  formatDCResult,
  serializeDCResultToJSON,
  serializeDCResultToText,
} from '@/engine/formatter/resultFormatter';

// ============================================================================
// Test Helpers
// ============================================================================

const CONVERGENCE_INFO = {
  converged: true,
  iterations: 1,
  maxIterations: 1,
  tolerance: 0,
  finalError: 0,
};

/** Voltage divider operating point: 12V source, 1kΩ + 2kΩ */
const VOLTAGE_DIVIDER_OP: DCOperatingPoint = {
  nodeVoltages: { '0': 0, node1: 12, node2: 8 },
  branchCurrents: { V1: 4e-3, R1: 4e-3, R2: 4e-3 },
  componentPowers: { V1: -48e-3, R1: 16e-3, R2: 32e-3 },
};

// ============================================================================
// Tests
// ============================================================================

describe('formatDCOperatingPoint', () => {
  it('should format node voltages in V', () => {
    const result = formatDCOperatingPoint(VOLTAGE_DIVIDER_OP);

    expect(result.nodeVoltages['0']).toBe('0.000 V');
    expect(result.nodeVoltages['node1']).toBe('12.000 V');
    expect(result.nodeVoltages['node2']).toBe('8.000 V');
  });

  it('should format branch currents in A', () => {
    const result = formatDCOperatingPoint(VOLTAGE_DIVIDER_OP);

    expect(result.branchCurrents['V1']).toBe('4.000 mA');
    expect(result.branchCurrents['R1']).toBe('4.000 mA');
    expect(result.branchCurrents['R2']).toBe('4.000 mA');
  });

  it('should format component powers in W', () => {
    const result = formatDCOperatingPoint(VOLTAGE_DIVIDER_OP);

    expect(result.componentPowers['V1']).toBe('-48.000 mW');
    expect(result.componentPowers['R1']).toBe('16.000 mW');
    expect(result.componentPowers['R2']).toBe('32.000 mW');
  });

  it('should handle empty operating point', () => {
    const op: DCOperatingPoint = {
      nodeVoltages: {},
      branchCurrents: {},
      componentPowers: {},
    };

    const result = formatDCOperatingPoint(op);

    expect(result.nodeVoltages).toEqual({});
    expect(result.branchCurrents).toEqual({});
    expect(result.componentPowers).toEqual({});
  });
});

describe('formatDCResult', () => {
  it('should format DC result without sweep', () => {
    const dcResult: DCAnalysisResult = {
      type: 'dc',
      operatingPoint: VOLTAGE_DIVIDER_OP,
      convergenceInfo: CONVERGENCE_INFO,
    };

    const result = formatDCResult(dcResult);

    expect(result.type).toBe('dc');
    expect(result.operatingPoint.nodeVoltages['node1']).toBe('12.000 V');
    expect(result.sweep).toBeUndefined();
    expect(result.convergenceInfo).toEqual(CONVERGENCE_INFO);
  });

  it('should format sweep values in V for voltage_source sweep', () => {
    const dcResult: DCAnalysisResult = {
      type: 'dc',
      operatingPoint: VOLTAGE_DIVIDER_OP,
      sweep: {
        sourceType: 'voltage_source',
        sweepValues: [0, 6, 12],
        operatingPoints: [
          {
            nodeVoltages: { '0': 0, node2: 0 },
            branchCurrents: {},
            componentPowers: {},
          },
          {
            nodeVoltages: { '0': 0, node2: 4 },
            branchCurrents: {},
            componentPowers: {},
          },
          {
            nodeVoltages: { '0': 0, node2: 8 },
            branchCurrents: {},
            componentPowers: {},
          },
        ],
      },
      convergenceInfo: CONVERGENCE_INFO,
    };

    const result = formatDCResult(dcResult);

    expect(result.sweep!.sweepValues).toEqual([
      '0.000 V',
      '6.000 V',
      '12.000 V',
    ]);
    expect(result.sweep!.operatingPoints[1].nodeVoltages['node2']).toBe(
      '4.000 V'
    );
  });

  it('should format sweep values in A for current_source sweep', () => {
    const dcResult: DCAnalysisResult = {
      type: 'dc',
      operatingPoint: VOLTAGE_DIVIDER_OP,
      sweep: {
        sourceType: 'current_source',
        sweepValues: [0, 1e-3, 2e-3],
        operatingPoints: [
          { nodeVoltages: {}, branchCurrents: {}, componentPowers: {} },
          { nodeVoltages: {}, branchCurrents: {}, componentPowers: {} },
          { nodeVoltages: {}, branchCurrents: {}, componentPowers: {} },
        ],
      },
      convergenceInfo: CONVERGENCE_INFO,
    };

    const result = formatDCResult(dcResult);

    expect(result.sweep!.sweepValues).toEqual([
      '0.000 A',
      '1.000 mA',
      '2.000 mA',
    ]);
  });

  it('should throw when sweep lengths are mismatched', () => {
    const mismatchedSweep: DCAnalysisResult = {
      type: 'dc',
      operatingPoint: VOLTAGE_DIVIDER_OP,
      sweep: {
        sourceType: 'voltage_source',
        sweepValues: [0, 6, 12],
        operatingPoints: [
          { nodeVoltages: {}, branchCurrents: {}, componentPowers: {} },
        ],
      },
      convergenceInfo: CONVERGENCE_INFO,
    };

    expect(() => formatDCResult(mismatchedSweep)).toThrowWebSpiceError(
      'INVALID_PARAMETER',
      'sweep'
    );
  });
});

describe('serializeDCResultToJSON', () => {
  const dcResult: DCAnalysisResult = {
    type: 'dc',
    operatingPoint: VOLTAGE_DIVIDER_OP,
    convergenceInfo: CONVERGENCE_INFO,
  };

  it('should produce valid JSON', () => {
    const json = serializeDCResultToJSON(dcResult);

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should preserve original numeric values', () => {
    const json = serializeDCResultToJSON(dcResult);
    const parsed = JSON.parse(json);

    expect(parsed.operatingPoint.nodeVoltages['node1']).toBe(12);
    expect(parsed.operatingPoint.branchCurrents['V1']).toBe(4e-3);
  });
});

describe('serializeDCResultToText', () => {
  const dcResult: DCAnalysisResult = {
    type: 'dc',
    operatingPoint: VOLTAGE_DIVIDER_OP,
    convergenceInfo: CONVERGENCE_INFO,
  };

  it('should include the header', () => {
    expect(serializeDCResultToText(dcResult)).toContain(
      '=== DC Analysis Result ==='
    );
  });

  it('should include section labels', () => {
    const text = serializeDCResultToText(dcResult);

    expect(text).toContain('Node Voltages:');
    expect(text).toContain('Branch Currents:');
    expect(text).toContain('Component Powers:');
  });

  it('should include formatted values', () => {
    const text = serializeDCResultToText(dcResult);

    expect(text).toContain('12.000 V');
    expect(text).toContain('4.000 mA');
    expect(text).toContain('-48.000 mW');
  });

  it('should include convergence info', () => {
    expect(serializeDCResultToText(dcResult)).toContain(
      'converged in 1 iteration'
    );
  });

  it('should throw when sweep lengths are mismatched', () => {
    const mismatchedSweep = {
      ...dcResult,
      sweep: {
        sourceType: 'voltage_source' as const,
        sweepValues: [0, 6, 12],
        operatingPoints: [
          { nodeVoltages: {}, branchCurrents: {}, componentPowers: {} },
        ],
      },
    };

    expect(() => serializeDCResultToText(mismatchedSweep)).toThrowWebSpiceError(
      'INVALID_PARAMETER',
      'sweep'
    );
  });

  it('should include sweep values when sweep is present', () => {
    const withSweep: DCAnalysisResult = {
      ...dcResult,
      sweep: {
        sourceType: 'voltage_source',
        sweepValues: [0, 6, 12],
        operatingPoints: [
          { nodeVoltages: {}, branchCurrents: {}, componentPowers: {} },
          { nodeVoltages: {}, branchCurrents: {}, componentPowers: {} },
          { nodeVoltages: {}, branchCurrents: {}, componentPowers: {} },
        ],
      },
    };

    const text = serializeDCResultToText(withSweep);

    expect(text).toContain('6.000 V');
    expect(text).toContain('12.000 V');
  });
});
