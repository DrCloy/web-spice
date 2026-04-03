import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/store';
import { loadCircuit } from '@/store/circuitSlice';
import { loadEditorLayout } from '@/store/editorSlice';
import { parseCircuit } from '@/engine/parser/circuitParser';
import { autoLayoutComponents } from '@/utils/canvas';
import { CircuitCanvas } from '@/components/circuit/CircuitCanvas';
import ComponentPalette from '@/components/ui/ComponentPalette';
import voltageDividerJson from '../examples/voltage_divider.json';

export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    try {
      const circuit = parseCircuit(voltageDividerJson);
      dispatch(loadCircuit(circuit));
      dispatch(
        loadEditorLayout({
          components: autoLayoutComponents(circuit.components),
          wires: [],
        })
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load example circuit:', err);
    }
  }, [dispatch]);

  return (
    <div className='flex h-screen w-screen bg-gray-900'>
      <ComponentPalette />
      <CircuitCanvas className='h-full flex-1' aria-label='Circuit editor' />
    </div>
  );
}
