import { useRef } from 'react';

export default function useCanvasDrawing({
  socket,
  game,
  color,
  brushSize,
  eraser,
}) {
  const canvasRef = useRef(null);
  const canvasStrokes = useRef([]);
  const drawing = useRef(false);
  const lastPoint = useRef(null);

  function getContext() {
    return canvasRef.current?.getContext('2d') || null;
  }

  function drawStroke(stroke) {
    const context = getContext();
    if (!context || !stroke) return;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = stroke.erase ? '#ffffff' : stroke.color;
    context.lineWidth = stroke.size;
    context.beginPath();

    if (stroke.points?.length) {
      const firstPoint = stroke.points[0];
      context.moveTo(
        firstPoint.x * context.canvas.width,
        firstPoint.y * context.canvas.height,
      );
      for (const point of stroke.points.slice(1)) {
        context.lineTo(
          point.x * context.canvas.width,
          point.y * context.canvas.height,
        );
      }
      if (stroke.points.length === 1) {
        context.lineTo(
          firstPoint.x * context.canvas.width + 0.1,
          firstPoint.y * context.canvas.height + 0.1,
        );
      }
    }

    context.stroke();
    context.restore();
  }

  function addRemotePoint(strokeId, point) {
    const stroke = canvasStrokes.current.find((entry) => entry.id === strokeId);
    const context = getContext();
    if (!context || !stroke) return;

    const previousPoint = stroke.points[stroke.points.length - 1];
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = stroke.erase ? '#ffffff' : stroke.color;
    context.lineWidth = stroke.size;
    context.beginPath();
    context.moveTo(
      previousPoint.x * context.canvas.width,
      previousPoint.y * context.canvas.height,
    );
    context.lineTo(
      point.x * context.canvas.width,
      point.y * context.canvas.height,
    );
    context.stroke();
    context.restore();
    stroke.points.push(point);
  }

  function redrawStrokes(strokes) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvasStrokes.current = [...strokes];
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(drawStroke);
  }

  function handleDrawData(data) {
    if (data.action === 'start') {
      if (!canvasStrokes.current.some((stroke) => stroke.id === data.stroke.id)) {
        canvasStrokes.current.push(data.stroke);
      }
      drawStroke(data.stroke);
    } else if (data.action === 'move') {
      addRemotePoint(data.strokeId, data.point);
    }
  }

  function clearCanvas(emit = true) {
    canvasStrokes.current = [];
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    if (emit) socket.emit('canvas_clear');
  }

  function undo() {
    socket.emit('draw_undo');
  }

  function pointFromEvent(event) {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  }

  function pointerDown(event) {
    if (game?.phase !== 'drawing' || game.drawerId !== socket.id) return;

    const point = pointFromEvent(event);
    drawing.current = true;
    lastPoint.current = point;
    canvasRef.current.setPointerCapture(event.pointerId);
    const payload = { ...point, color, size: brushSize, erase: eraser };
    drawStroke({ ...payload, points: [point] });
    socket.emit('draw_start', payload);
  }

  function pointerMove(event) {
    if (!drawing.current || game?.drawerId !== socket.id) return;

    const point = pointFromEvent(event);
    const context = getContext();
    if (context && lastPoint.current) {
      context.save();
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = eraser ? '#ffffff' : color;
      context.lineWidth = brushSize;
      context.beginPath();
      context.moveTo(
        lastPoint.current.x * context.canvas.width,
        lastPoint.current.y * context.canvas.height,
      );
      context.lineTo(
        point.x * context.canvas.width,
        point.y * context.canvas.height,
      );
      context.stroke();
      context.restore();
    }
    lastPoint.current = point;
    socket.emit('draw_move', point);
  }

  function pointerUp() {
    if (!drawing.current) return;

    drawing.current = false;
    lastPoint.current = null;
    socket.emit('draw_end');
  }

  return {
    canvasRef,
    clearCanvas,
    handleDrawData,
    pointerDown,
    pointerMove,
    pointerUp,
    redrawStrokes,
    undo,
  };
}
