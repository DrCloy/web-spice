import { describe, expect, it } from 'vitest';

describe('WebSpice Test Environment', () => {
  it('should have Vitest configured correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support TypeScript', () => {
    const message: string = 'Hello WebSpice';
    expect(message).toBe('Hello WebSpice');
  });
});
