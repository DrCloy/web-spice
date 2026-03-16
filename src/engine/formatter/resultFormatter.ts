import type { ComponentId, NodeId } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';
import type {
  ConvergenceInfo,
  DCAnalysisResult,
  DCOperatingPoint,
} from '@/types/simulation';
import { formatSIValue } from '@/engine/parser/siPrefix';

// ============================================================================
// Types
// ============================================================================

export interface FormattedOperatingPoint {
  nodeVoltages: Record<NodeId, string>;
  branchCurrents: Record<ComponentId, string>;
  componentPowers: Record<ComponentId, string>;
}

export interface FormattedDCResult {
  type: 'dc';
  operatingPoint: FormattedOperatingPoint;
  sweep?: {
    sweepValues: string[];
    operatingPoints: FormattedOperatingPoint[];
  };
  convergenceInfo: ConvergenceInfo;
}

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Format a DC operating point's numeric values as SI-prefixed strings.
 * Node voltages use V, branch currents use A, component powers use W.
 */
export function formatDCOperatingPoint(
  op: DCOperatingPoint
): FormattedOperatingPoint {
  const nodeVoltages: Record<NodeId, string> = {};
  for (const [id, v] of Object.entries(op.nodeVoltages)) {
    nodeVoltages[id] = formatSIValue(v, 'V');
  }

  const branchCurrents: Record<ComponentId, string> = {};
  for (const [id, i] of Object.entries(op.branchCurrents)) {
    branchCurrents[id] = formatSIValue(i, 'A');
  }

  const componentPowers: Record<ComponentId, string> = {};
  for (const [id, p] of Object.entries(op.componentPowers)) {
    componentPowers[id] = formatSIValue(p, 'W');
  }

  return { nodeVoltages, branchCurrents, componentPowers };
}

/**
 * Serialize a DC analysis result to a JSON string.
 * Raw numeric values are preserved as-is.
 */
export function serializeDCResultToJSON(result: DCAnalysisResult): string {
  return JSON.stringify(result);
}

/**
 * Serialize a DC analysis result to a human-readable text table.
 * Each operating point lists node voltages, branch currents, and component powers.
 * Sweep results include a header line per sweep point.
 */
export function serializeDCResultToText(result: DCAnalysisResult): string {
  const lines: string[] = ['=== DC Analysis Result ==='];

  if (result.sweep) {
    if (
      result.sweep.sweepValues.length !== result.sweep.operatingPoints.length
    ) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        `Sweep data is inconsistent: ${result.sweep.sweepValues.length} sweep values but ${result.sweep.operatingPoints.length} operating points`
      );
    }
    const sweepUnit = result.sweep.sourceType === 'current_source' ? 'A' : 'V';
    for (let i = 0; i < result.sweep.sweepValues.length; i++) {
      const sweepLabel = formatSIValue(result.sweep.sweepValues[i], sweepUnit);
      lines.push('', `Sweep: ${sweepLabel}`);
      appendOperatingPointLines(lines, result.sweep.operatingPoints[i]);
    }
  } else {
    lines.push('');
    appendOperatingPointLines(lines, result.operatingPoint);
  }

  const ci = result.convergenceInfo;
  const status = ci.converged ? 'converged' : 'did not converge';
  lines.push('', `Convergence: ${status} in ${ci.iterations} iteration(s)`);

  return lines.join('\n');
}

function appendOperatingPointLines(
  lines: string[],
  op: DCOperatingPoint
): void {
  const formatted = formatDCOperatingPoint(op);

  lines.push('Node Voltages:');
  for (const [id, v] of Object.entries(formatted.nodeVoltages)) {
    lines.push(`  ${id}: ${v}`);
  }

  lines.push('', 'Branch Currents:');
  for (const [id, i] of Object.entries(formatted.branchCurrents)) {
    lines.push(`  ${id}: ${i}`);
  }

  lines.push('', 'Component Powers:');
  for (const [id, p] of Object.entries(formatted.componentPowers)) {
    lines.push(`  ${id}: ${p}`);
  }
}

/**
 * Format a full DC analysis result into human-readable strings.
 * Sweep values are formatted in V for voltage sources, A for current sources.
 */
export function formatDCResult(result: DCAnalysisResult): FormattedDCResult {
  const operatingPoint = formatDCOperatingPoint(result.operatingPoint);

  if (!result.sweep) {
    return {
      type: 'dc',
      operatingPoint,
      convergenceInfo: result.convergenceInfo,
    };
  }

  const sweepUnit = result.sweep.sourceType === 'current_source' ? 'A' : 'V';
  const sweepValues = result.sweep.sweepValues.map(v =>
    formatSIValue(v, sweepUnit)
  );
  const operatingPoints = result.sweep.operatingPoints.map(
    formatDCOperatingPoint
  );

  return {
    type: 'dc',
    operatingPoint,
    sweep: { sweepValues, operatingPoints },
    convergenceInfo: result.convergenceInfo,
  };
}
