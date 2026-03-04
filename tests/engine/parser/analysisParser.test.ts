import { describe, expect, it } from 'vitest';
import type { AnalysisJSON } from '@/types/simulation';
import { parseAnalysis } from '@/engine/parser/analysisParser';

// ============================================================================
// Test Helpers
// ============================================================================

/** 기본 DC AnalysisJSON 생성. overrides로 parameters를 변경 가능 */
function makeDCAnalysisJSON(overrides?: Partial<AnalysisJSON>): AnalysisJSON {
  return {
    type: 'dc',
    parameters: {},
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Analysis Parser', () => {
  describe('valid DC analysis parsing', () => {
    it('should parse a basic DC operating point analysis (no sweep)', () => {
      const json = makeDCAnalysisJSON();

      const config = parseAnalysis(json);

      expect(config.type).toBe('dc');
      expect(config.sweep).toBeUndefined();
    });

    it('should parse DC analysis with sweep parameters', () => {
      const json = makeDCAnalysisJSON({
        parameters: {
          sourceId: 'V1',
          startValue: 0,
          endValue: 12,
          stepValue: 1,
        },
      });

      const config = parseAnalysis(json);

      expect(config.type).toBe('dc');
      expect(config.sweep).toBeDefined();
      expect(config.sweep!.sourceId).toBe('V1');
      expect(config.sweep!.startValue).toBe(0);
      expect(config.sweep!.endValue).toBe(12);
      expect(config.sweep!.stepValue).toBe(1);
    });

    it('should convert string-typed numeric parameters to numbers', () => {
      const json = makeDCAnalysisJSON({
        parameters: {
          sourceId: 'V1',
          startValue: '0',
          endValue: '12',
          stepValue: '1',
        },
      });

      const config = parseAnalysis(json);

      expect(config.sweep!.startValue).toBe(0);
      expect(config.sweep!.endValue).toBe(12);
      expect(config.sweep!.stepValue).toBe(1);
    });

    it('should parse sweep values with SI prefixes', () => {
      const json = makeDCAnalysisJSON({
        parameters: {
          sourceId: 'V1',
          startValue: '0',
          endValue: '1k',
          stepValue: '100m',
        },
      });

      const config = parseAnalysis(json);

      expect(config.sweep!.endValue).toBe(1000);
      expect(config.sweep!.stepValue).toBeCloseTo(0.1);
    });
  });

  describe('error: invalid input', () => {
    it('should throw INVALID_PARAMETER for null input', () => {
      expect(() =>
        parseAnalysis(null as unknown as AnalysisJSON)
      ).toThrowWebSpiceError('INVALID_PARAMETER', 'Analysis JSON is required');
    });

    it('should throw UNSUPPORTED_ANALYSIS for non-DC analysis type', () => {
      const json = { type: 'ac', parameters: {} } as AnalysisJSON;

      expect(() => parseAnalysis(json)).toThrowWebSpiceError(
        'UNSUPPORTED_ANALYSIS',
        'not yet supported'
      );
    });
  });

  describe('error: partial sweep parameters', () => {
    it('should throw when only some sweep keys are provided', () => {
      const json = makeDCAnalysisJSON({
        parameters: { sourceId: 'V1', startValue: 0 },
      });

      expect(() => parseAnalysis(json)).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        'Missing: endValue, stepValue'
      );
    });

    it('should throw listing all missing keys', () => {
      const json = makeDCAnalysisJSON({
        parameters: { sourceId: 'V1' },
      });

      expect(() => parseAnalysis(json)).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        'Missing: startValue, endValue, stepValue'
      );
    });
  });

  describe('error: invalid sweep values', () => {
    it('should throw for non-parseable startValue', () => {
      const json = makeDCAnalysisJSON({
        parameters: {
          sourceId: 'V1',
          startValue: 'abc',
          endValue: 12,
          stepValue: 1,
        },
      });

      expect(() => parseAnalysis(json)).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        "Cannot parse numeric value: 'abc'"
      );
    });

    it('should throw for non-finite endValue', () => {
      const json = makeDCAnalysisJSON({
        parameters: {
          sourceId: 'V1',
          startValue: 0,
          endValue: Infinity,
          stepValue: 1,
        },
      });

      expect(() => parseAnalysis(json)).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        'finite number'
      );
    });

    it('should throw for zero stepValue', () => {
      const json = makeDCAnalysisJSON({
        parameters: {
          sourceId: 'V1',
          startValue: 0,
          endValue: 12,
          stepValue: 0,
        },
      });

      expect(() => parseAnalysis(json)).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        'stepValue must be a positive finite number'
      );
    });

    it('should throw for negative stepValue', () => {
      const json = makeDCAnalysisJSON({
        parameters: {
          sourceId: 'V1',
          startValue: 0,
          endValue: 12,
          stepValue: -1,
        },
      });

      expect(() => parseAnalysis(json)).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        'stepValue must be a positive finite number'
      );
    });
  });
});
