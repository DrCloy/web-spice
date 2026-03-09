import type { ComponentId, NodeId } from '@/types/component';
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
