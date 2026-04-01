import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/store';
import { loadCircuit } from '@/store/circuitSlice';
import { loadEditorLayout } from '@/store/editorSlice';
import { parseCircuit } from '@/engine/parser/circuitParser';
import { autoLayoutComponents } from '@/utils/canvas';
import { CircuitCanvas } from '@/components/circuit/CircuitCanvas';
import voltageDividerJson from '../examples/voltage_divider.json';

export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const circuit = parseCircuit(voltageDividerJson);
    dispatch(loadCircuit(circuit));
    dispatch(
      loadEditorLayout({
        components: autoLayoutComponents(circuit.components),
        wires: [],
      })
    );
  }, [dispatch]);

  return (
    <div className='h-screen w-screen bg-gray-900'>
      <CircuitCanvas className='h-full w-full' />
    </div>
  );
}
