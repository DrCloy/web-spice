import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { analyzeDC } from '@/engine/analysis/dcAnalysis';
import { parseCircuit } from '@/engine/parser/circuitParser';
import {
  serializeDCResultToJSON,
  serializeDCResultToText,
} from '@/engine/formatter/resultFormatter';
import type { CircuitJSON } from '@/types/circuit';
import { WebSpiceError } from '@/types/circuit';

// ============================================================================
// Types
// ============================================================================

export interface CliOptions {
  command: 'analyze';
  filePath: string;
  outputFormat: 'text' | 'json';
  verbose: boolean;
}

// ============================================================================
// parseArgs
// ============================================================================

const USAGE = 'Usage: web-spice analyze <file> [--verbose] [--output json]';

/**
 * Parses process.argv (slice(2)) into CliOptions.
 * Pure function — throws Error on invalid arguments.
 */
export function parseArgs(argv: string[]): CliOptions {
  const [command, filePath, ...rest] = argv;

  if (!command) {
    throw new Error(`Missing command.\n${USAGE}`);
  }
  if (command !== 'analyze') {
    throw new Error(`Unknown command: "${command}".\n${USAGE}`);
  }
  if (!filePath) {
    throw new Error(`Missing file path.\n${USAGE}`);
  }

  let outputFormat: 'text' | 'json' = 'text';
  let verbose = false;

  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (flag === '--verbose') {
      verbose = true;
    } else if (flag === '--output') {
      const value = rest[i + 1];
      if (value === 'json' || value === 'text') {
        outputFormat = value;
        i++;
      } else {
        throw new Error(
          `Invalid --output value: "${value ?? ''}". Use "text" or "json".\n${USAGE}`
        );
      }
    } else {
      throw new Error(`Unknown flag: "${flag}".\n${USAGE}`);
    }
  }

  return { command, filePath, outputFormat, verbose };
}

// ============================================================================
// run
// ============================================================================

/**
 * Executes the analyze command.
 * All errors are thrown — callers (main) handle process.exit.
 */
export function run(options: CliOptions): void {
  const { filePath, outputFormat, verbose } = options;

  // Read file
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }

  // Parse JSON
  let json: CircuitJSON;
  try {
    json = JSON.parse(raw) as CircuitJSON;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON: ${message}`);
  }

  // Parse circuit & run analysis
  const startTime = performance.now();
  const circuit = parseCircuit(json);
  const result = analyzeDC(circuit);
  const elapsedMs = performance.now() - startTime;

  // Output
  if (outputFormat === 'json') {
    console.log(serializeDCResultToJSON(result));
    return;
  }

  console.log(serializeDCResultToText(result));

  if (verbose) {
    const { iterations, maxIterations, finalError, tolerance } =
      result.convergenceInfo;
    console.log('');
    console.log('--- Debug Info ---');
    console.log(`Analysis time: ${elapsedMs.toFixed(2)} ms`);
    console.log(`Iterations: ${iterations} / ${maxIterations}`);
    console.log(`Final error: ${finalError.toExponential(3)}`);
    console.log(`Tolerance: ${tolerance.toExponential(3)}`);
  }
}

// ============================================================================
// main
// ============================================================================

function main(): void {
  const argv = process.argv.slice(2);

  let options: CliOptions;
  try {
    options = parseArgs(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  try {
    run(options);
  } catch (err) {
    if (err instanceof WebSpiceError) {
      console.error(`Error [${err.code}]: ${err.message}`);
    } else {
      console.error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

// Only run when executed directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
