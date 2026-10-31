import { randomBytes } from 'node:crypto';
import { clamp, getRoom, validColor } from '../helpers.js';

function canDraw(room, socket) {
  return (
    room &&
    room.game.phase === 'drawing' &&
    room.game.drawer?.id === socket.id
  );
}

export function registerDrawingHandlers(socket) {
  socket.on('draw_start', (payload) => {
    const room = getRoom(socket);
    if (!canDraw(room, socket)) return;

    const stroke = {
      id: randomBytes(5).toString('hex'),
      points: [{ x: clamp(payload?.x), y: clamp(payload?.y) }],
      color: validColor(payload?.color),
      size: Math.min(32, Math.max(1, Number(payload?.size) || 4)),
      erase: !!payload?.erase,
    };
    room.game.strokes.push(stroke);
    room.broadcast('draw_data', { action: 'start', stroke });
  });

  socket.on('draw_move', (payload) => {
    const room = getRoom(socket);
    if (!canDraw(room, socket)) return;

    const stroke = room.game.strokes[room.game.strokes.length - 1];
    if (!stroke) return;

    const point = { x: clamp(payload?.x), y: clamp(payload?.y) };
    stroke.points.push(point);
    room.broadcast('draw_data', {
      action: 'move',
      strokeId: stroke.id,
      point,
    });
  });

  socket.on('draw_end', () => {
    const room = getRoom(socket);
    if (room?.game.drawer?.id === socket.id) {
      room.broadcast('draw_data', { action: 'end' });
    }
  });

  socket.on('canvas_clear', () => {
    const room = getRoom(socket);
    if (!canDraw(room, socket)) return;

    room.game.strokes = [];
    room.broadcast('canvas_clear', {});
  });

  socket.on('draw_undo', () => {
    const room = getRoom(socket);
    if (!canDraw(room, socket)) return;

    room.game.strokes.pop();
    room.broadcast('canvas_undo', { strokes: room.game.strokes });
  });
}
