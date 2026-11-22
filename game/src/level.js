// level.js — the Meridian Bank floor plan and everything placed on it.
// The map is one string grid (32 x 20 tiles of 40 px = 1280 x 800):
//   # wall   . marble floor   , carpet   v vault floor
//   C crate (cover, blocks sight + movement)
//   D display case (blocks sight + movement)
//   g gold bar ($500)   d diamond ($1500)   * the Meridian Star ($5000)
//   G door (walkable)   T hack terminal   S thief start
// Guards, cameras and lasers are data below the grid so the map stays
// readable; patrol routes are tile waypoints the guards walk in order.

import { TILE, VIEW_W, VIEW_H, LOOT } from './config.js';

const MAP = [
  '################################',
  '#,,,,,,,,,,,,,,,,,,,,,,#vvvvvvv#',
  '#,,,,,,D,,,,,,,,D,,,,,,#vvvvvvv#',
  '#,,,,,,,,,,,,,,,,,,,,,,#vvv*vvv#',
  '#,,C,,,,g,,,,,C,,,,,,,,#vvvvvvv#',
  '#,,,,,,,,,,,,,,,,,,,,,,#vvvvvvv#',
  '#,,,,,,,,,,,,,,,,,,,,,T####G####',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,D,,,,,,,,D,,,,,g,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,C,,,,,,,,,,C,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,D,,,,,,,,D,,,,,d,,,,,,,,#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..............................#',
  '#..S...........................#',
  '#..............................#',
  '##GG############################',
];

export const COLS = 32;
export const ROWS = 20;

export function buildLevel() {
  if (MAP.length !== ROWS) throw new Error(`map has ${MAP.length} rows, want ${ROWS}`);
  const grid = [];
  const loot = [];
  const terminals = [];
  let playerStart = null;
  let vaultDoor = null;
  let getaway = null;

  for (let row = 0; row < ROWS; row += 1) {
    if (MAP[row].length !== COLS) throw new Error(`map row ${row} has ${MAP[row].length} chars, want ${COLS}`);
    grid.push([]);
    for (let col = 0; col < COLS; col += 1) {
      const ch = MAP[row][col];
      let tile = ch;
      if (ch === 'g') {
        loot.push({ kind: 'gold', value: LOOT.goldValue, col, row, taken: false, bob: (col * 7 + row * 3) % 6 });
        tile = ',';
      } else if (ch === 'd') {
        loot.push({ kind: 'diamond', value: LOOT.diamondValue, col, row, taken: false, bob: (col * 5 + row * 2) % 6 });
        tile = ',';
      } else if (ch === '*') {
        loot.push({ kind: 'star', value: LOOT.starValue, col, row, taken: false, bob: 0 });
        tile = 'v';
      } else if (ch === 'S') {
        playerStart = { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
        tile = '.';
      } else if (ch === 'G') {
        // The vault door (row 6) and the getaway doors (row 19) are both
        // walkable; tell them apart by row.
        if (row === ROWS - 1) {
          if (!getaway) getaway = { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE, w: TILE * 2, h: TILE };
          tile = 'G';
        } else {
          vaultDoor = { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
          tile = 'G';
        }
      } else if (ch === 'T') {
        terminals.push({ col, row, x: (col + 0.5) * TILE, y: (row + 0.5) * TILE, progress: 0 });
        tile = ',';
      }
      grid[row].push(tile);
    }
  }

  // Two more gold bars placed by hand so the haul math works out:
  // 3 gold + 1 diamond + star = 8000 exactly at the target line.
  loot.push({ kind: 'gold', value: LOOT.goldValue, col: 18, row: 10, taken: false, bob: 2 });
  loot.push({ kind: 'gold', value: LOOT.goldValue, col: 5, row: 15, taken: false, bob: 4 });

  return {
    grid,
    loot,
    terminals,
    playerStart,
    vaultDoor,
    getaway,
    // Four guards, each with a patrol loop through the rooms they own.
    guards: [
      { waypoints: [[3, 14], [3, 8], [10, 8], [10, 14]], pause: 1.6 },
      { waypoints: [[12, 3], [20, 3], [20, 11], [12, 11]], pause: 1.2 },
      { waypoints: [[26, 8], [26, 16], [29, 16], [29, 8]], pause: 1.0 },
      { waypoints: [[25, 7], [29, 7], [29, 11], [25, 11]], pause: 1.4 },
    ],
    // Wall cameras: position (tile), base facing angle, sweep.
    // Angles: 0 = east, PI/2 = south, PI = west, -PI/2 = north.
    cameras: [
      { col: 16, row: 0, baseAngle: Math.PI / 2, phase: 0.0 },
      { col: 31, row: 10, baseAngle: Math.PI, phase: 1.3 },
      { col: 0, row: 13, baseAngle: 0, phase: 2.1 },
      { col: 27, row: 1, baseAngle: Math.PI / 2, phase: 0.7 },
    ],
    // Laser grids: pulsing beams the thief must time. Each is a segment
    // in tile coordinates; on 2.2 s, off 1.4 s, offset so they desync.
    lasers: [
      { x1: 24, y1: 7.5, x2: 30.5, y2: 7.5, onFor: 2.2, offFor: 1.4, offset: 0.0 },
      { x1: 15.5, y1: 9.5, x2: 15.5, y2: 12.5, onFor: 2.2, offFor: 1.4, offset: 1.1 },
    ],
    // Velvet-rope paintings hung on the gallery walls (decor only).
    paintings: [
      { col: 6, row: 0, w: 3, hue: '#7a4a2b', title: 'The Duchess' },
      { col: 13, row: 0, w: 3, hue: '#2b4a7a', title: 'Blue Nocturne' },
      { col: 20, row: 0, w: 2, hue: '#4a7a2b', title: 'The Green Room' },
      { col: 0, row: 5, w: 2, hue: '#7a2b4a', title: 'Crimson Study', vertical: true },
      { col: 0, row: 10, w: 2, hue: '#8a6d2f', title: 'Gilded Age', vertical: true },
    ],
  };
}

export function tileAt(level, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return level.grid[row][col];
}

export function isSolid(level, col, row) {
  const t = tileAt(level, col, row);
  return t === '#' || t === 'C' || t === 'D';
}

// Sight-blocking: walls, crates and display cases all stop a cone.
export function blocksSight(level, col, row) {
  return isSolid(level, col, row);
}

export function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

// Circle-vs-grid collision: push the circle out of solid tiles.
export function collideCircle(level, pos, radius) {
  const minCol = Math.floor((pos.x - radius) / TILE);
  const maxCol = Math.floor((pos.x + radius) / TILE);
  const minRow = Math.floor((pos.y - radius) / TILE);
  const maxRow = Math.floor((pos.y + radius) / TILE);
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (!isSolid(level, col, row)) continue;
      const cx = Math.max(col * TILE, Math.min(pos.x, (col + 1) * TILE));
      const cy = Math.max(row * TILE, Math.min(pos.y, (row + 1) * TILE));
      const dx = pos.x - cx;
      const dy = pos.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < radius * radius) {
        const d = Math.sqrt(d2) || 0.001;
        pos.x = cx + (dx / d) * radius;
        pos.y = cy + (dy / d) * radius;
      }
    }
  }
  pos.x = Math.max(radius, Math.min(VIEW_W - radius, pos.x));
  pos.y = Math.max(radius, Math.min(VIEW_H - radius, pos.y));
}

// Line of sight between two points, sampled along the segment.
export function hasLineOfSight(level, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const col = Math.floor((x1 + dx * t) / TILE);
    const row = Math.floor((y1 + dy * t) / TILE);
    if (blocksSight(level, col, row)) return false;
  }
  return true;
}

// Distance from a point to a line segment (for laser crossing checks).
export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
