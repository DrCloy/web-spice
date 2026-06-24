import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import {
  addWire,
  deselectAll,
  panViewport,
  placeComponent,
  selectActiveTool,
  selectAllCanvasComponents,
  selectAllWires,
  selectComponent,
  selectGridSize,
  selectShowGrid,
  selectViewport,
  selectWire,
  zoomViewport,
} from '@/store/editorSlice';
import { addComponent, mergeNodes } from '@/store/circuitSlice';
import { useCanvasColors } from '@/contexts/ThemeContext';
import {
  TERMINAL_HIT_RADIUS,
  distanceToSegment,
  findHitComponent,
  findTerminalAt,
  screenToLogical,
  snapToGrid,
} from '@/utils/canvas';
import type { Component, ComponentId } from '@/types/component';
import type { TerminalAnchor } from '@/utils/canvas';
import type { CanvasWire, WireSegment } from '@/types/editor';
import {
  createDefaultComponent,
  generateComponentId,
} from '@/utils/componentFactory';
import type { PaletteDragPayload } from '@/types/editor';
import { PALETTE_DRAG_MIME } from '@/types/editor';
import { renderScene } from './renderScene';

// ---------------------------------------------------------------------------
// CircuitCanvas component
// ---------------------------------------------------------------------------

interface CircuitCanvasProps {
  className?: string;
  'aria-label'?: string;
}

/** Generate a unique wire id not colliding with existing wires. */
function nextWireId(wires: CanvasWire[]): string {
  const existing = new Set(wires.map(w => w.wireId));
  let n = wires.length + 1;
  let id = `w${n}`;
  while (existing.has(id)) {
    n += 1;
    id = `w${n}`;
  }
  return id;
}

export function CircuitCanvas({
  className,
  'aria-label': ariaLabel,
}: CircuitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();

  const circuit = useAppSelector(s => s.circuit.current);
  const canvasComponents = useAppSelector(selectAllCanvasComponents);
  const wires = useAppSelector(selectAllWires);
  const viewport = useAppSelector(selectViewport);
  const gridSize = useAppSelector(selectGridSize);
  const showGrid = useAppSelector(selectShowGrid);
  const activeTool = useAppSelector(selectActiveTool);

  const [size, setSize] = useState({ width: 800, height: 600 });

  const colors = useCanvasColors();

  // Wire-drag state. Ref drives event handlers; preview state drives re-render.
  const wireDragRef = useRef<TerminalAnchor | null>(null);
  const [wirePreview, setWirePreview] = useState<WireSegment[] | null>(null);

  // Map from componentId to its full Component (for terminal lookup).
  const componentMap = useMemo(
    () =>
      new Map<ComponentId, Component>(
        (circuit?.components ?? []).map(c => [c.id, c])
      ),
    [circuit]
  );

  // Canvas focus state — Space key panning is scoped to canvas focus only
  const canvasFocusedRef = useRef(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

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
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderScene(ctx, {
      circuit,
      canvasComponents,
      viewport,
      gridSize,
      showGrid,
      width: size.width,
      height: size.height,
      colors,
      wires,
      activeTool,
      wirePreview,
    });
  }, [
    circuit,
    canvasComponents,
    wires,
    viewport,
    gridSize,
    showGrid,
    size,
    colors,
    activeTool,
    wirePreview,
  ]);

  // -------------------------------------------------------------------------
  // Pan state (middle mouse / space+drag)
  // -------------------------------------------------------------------------

  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);
  const isSpaceHeldRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

  // Space key panning — scoped to canvas focus to avoid intercepting other UI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && canvasFocusedRef.current) {
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

  // Terminate/continue panning when pointer leaves canvas
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !lastPanPosRef.current) return;
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      dispatch(panViewport({ dx, dy }));
    };
    const handleWindowMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        lastPanPosRef.current = null;
        setIsPanning(false);
      }
    };
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dispatch]);

  // Wire hit test — closest wire within a screen-scaled tolerance.
  const findWireAt = useCallback(
    (logicalPos: { x: number; y: number }): CanvasWire | null => {
      const tolerance = TERMINAL_HIT_RADIUS / viewport.scale;
      let best: CanvasWire | null = null;
      let bestDist = Infinity;
      for (const wire of wires) {
        for (const seg of wire.segments) {
          const d = distanceToSegment(logicalPos, seg.from, seg.to);
          if (d <= tolerance && d < bestDist) {
            best = wire;
            bestDist = d;
          }
        }
      }
      return best;
    },
    [wires, viewport.scale]
  );

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
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const logicalPos = screenToLogical(screenPos, viewport);

        if (activeTool === 'wire') {
          // Begin a wire drag from the nearest terminal.
          const start = findTerminalAt(
            logicalPos,
            canvasComponents,
            componentMap
          );
          if (start) {
            wireDragRef.current = start;
            setWirePreview([{ from: start.position, to: start.position }]);
          }
          return;
        }

        // Select tool — prefer component hit, then wire hit, else clear.
        const hit = findHitComponent(logicalPos, canvasComponents);
        if (hit) {
          dispatch(selectComponent(hit.componentId));
          return;
        }
        const wireHit = findWireAt(logicalPos);
        if (wireHit) {
          dispatch(selectWire(wireHit.wireId));
        } else {
          dispatch(deselectAll());
        }
      }
    },
    [viewport, canvasComponents, activeTool, componentMap, findWireAt, dispatch]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (activeTool !== 'wire' || !wireDragRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const logicalPos = screenToLogical(screenPos, viewport);
      setWirePreview([{ from: wireDragRef.current.position, to: logicalPos }]);
    },
    [activeTool, viewport]
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

      // Complete a wire drag (left button only).
      if (e.button === 0 && wireDragRef.current) {
        const start = wireDragRef.current;
        wireDragRef.current = null;
        setWirePreview(null);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const logicalPos = screenToLogical(screenPos, viewport);
        const end = findTerminalAt(logicalPos, canvasComponents, componentMap);

        // Ignore: no target, same terminal, or same component+terminal.
        if (
          !end ||
          (end.componentId === start.componentId &&
            end.terminalIndex === start.terminalIndex)
        ) {
          return;
        }
        // Already on the same electrical node — nothing to merge or draw.
        if (end.nodeId === start.nodeId) return;

        const wireId = nextWireId(wires);
        // mergeNodes uses ground-priority: the non-ground node is absorbed into
        // the ground node. Pre-compute which node survives so the wire stores
        // stable, post-merge nodeIds on both endpoints.
        const groundNodeId = circuit?.groundNodeId ?? '0';
        const survivingNodeId =
          end.nodeId === groundNodeId ? end.nodeId : start.nodeId;
        dispatch(
          addWire({
            wireId,
            fromNodeId: survivingNodeId,
            toNodeId: survivingNodeId,
            segments: [{ from: start.position, to: end.position }],
            isSelected: false,
          })
        );
        dispatch(
          mergeNodes({ fromNodeId: end.nodeId, toNodeId: start.nodeId })
        );
      }
    },
    [viewport, canvasComponents, wires, componentMap, circuit, dispatch]
  );

  // -------------------------------------------------------------------------
  // Drag-and-drop from ComponentPalette
  // -------------------------------------------------------------------------

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLCanvasElement>) => {
      if (e.dataTransfer.types.includes(PALETTE_DRAG_MIME)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData(PALETTE_DRAG_MIME);
      if (!raw) return;

      let payload: PaletteDragPayload;
      try {
        payload = JSON.parse(raw) as PaletteDragPayload;
      } catch {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const logicalPos = screenToLogical(screenPos, viewport);
      const snapped = snapToGrid(logicalPos, gridSize);

      const existingIds = canvasComponents.map(c => c.componentId);
      const id = generateComponentId(payload.type, existingIds);
      const component = createDefaultComponent(payload, id);

      dispatch(addComponent(component));
      dispatch(
        placeComponent({
          componentId: id,
          position: snapped,
          rotation: 0,
          isSelected: false,
        })
      );
    },
    [viewport, gridSize, canvasComponents, dispatch]
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
        tabIndex={0}
        aria-label={ariaLabel ?? 'Circuit editor canvas'}
        style={{
          display: 'block',
          cursor: isPanning ? 'grabbing' : isSpaceHeld ? 'grab' : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onFocus={() => {
          canvasFocusedRef.current = true;
        }}
        onBlur={() => {
          canvasFocusedRef.current = false;
          isSpaceHeldRef.current = false;
          setIsSpaceHeld(false);
        }}
      />
    </div>
  );
}
