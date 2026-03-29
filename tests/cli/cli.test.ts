import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseArgs, run } from '@/cli/index';

const EXAMPLES_DIR = join(process.cwd(), 'examples');
const VOLTAGE_DIVIDER = join(EXAMPLES_DIR, 'voltage_divider.json');
const SIMPLE_RESISTOR = join(EXAMPLES_DIR, 'simple_resistor.json');

// ============================================================================
// parseArgs
// ============================================================================

describe('parseArgs', () => {
  it('parses "analyze <file>" with defaults', () => {
    expect(parseArgs(['analyze', 'circuit.json'])).toEqual({
      command: 'analyze',
      filePath: 'circuit.json',
      outputFormat: 'text',
      verbose: false,
    });
  });

  it('parses --output json flag', () => {
    const result = parseArgs(['analyze', 'circuit.json', '--output', 'json']);
    expect(result.outputFormat).toBe('json');
  });

  it('parses --verbose flag', () => {
    const result = parseArgs(['analyze', 'circuit.json', '--verbose']);
    expect(result.verbose).toBe(true);
  });

  it('parses --verbose and --output json together', () => {
    const result = parseArgs([
      'analyze',
      'circuit.json',
      '--verbose',
      '--output',
      'json',
    ]);
    expect(result.verbose).toBe(true);
    expect(result.outputFormat).toBe('json');
  });

  it('throws on missing command', () => {
    expect(() => parseArgs([])).toThrow();
  });

  it('throws on missing file path', () => {
    expect(() => parseArgs(['analyze'])).toThrow();
  });

  it('throws on unknown command', () => {
    expect(() => parseArgs(['simulate', 'file.json'])).toThrow();
  });

  it('throws on invalid --output value', () => {
    expect(() =>
      parseArgs(['analyze', 'file.json', '--output', 'xml'])
    ).toThrow();
  });

  it('throws on unknown flag', () => {
    expect(() => parseArgs(['analyze', 'file.json', '--unknown'])).toThrow();
  });
});

// ============================================================================
// run — analyze command
// ============================================================================

describe('run — analyze command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const getOutput = () =>
    consoleSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');

  // ------------------------------------------------------------------
  // Text output (voltage_divider.json)
  // ------------------------------------------------------------------

  it('outputs DC analysis sections for voltage_divider.json', () => {
    run({
      command: 'analyze',
      filePath: VOLTAGE_DIVIDER,
      outputFormat: 'text',
      verbose: false,
    });
    const output = getOutput();
    expect(output).toContain('Node Voltages');
    expect(output).toContain('Branch Currents');
    expect(output).toContain('Component Powers');
    expect(output).toContain('Convergence');
  });

  it('outputs correct node voltages for voltage divider (12V → 8V tap)', () => {
    run({
      command: 'analyze',
      filePath: VOLTAGE_DIVIDER,
      outputFormat: 'text',
      verbose: false,
    });
    const output = getOutput();
    expect(output).toContain('12.000 V');
    expect(output).toContain('8.000 V');
  });

  it('outputs correct branch current for voltage divider (4 mA)', () => {
    run({
      command: 'analyze',
      filePath: VOLTAGE_DIVIDER,
      outputFormat: 'text',
      verbose: false,
    });
    const output = getOutput();
    expect(output).toContain('4.000 mA');
  });

  it('outputs DC analysis sections for simple_resistor.json', () => {
    run({
      command: 'analyze',
      filePath: SIMPLE_RESISTOR,
      outputFormat: 'text',
      verbose: false,
    });
    const output = getOutput();
    expect(output).toContain('Node Voltages');
    expect(output).toContain('Convergence');
  });

  // ------------------------------------------------------------------
  // JSON output
  // ------------------------------------------------------------------

  it('outputs valid JSON with --output json', () => {
    run({
      command: 'analyze',
      filePath: VOLTAGE_DIVIDER,
      outputFormat: 'json',
      verbose: false,
    });
    const output = getOutput();
    const parsed = JSON.parse(output) as {
      type: string;
      operatingPoint: unknown;
    };
    expect(parsed.type).toBe('dc');
    expect(parsed.operatingPoint).toBeDefined();
  });

  // ------------------------------------------------------------------
  // Verbose output
  // ------------------------------------------------------------------

  it('includes debug section with --verbose', () => {
    run({
      command: 'analyze',
      filePath: VOLTAGE_DIVIDER,
      outputFormat: 'text',
      verbose: true,
    });
    const output = getOutput();
    expect(output).toContain('Debug Info');
  });

  it('includes iteration count in verbose output', () => {
    run({
      command: 'analyze',
      filePath: VOLTAGE_DIVIDER,
      outputFormat: 'text',
      verbose: true,
    });
    const output = getOutput();
    expect(output).toMatch(/[Ii]teration/);
  });

  it('includes analysis time in verbose output', () => {
    run({
      command: 'analyze',
      filePath: VOLTAGE_DIVIDER,
      outputFormat: 'text',
      verbose: true,
    });
    const output = getOutput();
    expect(output).toMatch(/[Tt]ime/);
  });

  // ------------------------------------------------------------------
  // Error cases
  // ------------------------------------------------------------------

  it('throws with "File not found" for non-existent file', () => {
    expect(() =>
      run({
        command: 'analyze',
        filePath: '/nonexistent/path/circuit.json',
        outputFormat: 'text',
        verbose: false,
      })
    ).toThrow(/File not found/);
  });

  it('throws with "Invalid JSON" for malformed JSON file', () => {
    const tempFile = join(tmpdir(), 'bad-circuit.json');
    writeFileSync(tempFile, '{ invalid json !!!');
    try {
      expect(() =>
        run({
          command: 'analyze',
          filePath: tempFile,
          outputFormat: 'text',
          verbose: false,
        })
      ).toThrow(/Invalid JSON/);
    } finally {
      rmSync(tempFile, { force: true });
    }
  });

  it('throws INVALID_CIRCUIT WebSpiceError for empty circuit', () => {
    const tempFile = join(tmpdir(), 'empty-circuit.json');
    writeFileSync(
      tempFile,
      JSON.stringify({ id: 'empty', name: 'Empty', components: [] })
    );
    try {
      expect(() =>
        run({
          command: 'analyze',
          filePath: tempFile,
          outputFormat: 'text',
          verbose: false,
        })
      ).toThrowWebSpiceError('INVALID_CIRCUIT');
    } finally {
      rmSync(tempFile, { force: true });
    }
  });
});
