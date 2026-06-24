import type { Circuit } from '@/types/circuit';
import type { ACAnalysisConfig, ACAnalysisResult } from '@/types/simulation';
import { validateCircuitForAC } from '@/engine/analysis/acValidation';
import {
  buildACMNASystem,
  buildNodeIndexMap,
  extractACResults,
} from '@/engine/solver/acMnaAssembler';
import { createComplexVector } from '@/engine/solver/complexMatrix';
import { solveComplexLinearSystem } from '@/engine/solver/complexMatrix';

export function analyzeAC(
  circuit: Circuit,
  config: ACAnalysisConfig
): ACAnalysisResult {
  validateCircuitForAC(circuit, config);

  const map = buildNodeIndexMap(circuit);
  const frequencies = generateFrequencies(config);

  return {
    type: 'ac',
    frequencyPoints: frequencies.map(frequency => {
      if (map.systemSize === 0) {
        return {
          frequency,
          ...extractACResults(createComplexVector(0), circuit, map),
        };
      }

      const { A, b } = buildACMNASystem(circuit, map, 2 * Math.PI * frequency);
      const solution = solveComplexLinearSystem(A, b);

      return {
        frequency,
        ...extractACResults(solution, circuit, map),
      };
    }),
  };
}

function generateFrequencies(config: ACAnalysisConfig): number[] {
  switch (config.sweepType) {
    case 'decade':
      return generateLogFrequencies(config, 10);
    case 'octave':
      return generateLogFrequencies(config, 2);
    case 'linear':
      return generateLinearFrequencies(config);
  }
}

function generateLogFrequencies(
  config: ACAnalysisConfig,
  base: number
): number[] {
  const frequencies: number[] = [];
  const maxSteps =
    Math.floor(
      (Math.log(config.endFrequency / config.startFrequency) / Math.log(base)) *
        config.pointsPerDecade
    ) + 1;

  for (let i = 0; i <= maxSteps; i++) {
    const frequency =
      config.startFrequency * base ** (i / config.pointsPerDecade);
    if (frequency <= config.endFrequency) {
      frequencies.push(frequency);
    }
  }

  return includeEndFrequency(frequencies, config.endFrequency);
}

function generateLinearFrequencies(config: ACAnalysisConfig): number[] {
  const points = Math.max(2, config.pointsPerDecade + 1);
  const step = (config.endFrequency - config.startFrequency) / (points - 1);
  const frequencies = Array.from(
    { length: points },
    (_, i) => config.startFrequency + step * i
  );

  return includeEndFrequency(frequencies, config.endFrequency);
}

function includeEndFrequency(
  frequencies: number[],
  endFrequency: number
): number[] {
  const last = frequencies[frequencies.length - 1];
  if (last === undefined || Math.abs(last - endFrequency) > 1e-9) {
    frequencies.push(endFrequency);
  } else {
    frequencies[frequencies.length - 1] = endFrequency;
  }

  return frequencies;
}
