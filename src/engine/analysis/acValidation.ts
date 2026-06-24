import type { Circuit } from '@/types/circuit';
import { WebSpiceError } from '@/types/circuit';
import type { ACAnalysisConfig } from '@/types/simulation';
import { validateCircuitStructure } from '@/engine/circuit';

export function validateCircuitForAC(
  circuit: Circuit,
  config: ACAnalysisConfig
): void {
  const structuralErrors = validateCircuitStructure(circuit);
  if (structuralErrors.length > 0) {
    throw structuralErrors[0];
  }

  if (!Number.isFinite(config.startFrequency) || config.startFrequency <= 0) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'AC startFrequency must be greater than 0'
    );
  }

  if (
    !Number.isFinite(config.endFrequency) ||
    config.endFrequency <= config.startFrequency
  ) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'AC endFrequency must be greater than startFrequency'
    );
  }

  if (!Number.isInteger(config.pointsPerDecade) || config.pointsPerDecade < 1) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'AC pointsPerDecade must be a positive integer'
    );
  }

  let hasSource = false;
  for (const component of circuit.components) {
    switch (component.type) {
      case 'resistor':
      case 'capacitor':
      case 'inductor':
      case 'ground':
        break;
      case 'voltage_source':
      case 'current_source':
        hasSource = true;
        break;
      default:
        throw new WebSpiceError(
          'UNSUPPORTED_ANALYSIS',
          `Component type '${(component as { type: string }).type}' is not supported in AC analysis`
        );
    }
  }

  if (!hasSource) {
    throw new WebSpiceError(
      'INVALID_CIRCUIT',
      'AC analysis requires at least one voltage or current source'
    );
  }
}
