import type { Circuit } from '@/types/circuit';
import { WebSpiceError } from '@/types/circuit';
import { validateCircuitStructure } from '@/engine/circuit';

/**
 * Validate that a circuit is suitable for DC analysis.
 * Checks: empty circuit, missing ground, floating nodes,
 * and unsupported component types (capacitor, inductor, etc.).
 */
export function validateCircuitForDC(circuit: Circuit): void {
  const structuralErrors = validateCircuitStructure(circuit);
  if (structuralErrors.length > 0) {
    throw structuralErrors[0];
  }

  for (const component of circuit.components) {
    switch (component.type) {
      case 'resistor':
      case 'ground':
        break;
      case 'voltage_source':
      case 'current_source':
        if ('sourceType' in component && component.sourceType !== 'dc') {
          throw new WebSpiceError(
            'UNSUPPORTED_ANALYSIS',
            `AC ${component.type} '${component.id}' is not supported in DC analysis`
          );
        }
        break;
      default:
        throw new WebSpiceError(
          'UNSUPPORTED_ANALYSIS',
          `Component type '${component.type}' is not supported in DC analysis`
        );
    }
  }
}
