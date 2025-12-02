/**
 * Tests for helper utility functions
 */

import { describe, expect, it } from 'vitest';
import {
  areArraysClose,
  areMatricesClose,
  areVectorsClose,
  benchmark,
  findFloatingNodes,
  getComponentsByType,
  getMatrixElement,
  hasGroundNode,
  isCloseTo,
  isSquareMatrix,
  isSymmetricMatrix,
  matrixTo2DArray,
  maxAbsoluteError,
  measureExecutionTime,
  relativeError,
  validateCircuit,
  vectorNorm,
} from './helpers';
import {
  createIdentityMatrix,
  createSymmetricMatrix,
  createTestMatrix,
  createTestVector,
} from '../factories/matrix';
import { createVoltageDivider } from '../factories/circuits';

describe('Helper Utilities', () => {
  describe('Numerical Comparison', () => {
    describe('isCloseTo', () => {
      it('should return true for equal numbers', () => {
        expect(isCloseTo(1.0, 1.0)).toBe(true);
      });

      it('should return true for numbers within tolerance', () => {
        expect(isCloseTo(1.0, 1.0001, 1e-3)).toBe(true);
      });

      it('should return false for numbers beyond tolerance', () => {
        expect(isCloseTo(1.0, 1.1, 1e-3)).toBe(false);
      });

      it('should handle negative numbers', () => {
        expect(isCloseTo(-1.0, -1.0001, 1e-3)).toBe(true);
      });

      it('should return false for NaN', () => {
        expect(isCloseTo(NaN, 1.0)).toBe(false);
        expect(isCloseTo(1.0, NaN)).toBe(false);
      });

      it('should return false for Infinity', () => {
        expect(isCloseTo(Infinity, 1.0)).toBe(false);
      });
    });

    describe('areArraysClose', () => {
      it('should return true for equal arrays', () => {
        expect(areArraysClose([1, 2, 3], [1, 2, 3])).toBe(true);
      });

      it('should return true for arrays within tolerance', () => {
        expect(areArraysClose([1, 2, 3], [1.001, 2.001, 3.001], 1e-2)).toBe(
          true
        );
      });

      it('should return false for arrays with different lengths', () => {
        expect(areArraysClose([1, 2], [1, 2, 3])).toBe(false);
      });

      it('should return false for arrays beyond tolerance', () => {
        expect(areArraysClose([1, 2, 3], [1.1, 2.1, 3.1], 1e-3)).toBe(false);
      });
    });

    describe('relativeError', () => {
      it('should compute relative error correctly', () => {
        const error = relativeError(1.1, 1.0);
        expect(error).toBeCloseTo(0.1);
      });

      it('should handle small expected values', () => {
        const error = relativeError(0.01, 0.0);
        expect(error).toBe(0.01); // Normalized by max(|expected|, 1) = 1
      });

      it('should handle large differences', () => {
        const error = relativeError(100, 10);
        expect(error).toBeCloseTo(9);
      });
    });

    describe('maxAbsoluteError', () => {
      it('should find maximum error', () => {
        const error = maxAbsoluteError([1, 2, 3], [1.1, 2.05, 3.02]);
        expect(error).toBeCloseTo(0.1);
      });

      it('should return Infinity for different lengths', () => {
        const error = maxAbsoluteError([1, 2], [1, 2, 3]);
        expect(error).toBe(Infinity);
      });

      it('should handle zero error', () => {
        const error = maxAbsoluteError([1, 2, 3], [1, 2, 3]);
        expect(error).toBe(0);
      });
    });
  });

  describe('Matrix Operations', () => {
    describe('isSquareMatrix', () => {
      it('should return true for square matrix', () => {
        const matrix = createTestMatrix({ rows: 3, cols: 3 });
        expect(isSquareMatrix(matrix)).toBe(true);
      });

      it('should return false for non-square matrix', () => {
        const matrix = createTestMatrix({ rows: 2, cols: 3 });
        expect(isSquareMatrix(matrix)).toBe(false);
      });
    });

    describe('isSymmetricMatrix', () => {
      it('should return true for symmetric matrix', () => {
        const matrix = createSymmetricMatrix([
          [1, 2, 3],
          [2, 4, 5],
          [3, 5, 6],
        ]);
        expect(isSymmetricMatrix(matrix)).toBe(true);
      });

      it('should return true for identity matrix', () => {
        const matrix = createIdentityMatrix(3);
        expect(isSymmetricMatrix(matrix)).toBe(true);
      });

      it('should return false for non-symmetric matrix', () => {
        const matrix = createTestMatrix({
          rows: 2,
          cols: 2,
          data: [1, 2, 3, 4],
        });
        expect(isSymmetricMatrix(matrix)).toBe(false);
      });

      it('should return false for non-square matrix', () => {
        const matrix = createTestMatrix({ rows: 2, cols: 3 });
        expect(isSymmetricMatrix(matrix)).toBe(false);
      });
    });

    describe('getMatrixElement', () => {
      it('should get correct element', () => {
        const matrix = createTestMatrix({
          rows: 2,
          cols: 2,
          data: [1, 2, 3, 4],
        });

        expect(getMatrixElement(matrix, 0, 0)).toBe(1);
        expect(getMatrixElement(matrix, 0, 1)).toBe(2);
        expect(getMatrixElement(matrix, 1, 0)).toBe(3);
        expect(getMatrixElement(matrix, 1, 1)).toBe(4);
      });

      it('should throw for out of bounds access', () => {
        const matrix = createTestMatrix({ rows: 2, cols: 2 });

        expect(() => getMatrixElement(matrix, 2, 0)).toThrow();
        expect(() => getMatrixElement(matrix, 0, 2)).toThrow();
        expect(() => getMatrixElement(matrix, -1, 0)).toThrow();
      });
    });

    describe('matrixTo2DArray', () => {
      it('should convert matrix to 2D array', () => {
        const matrix = createTestMatrix({
          rows: 2,
          cols: 3,
          data: [1, 2, 3, 4, 5, 6],
        });

        const arr = matrixTo2DArray(matrix);
        expect(arr).toEqual([
          [1, 2, 3],
          [4, 5, 6],
        ]);
      });

      it('should convert identity matrix correctly', () => {
        const matrix = createIdentityMatrix(2);
        const arr = matrixTo2DArray(matrix);

        expect(arr).toEqual([
          [1, 0],
          [0, 1],
        ]);
      });
    });

    describe('areMatricesClose', () => {
      it('should return true for equal matrices', () => {
        const m1 = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
        const m2 = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

        expect(areMatricesClose(m1, m2)).toBe(true);
      });

      it('should return true for matrices within tolerance', () => {
        const m1 = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
        const m2 = createTestMatrix({
          rows: 2,
          cols: 2,
          data: [1.001, 2.001, 3.001, 4.001],
        });

        expect(areMatricesClose(m1, m2, 1e-2)).toBe(true);
      });

      it('should return false for different dimensions', () => {
        const m1 = createTestMatrix({ rows: 2, cols: 2 });
        const m2 = createTestMatrix({ rows: 3, cols: 3 });

        expect(areMatricesClose(m1, m2)).toBe(false);
      });
    });
  });

  describe('Vector Operations', () => {
    describe('vectorNorm', () => {
      it('should compute L2 norm correctly', () => {
        const vector = createTestVector({ length: 3, data: [3, 4, 0] });
        expect(vectorNorm(vector)).toBeCloseTo(5);
      });

      it('should return 0 for zero vector', () => {
        const vector = createTestVector({ length: 3, data: [0, 0, 0] });
        expect(vectorNorm(vector)).toBe(0);
      });

      it('should handle unit vector', () => {
        const vector = createTestVector({ length: 3, data: [1, 0, 0] });
        expect(vectorNorm(vector)).toBeCloseTo(1);
      });
    });

    describe('areVectorsClose', () => {
      it('should return true for equal vectors', () => {
        const v1 = createTestVector({ length: 3, data: [1, 2, 3] });
        const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

        expect(areVectorsClose(v1, v2)).toBe(true);
      });

      it('should return false for different lengths', () => {
        const v1 = createTestVector({ length: 2, data: [1, 2] });
        const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

        expect(areVectorsClose(v1, v2)).toBe(false);
      });
    });
  });

  describe('Circuit Validation', () => {
    describe('hasGroundNode', () => {
      it('should return true for circuit with ground', () => {
        const circuit = createVoltageDivider();
        expect(hasGroundNode(circuit)).toBe(true);
      });
    });

    describe('findFloatingNodes', () => {
      it('should return empty array for valid circuit', () => {
        const circuit = createVoltageDivider();
        const floating = findFloatingNodes(circuit);
        expect(floating).toEqual([]);
      });
    });

    describe('validateCircuit', () => {
      it('should validate correct circuit', () => {
        const circuit = createVoltageDivider();
        const result = validateCircuit(circuit);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('getComponentsByType', () => {
      it('should filter components by type', () => {
        const circuit = createVoltageDivider();

        const resistors = getComponentsByType(circuit, 'resistor');
        expect(resistors).toHaveLength(2);
        expect(resistors.every(r => r.type === 'resistor')).toBe(true);

        const voltageSources = getComponentsByType(circuit, 'voltage_source');
        expect(voltageSources).toHaveLength(1);
        expect(voltageSources[0].type).toBe('voltage_source');
      });

      it('should return empty array for non-existent type', () => {
        const circuit = createVoltageDivider();
        const capacitors = getComponentsByType(circuit, 'capacitor');
        expect(capacitors).toHaveLength(0);
      });
    });
  });

  describe('Performance Measurement', () => {
    describe('measureExecutionTime', () => {
      it('should measure execution time', () => {
        const result = measureExecutionTime(() => {
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += i;
          }
          return sum;
        });

        expect(result.result).toBe(499500);
        expect(result.time).toBeGreaterThanOrEqual(0);
      });

      it('should return correct result', () => {
        const result = measureExecutionTime(() => 42);
        expect(result.result).toBe(42);
      });
    });

    describe('benchmark', () => {
      it('should run multiple iterations', () => {
        const stats = benchmark(() => {
          Math.sqrt(123456);
        }, 10);

        expect(stats.average).toBeGreaterThanOrEqual(0);
        expect(stats.min).toBeLessThanOrEqual(stats.average);
        expect(stats.max).toBeGreaterThanOrEqual(stats.average);
        expect(stats.total).toBeGreaterThanOrEqual(0);
      });

      it('should use default iterations', () => {
        const stats = benchmark(() => {
          // Empty function
        });

        expect(stats.total).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
