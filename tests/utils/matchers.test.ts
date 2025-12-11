/**
 * Tests for custom Vitest matchers
 */

import { describe, expect, it } from 'vitest';
import type { Resistor } from '@/types/component';
import { createIdentityMatrix, createTestMatrix } from '../factories/matrix';
import { NUMERICAL_TOLERANCE } from '../setup';

describe('Custom Matchers', () => {
  describe('toBeCloseToArray', () => {
    it('should pass when arrays are within tolerance', () => {
      const actual = [1.0, 2.0, 3.0];
      const expected = [1.0001, 1.9999, 3.0001];

      expect(actual).toBeCloseToArray(expected, 1e-3);
    });

    it('should fail when arrays differ beyond tolerance', () => {
      const actual = [1.0, 2.0, 3.0];
      const expected = [1.1, 2.1, 3.1];

      expect(() => {
        expect(actual).toBeCloseToArray(expected, 1e-3);
      }).toThrow();
    });

    it('should fail when arrays have different lengths', () => {
      const actual = [1.0, 2.0];
      const expected = [1.0, 2.0, 3.0];

      expect(() => {
        expect(actual).toBeCloseToArray(expected);
      }).toThrow();
    });

    it('should use default tolerance', () => {
      const actual = [1.0, 2.0, 3.0];
      const expected = [
        1.0 + NUMERICAL_TOLERANCE.MEDIUM_PRECISION / 2,
        2.0,
        3.0,
      ];

      expect(actual).toBeCloseToArray(expected);
    });

    it('should handle negative numbers', () => {
      const actual = [-1.0, -2.0, -3.0];
      const expected = [-1.0001, -1.9999, -3.0001];

      expect(actual).toBeCloseToArray(expected, 1e-3);
    });

    it('should handle zero values', () => {
      const actual = [0.0, 0.0, 0.0];
      const expected = [0.00001, 0.0, -0.00001];

      expect(actual).toBeCloseToArray(expected, 1e-4);
    });
  });

  describe('toBeValidMatrix', () => {
    it('should pass for valid matrix', () => {
      const matrix = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1, 2, 3, 4],
      });

      expect(matrix).toBeValidMatrix();
    });

    it('should pass for square matrix check', () => {
      const matrix = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      });

      expect(matrix).toBeValidMatrix({ square: true });
    });

    it('should fail for non-square matrix with square check', () => {
      const matrix = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });

      expect(() => {
        expect(matrix).toBeValidMatrix({ square: true });
      }).toThrow();
    });

    it('should pass for symmetric matrix', () => {
      const matrix = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [1, 2, 3, 2, 4, 5, 3, 5, 6],
      });

      expect(matrix).toBeValidMatrix({ symmetric: true });
    });

    it('should fail for non-symmetric matrix', () => {
      const matrix = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1, 2, 3, 4],
      });

      expect(() => {
        expect(matrix).toBeValidMatrix({ symmetric: true });
      }).toThrow();
    });

    it('should detect invalid data length', () => {
      const matrix = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1, 2, 3], // Wrong length
      });

      expect(() => {
        expect(matrix).toBeValidMatrix();
      }).toThrow();
    });

    it('should pass for identity matrix', () => {
      const matrix = createIdentityMatrix(3);

      expect(matrix).toBeValidMatrix({
        square: true,
        symmetric: true,
      });
    });
  });

  describe('toSatisfyOhmsLaw', () => {
    it('should pass when Ohms Law is satisfied', () => {
      const resistor: Resistor = {
        id: 'R1',
        type: 'resistor',
        name: 'R1',
        resistance: 1000,
        terminals: [
          { name: 'terminal1', nodeId: 'n1' },
          { name: 'terminal2', nodeId: 'n2' },
        ],
      };

      // V = I * R: 10V = 0.01A * 1000Ω
      expect(resistor).toSatisfyOhmsLaw(10, 0.01);
    });

    it('should fail when Ohms Law is violated', () => {
      const resistor: Resistor = {
        id: 'R1',
        type: 'resistor',
        name: 'R1',
        resistance: 1000,
        terminals: [
          { name: 'terminal1', nodeId: 'n1' },
          { name: 'terminal2', nodeId: 'n2' },
        ],
      };

      // Wrong: 10V ≠ 0.02A * 1000Ω = 20V
      expect(() => {
        expect(resistor).toSatisfyOhmsLaw(10, 0.02);
      }).toThrow();
    });

    it('should work with custom tolerance', () => {
      const resistor: Resistor = {
        id: 'R1',
        type: 'resistor',
        name: 'R1',
        resistance: 1000,
        terminals: [
          { name: 'terminal1', nodeId: 'n1' },
          { name: 'terminal2', nodeId: 'n2' },
        ],
      };

      // Slightly off but within tolerance
      expect(resistor).toSatisfyOhmsLaw(10, 0.0101, 0.01);
    });

    it('should handle small currents', () => {
      const resistor: Resistor = {
        id: 'R1',
        type: 'resistor',
        name: 'R1',
        resistance: 1000000, // 1MΩ
        terminals: [
          { name: 'terminal1', nodeId: 'n1' },
          { name: 'terminal2', nodeId: 'n2' },
        ],
      };

      // V = I * R: 1V = 0.000001A * 1000000Ω
      expect(resistor).toSatisfyOhmsLaw(1, 0.000001);
    });

    it('should handle large resistances', () => {
      const resistor: Resistor = {
        id: 'R1',
        type: 'resistor',
        name: 'R1',
        resistance: 10000000, // 10MΩ
        terminals: [
          { name: 'terminal1', nodeId: 'n1' },
          { name: 'terminal2', nodeId: 'n2' },
        ],
      };

      // V = I * R: 100V = 0.00001A * 10000000Ω
      expect(resistor).toSatisfyOhmsLaw(100, 0.00001);
    });
  });

  describe('toConvergeWithin', () => {
    it('should pass when convergence is successful', () => {
      const result = {
        converged: true,
      };

      expect(result).toConvergeWithin({
        iterations: 10,
        maxIterations: 100,
        tolerance: 1e-6,
        error: 1e-7,
      });
    });

    it('should fail when not converged', () => {
      const result = {
        converged: false,
      };

      expect(() => {
        expect(result).toConvergeWithin({
          iterations: 10,
          maxIterations: 100,
          tolerance: 1e-6,
          error: 1e-7,
        });
      }).toThrow();
    });

    it('should fail when iterations exceed maximum', () => {
      const result = {
        converged: true,
      };

      expect(() => {
        expect(result).toConvergeWithin({
          iterations: 150,
          maxIterations: 100,
          tolerance: 1e-6,
          error: 1e-7,
        });
      }).toThrow();
    });

    it('should fail when error exceeds tolerance', () => {
      const result = {
        converged: true,
      };

      expect(() => {
        expect(result).toConvergeWithin({
          iterations: 10,
          maxIterations: 100,
          tolerance: 1e-6,
          error: 1e-5, // Error > tolerance
        });
      }).toThrow();
    });

    it('should pass with exact tolerance', () => {
      const result = {
        converged: true,
      };

      expect(result).toConvergeWithin({
        iterations: 100,
        maxIterations: 100,
        tolerance: 1e-6,
        error: 1e-6,
      });
    });
  });
});
