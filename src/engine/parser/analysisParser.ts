import type { AnalysisJSON, DCAnalysisConfig } from '@/types/simulation';
import { WebSpiceError } from '@/types/circuit';
import { parseSIValue } from '@/engine/parser/siPrefix';

/**
 * Parses an AnalysisJSON object into a typed DCAnalysisConfig.
 *
 * Converts flat parameters (Record<string, number | string>) into
 * a structured analysis configuration with optional sweep settings.
 * Currently only DC analysis is supported.
 *
 * @param json - AnalysisJSON object to parse
 * @returns DCAnalysisConfig with optional sweep configuration
 * @throws {WebSpiceError} INVALID_PARAMETER for missing or invalid parameters
 * @throws {WebSpiceError} UNSUPPORTED_ANALYSIS for non-DC analysis types
 */
export function parseAnalysis(json: AnalysisJSON): DCAnalysisConfig {
  if (!json) {
    throw new WebSpiceError('INVALID_PARAMETER', 'Analysis JSON is required');
  }

  if (json.type !== 'dc') {
    throw new WebSpiceError(
      'UNSUPPORTED_ANALYSIS',
      `Analysis type '${json.type}' is not yet supported`
    );
  }

  return parseDCAnalysis(json);
}

function parseDCAnalysis(json: AnalysisJSON): DCAnalysisConfig {
  const params = json.parameters;

  const sweepKeys = ['sourceId', 'startValue', 'endValue', 'stepValue'];
  const presentKeys = sweepKeys.filter(k => params[k] != null);

  // No sweep keys → simple operating point
  if (presentKeys.length === 0) {
    return { type: 'dc' };
  }

  // Partial sweep keys → error
  if (presentKeys.length !== sweepKeys.length) {
    const missingKeys = sweepKeys.filter(k => params[k] == null);
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `DC sweep requires all parameters: ${sweepKeys.join(', ')}. Missing: ${missingKeys.join(', ')}`
    );
  }

  if (
    typeof params.sourceId !== 'string' ||
    params.sourceId.trim().length === 0
  ) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `DC sweep 'sourceId' must be a non-empty string, got ${typeof params.sourceId}`
    );
  }
  const sourceId = params.sourceId;
  const startValue = parseSIValue(params.startValue as number | string);
  const endValue = parseSIValue(params.endValue as number | string);
  const stepValue = parseSIValue(params.stepValue as number | string);

  if (stepValue <= 0) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Sweep stepValue must be a positive finite number'
    );
  }

  return {
    type: 'dc',
    sweep: { sourceId, startValue, endValue, stepValue },
  };
}
