import { describe, expect, it } from 'vitest';
import {
  addVectors,
  areVectorsEqual,
  distance,
  dotProduct,
  hadamardProduct,
  isZeroVector,
  maxElement,
  minElement,
  negateVector,
  normInfinity,
  normL1,
  normL2,
  normalize,
  scaleVector,
  subtractVectors,
} from '@/engine/solver/matrix';
import { createTestVector, createZeroVector } from '../../factories/matrix';

describe('Vector Operations', () => {
  describe('addVectors', () => {
    it('should add two vectors of same length', () => {
      const v1 = createTestVector({ length: 3, data: [1, 2, 3] });
      const v2 = createTestVector({ length: 3, data: [4, 5, 6] });

      const result = addVectors(v1, v2);

      expect(result.length).toBe(3);
      expect(Array.from(result.data)).toEqual([5, 7, 9]);
    });

    it('should throw error for mismatched lengths', () => {
      const v1 = createTestVector({ length: 2, data: [1, 2] });
      const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

      expect(() => addVectors(v1, v2)).toThrow('Vector dimensions must match');
    });

    it('should handle zero vectors', () => {
      const v1 = createZeroVector(3);
      const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

      const result = addVectors(v1, v2);

      expect(Array.from(result.data)).toEqual([1, 2, 3]);
    });
  });

  describe('subtractVectors', () => {
    it('should subtract two vectors of same length', () => {
      const v1 = createTestVector({ length: 3, data: [5, 7, 9] });
      const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

      const result = subtractVectors(v1, v2);

      expect(result.length).toBe(3);
      expect(Array.from(result.data)).toEqual([4, 5, 6]);
    });

    it('should throw error for mismatched lengths', () => {
      const v1 = createTestVector({ length: 2, data: [1, 2] });
      const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

      expect(() => subtractVectors(v1, v2)).toThrow(
        'Vector dimensions must match'
      );
    });
  });

  describe('scaleVector', () => {
    it('should scale vector by scalar', () => {
      const v = createTestVector({ length: 3, data: [1, 2, 3] });

      const result = scaleVector(v, 2);

      expect(Array.from(result.data)).toEqual([2, 4, 6]);
    });

    it('should handle zero scalar', () => {
      const v = createTestVector({ length: 3, data: [1, 2, 3] });

      const result = scaleVector(v, 0);

      expect(Array.from(result.data)).toEqual([0, 0, 0]);
    });

    it('should handle negative scalar', () => {
      const v = createTestVector({ length: 3, data: [1, 2, 3] });

      const result = scaleVector(v, -1);

      expect(Array.from(result.data)).toEqual([-1, -2, -3]);
    });
  });

  describe('negateVector', () => {
    it('should negate all elements', () => {
      const v = createTestVector({ length: 3, data: [1, -2, 3] });

      const result = negateVector(v);

      expect(Array.from(result.data)).toEqual([-1, 2, -3]);
    });

    it('should handle zero vector', () => {
      const v = createZeroVector(3);

      const result = negateVector(v);

      expect(Array.from(result.data)).toEqual([0, 0, 0]);
    });
  });

  describe('dotProduct', () => {
    it('should compute dot product correctly', () => {
      const v1 = createTestVector({ length: 3, data: [1, 2, 3] });
      const v2 = createTestVector({ length: 3, data: [4, 5, 6] });

      const result = dotProduct(v1, v2);

      // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      expect(result).toBe(32);
    });

    it('should return 0 for orthogonal vectors', () => {
      const v1 = createTestVector({ length: 2, data: [1, 0] });
      const v2 = createTestVector({ length: 2, data: [0, 1] });

      const result = dotProduct(v1, v2);

      expect(result).toBe(0);
    });

    it('should throw error for mismatched lengths', () => {
      const v1 = createTestVector({ length: 2, data: [1, 2] });
      const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

      expect(() => dotProduct(v1, v2)).toThrow('Vector dimensions must match');
    });
  });

  describe('hadamardProduct', () => {
    it('should compute element-wise product', () => {
      const v1 = createTestVector({ length: 3, data: [1, 2, 3] });
      const v2 = createTestVector({ length: 3, data: [4, 5, 6] });

      const result = hadamardProduct(v1, v2);

      expect(Array.from(result.data)).toEqual([4, 10, 18]);
    });

    it('should throw error for mismatched lengths', () => {
      const v1 = createTestVector({ length: 2, data: [1, 2] });
      const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

      expect(() => hadamardProduct(v1, v2)).toThrow(
        'Vector dimensions must match'
      );
    });
  });

  describe('normL1', () => {
    it('should compute L1 norm (sum of absolute values)', () => {
      const v = createTestVector({ length: 3, data: [1, -2, 3] });

      const result = normL1(v);

      // |1| + |-2| + |3| = 1 + 2 + 3 = 6
      expect(result).toBe(6);
    });

    it('should return 0 for zero vector', () => {
      const v = createZeroVector(3);

      const result = normL1(v);

      expect(result).toBe(0);
    });
  });

  describe('normL2', () => {
    it('should compute L2 norm (Euclidean norm)', () => {
      const v = createTestVector({ length: 2, data: [3, 4] });

      const result = normL2(v);

      // sqrt(3^2 + 4^2) = sqrt(9 + 16) = sqrt(25) = 5
      expect(result).toBe(5);
    });

    it('should return 0 for zero vector', () => {
      const v = createZeroVector(3);

      const result = normL2(v);

      expect(result).toBe(0);
    });
  });

  describe('normInfinity', () => {
    it('should compute infinity norm (max absolute value)', () => {
      const v = createTestVector({ length: 4, data: [1, -5, 3, -2] });

      const result = normInfinity(v);

      // max(|1|, |-5|, |3|, |-2|) = 5
      expect(result).toBe(5);
    });

    it('should return 0 for zero vector', () => {
      const v = createZeroVector(3);

      const result = normInfinity(v);

      expect(result).toBe(0);
    });
  });

  describe('normalize', () => {
    it('should normalize vector using L2 norm by default', () => {
      const v = createTestVector({ length: 2, data: [3, 4] });

      const result = normalize(v);

      // Original norm = 5, so result = [3/5, 4/5] = [0.6, 0.8]
      expect(result.data[0]).toBeCloseTo(0.6);
      expect(result.data[1]).toBeCloseTo(0.8);
    });

    it('should throw error for zero vector', () => {
      const v = createZeroVector(3);

      expect(() => normalize(v)).toThrow('Cannot normalize zero vector');
    });
  });

  describe('distance', () => {
    it('should compute Euclidean distance by default', () => {
      const v1 = createTestVector({ length: 2, data: [0, 0] });
      const v2 = createTestVector({ length: 2, data: [3, 4] });

      const result = distance(v1, v2);

      // distance = sqrt((3-0)^2 + (4-0)^2) = sqrt(9 + 16) = 5
      expect(result).toBe(5);
    });

    it('should throw error for mismatched lengths', () => {
      const v1 = createTestVector({ length: 2, data: [1, 2] });
      const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

      expect(() => distance(v1, v2)).toThrow('Vector dimensions must match');
    });
  });

  describe('isZeroVector', () => {
    it('should return true for zero vector', () => {
      const v = createZeroVector(3);

      const result = isZeroVector(v);

      expect(result).toBe(true);
    });

    it('should return false for non-zero vector', () => {
      const v = createTestVector({ length: 3, data: [0, 0, 1] });

      const result = isZeroVector(v);

      expect(result).toBe(false);
    });
  });

  describe('areVectorsEqual', () => {
    it('should return true for equal vectors', () => {
      const v1 = createTestVector({ length: 3, data: [1, 2, 3] });
      const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

      const result = areVectorsEqual(v1, v2);

      expect(result).toBe(true);
    });

    it('should return false for different vectors', () => {
      const v1 = createTestVector({ length: 3, data: [1, 2, 3] });
      const v2 = createTestVector({ length: 3, data: [1, 2, 4] });

      const result = areVectorsEqual(v1, v2);

      expect(result).toBe(false);
    });

    it('should return false for different lengths', () => {
      const v1 = createTestVector({ length: 2, data: [1, 2] });
      const v2 = createTestVector({ length: 3, data: [1, 2, 3] });

      const result = areVectorsEqual(v1, v2);

      expect(result).toBe(false);
    });
  });

  describe('maxElement', () => {
    it('should find maximum element and its index', () => {
      const v = createTestVector({ length: 4, data: [1, 5, 3, 2] });

      const result = maxElement(v);

      expect(result.value).toBe(5);
      expect(result.index).toBe(1);
    });

    it('should handle negative values', () => {
      const v = createTestVector({ length: 3, data: [-5, -2, -10] });

      const result = maxElement(v);

      expect(result.value).toBe(-2);
      expect(result.index).toBe(1);
    });
  });

  describe('minElement', () => {
    it('should find minimum element and its index', () => {
      const v = createTestVector({ length: 4, data: [5, 1, 3, 2] });

      const result = minElement(v);

      expect(result.value).toBe(1);
      expect(result.index).toBe(1);
    });

    it('should handle negative values', () => {
      const v = createTestVector({ length: 3, data: [-5, -2, -10] });

      const result = minElement(v);

      expect(result.value).toBe(-10);
      expect(result.index).toBe(2);
    });
  });
});
