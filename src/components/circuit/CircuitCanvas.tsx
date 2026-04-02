import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import {
  deselectAll,
  panViewport,
  selectAllCanvasComponents,
  selectComponent,
  selectGridSize,
  selectSelectedComponentIds,
  selectShowGrid,
  selectViewport,
  zoomViewport,
} from '@/store/editorSlice';
import { resolveComponentColors } from '@/utils/componentColors';
import type { ComponentColors } from '@/utils/componentColors';
import { findHitComponent, screenToLogical } from '@/utils/canvas';
import { renderScene } from './renderScene';

// ---------------------------------------------------------------------------
// CircuitCanvas component
// ---------------------------------------------------------------------------

interface CircuitCanvasProps {
  className?: string;
}

export function CircuitCanvas({ className }: CircuitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();

  const circuit = useAppSelector(s => s.circuit.current);
  const canvasComponents = useAppSelector(selectAllCanvasComponents);
  const viewport = useAppSelector(selectViewport);
  const selectedIds = useAppSelector(selectSelectedComponentIds);
  const gridSize = useAppSelector(selectGridSize);
  const showGrid = useAppSelector(selectShowGrid);

  const [size, setSize] = useState({ width: 800, height: 600 });

  // Resolve colors once on mount (DOM must be ready)
  const colorsRef = useRef<ComponentColors | null>(null);
  useEffect(() => {
    colorsRef.current = resolveComponentColors();
  }, []);

  // Track canvas size via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Render scene whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const colors = colorsRef.current;
    if (!canvas || !colors) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderScene(ctx, {
      circuit,
      canvasComponents,
      viewport,
      selectedIds,
      gridSize,
      showGrid,
      width: size.width,
      height: size.height,
      colors,
    });
  }, [
    circuit,
    canvasComponents,
    viewport,
    selectedIds,
    gridSize,
    showGrid,
    size,
  ]);

  // -------------------------------------------------------------------------
  // Pan state (middle mouse / space+drag)
  // -------------------------------------------------------------------------

  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);
  const isSpaceHeldRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  // Space key tracking for space+drag pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        isSpaceHeldRef.current = true;
        setIsSpaceHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceHeldRef.current = false;
        setIsSpaceHeld(false);
        if (isPanningRef.current) {
          isPanningRef.current = false;
          lastPanPosRef.current = null;
          setIsPanning(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1 || (e.button === 0 && isSpaceHeldRef.current)) {
        // Middle mouse or space+left drag — start panning
        isPanningRef.current = true;
        lastPanPosRef.current = { x: e.clientX, y: e.clientY };
        setIsPanning(true);
        e.preventDefault();
        return;
      }

      if (e.button === 0) {
        // Left click — hit test
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const logicalPos = screenToLogical(screenPos, viewport);
        const hit = findHitComponent(logicalPos, canvasComponents);
        if (hit) {
          dispatch(selectComponent(hit.componentId));
        } else {
          dispatch(deselectAll());
        }
      }
    },
    [viewport, canvasComponents, dispatch]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPanningRef.current || !lastPanPosRef.current) return;
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      dispatch(panViewport({ dx, dy }));
    },
    [dispatch]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1 || e.button === 0) {
        if (isPanningRef.current) {
          isPanningRef.current = false;
          lastPanPosRef.current = null;
          setIsPanning(false);
        }
      }
    },
    []
  );

  // React registers onWheel as passive, so preventDefault() fails.
  // Attach a non-passive native listener instead.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const center = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const delta = e.deltaY < 0 ? 1 : -1;
      dispatch(zoomViewport({ delta, center }));
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [dispatch]);

  return (
    <div
      ref={containerRef}
      className={`circuit-canvas relative overflow-hidden${className ? ` ${className}` : ''}`}
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        style={{
          display: 'block',
          cursor: isPanning ? 'grabbing' : isSpaceHeld ? 'grab' : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
}
