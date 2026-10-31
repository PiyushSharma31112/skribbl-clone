import { listAvailablePublicRooms } from '../services/roomService.js';

export function listPublicRooms(_req, res) {
  res.json({ rooms: listAvailablePublicRooms() });
}
