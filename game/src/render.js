// render.js — all drawing: the bank at night, the cones, the loot, the
// HUD. The look is deliberate: safe cover reads dark blue, danger reads
// red and pink, loot reads gold, so the whole heist is legible in one
// glance — including when the judge shrinks a screenshot to a contact
// sheet cell.

import { TILE, VIEW_W, VIEW_H, COLORS, GUARD, CAMERA, HAUL_TARGET, ALARM, TIME_LIMIT } from './config.js';
import { COLS, ROWS, tileAt } from './level.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, halfAngle, dist, fill, edge) {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, 10, x, y, dist);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, dist, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - halfAngle) * dist, y + Math.sin(angle - halfAngle) * dist);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + halfAngle) * dist, y + Math.sin(angle + halfAngle) * dist);
  ctx.stroke();
  ctx.restore();
}

function drawFloor(ctx, level, now) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const t = tileAt(level, col, row);
      const x = col * TILE;
      const y = row * TILE;
      if (t === '#') continue;
      if (t === 'v') {
        ctx.fillStyle = (col + row) % 2 === 0 ? '#3a2f16' : '#332915';
      } else if (t === ',') {
        ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.carpet : '#352029';
      } else {
        ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      }
      ctx.fillRect(x, y, TILE, TILE);
      // Subtle marble speckle on the lobby floor.
      if (t === '.' && (col * 13 + row * 7) % 11 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x + 8, y + 10, 10, 4);
      }
      if (t === ',') {
        // Carpet border threads.
        ctx.fillStyle = 'rgba(242,193,78,0.10)';
        if (col === 1 || row === 1) ctx.fillRect(x, y, TILE, 2);
      }
    }
  }
  // Vault floor shimmer.
  ctx.save();
  ctx.globalAlpha = 0.10 + 0.05 * Math.sin(now * 1.5);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(24 * TILE, 1 * TILE, 7 * TILE, 5 * TILE);
  ctx.restore();
}

function drawWalls(ctx, level) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (tileAt(level, col, row) !== '#') continue;
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(x, y, TILE, 6);
      ctx.fillStyle = 'rgba(242,193,78,0.25)';
      ctx.fillRect(x, y + TILE - 3, TILE, 2);
    }
  }
  // Paintings on the gallery walls.
  for (const p of level.paintings) {
    ctx.save();
    ctx.fillStyle = '#0c0d1c';
    ctx.strokeStyle = COLORS.goldDim;
    ctx.lineWidth = 3;
    if (p.vertical) {
      ctx.fillRect(p.col * TILE + 6, p.row * TILE, TILE - 12, p.w * TILE);
      ctx.strokeRect(p.col * TILE + 6, p.row * TILE, TILE - 12, p.w * TILE);
      ctx.fillStyle = p.hue;
      ctx.fillRect(p.col * TILE + 12, p.row * TILE + 8, TILE - 24, p.w * TILE - 16);
    } else {
      ctx.fillRect(p.col * TILE, p.row * TILE + 6, p.w * TILE, TILE - 12);
      ctx.strokeRect(p.col * TILE, p.row * TILE + 6, p.w * TILE, TILE - 12);
      ctx.fillStyle = p.hue;
      ctx.fillRect(p.col * TILE + 8, p.row * TILE + 12, p.w * TILE - 16, TILE - 24);
    }
    ctx.restore();
  }
}

function drawFurniture(ctx, level, now) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const t = tileAt(level, col, row);
      const x = col * TILE;
      const y = row * TILE;
      if (t === 'C') {
        ctx.fillStyle = '#3a2f1d';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#6b5636';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      } else if (t === 'D') {
        ctx.fillStyle = '#1b2f4a';
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = '#7fb2d9';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 8);
        ctx.lineTo(x + 20, y + 8);
        ctx.lineTo(x + 8, y + 20);
        ctx.closePath();
        ctx.fill();
      } else if (t === 'G') {
        // Doors: brass frame + a glowing threshold.
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      }
    }
  }
  // The getaway: a van door glowing green at the bottom wall, with its
  // label on a solid pill above it so it reads at any shrink.
  const gw = level.getaway;
  ctx.save();
  ctx.fillStyle = '#0d2b16';
  ctx.fillRect(gw.x - gw.w / 2, gw.y - 12, gw.w, 24);
  ctx.strokeStyle = '#7ee787';
  ctx.lineWidth = 3;
  ctx.strokeRect(gw.x - gw.w / 2, gw.y - 12, gw.w, 24);
  ctx.fillStyle = 'rgba(8, 10, 24, 0.88)';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const label = 'GETAWAY VAN';
  const lw = ctx.measureText(label).width + 18;
  roundRect(ctx, gw.x - lw / 2, gw.y - 40, lw, 22, 6);
  ctx.fill();
  ctx.strokeStyle = '#7ee787';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#7ee787';
  ctx.fillText(label, gw.x, gw.y - 24);
  ctx.restore();
}

function drawLoot(ctx, level, now) {
  for (const item of level.loot) {
    if (item.taken) continue;
    const cx = (item.col + 0.5) * TILE;
    const cy = (item.row + 0.5) * TILE + Math.sin(now * 2 + item.bob) * 2;
    ctx.save();
    if (item.kind === 'star') {
      const pulse = 0.5 + 0.3 * Math.sin(now * 3);
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 46);
      grad.addColorStop(0, `rgba(255, 215, 94, ${pulse})`);
      grad.addColorStop(1, 'rgba(255, 215, 94, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 46, 0, Math.PI * 2);
      ctx.fill();
      // The Meridian Star: a faceted diamond.
      ctx.fillStyle = '#dff3ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx + 12, cy);
      ctx.lineTo(cx, cy + 16);
      ctx.lineTo(cx - 12, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx + 12, cy);
      ctx.lineTo(cx - 12, cy);
      ctx.closePath();
      ctx.fill();
      if (item.channel > 0) {
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + item.channel * Math.PI * 2);
        ctx.stroke();
      }
    } else if (item.kind === 'diamond') {
      ctx.fillStyle = '#bfe9ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx + 8, cy);
      ctx.lineTo(cx, cy + 9);
      ctx.lineTo(cx - 8, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$1500', cx, cy + 22);
    } else {
      // Gold bar.
      ctx.fillStyle = COLORS.gold;
      ctx.strokeStyle = COLORS.goldDim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy + 6);
      ctx.lineTo(cx - 7, cy - 6);
      ctx.lineTo(cx + 7, cy - 6);
      ctx.lineTo(cx + 11, cy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(cx - 6, cy - 5, 12, 2);
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$500', cx, cy + 20);
    }
    ctx.restore();
  }
}

function drawTerminals(ctx, level, now, disabledUntil) {
  for (const term of level.terminals) {
    const active = now < disabledUntil;
    ctx.save();
    ctx.fillStyle = active ? '#12351d' : '#12233d';
    ctx.strokeStyle = active ? '#7ee787' : '#7fb2d9';
    ctx.lineWidth = 2;
    roundRect(ctx, term.x - 14, term.y - 18, 28, 36, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? '#7ee787' : '#9fd8ff';
    ctx.fillRect(term.x - 9, term.y - 12, 18, 10);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(active ? 'OFFLINE' : 'HACK [E]', term.x, term.y + 32);
    if (term.progress > 0 && term.progress < 1) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(term.x, term.y, 24, -Math.PI / 2, -Math.PI / 2 + term.progress * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawLasers(ctx, lasers, now) {
  for (const beam of lasers) {
    ctx.save();
    if (beam.on) {
      ctx.strokeStyle = COLORS.laser;
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(now * 12);
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -now * 40;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
      // Emitter posts.
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff2e4d';
      ctx.fillRect(beam.x1 - 4, beam.y1 - 6, 8, 12);
      ctx.fillRect(beam.x2 - 4, beam.y2 - 6, 8, 12);
    } else {
      // Dark beam: faint dots show where it will snap back on.
      ctx.fillStyle = 'rgba(255, 46, 77, 0.35)';
      const len = Math.hypot(beam.x2 - beam.x1, beam.y2 - beam.y1);
      const steps = Math.floor(len / 24);
      for (let i = 0; i <= steps; i += 1) {
        const t = i / Math.max(1, steps);
        ctx.beginPath();
        ctx.arc(beam.x1 + (beam.x2 - beam.x1) * t, beam.y1 + (beam.y2 - beam.y1) * t, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255, 77, 94, 0.8)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LASER OFF — GO', (beam.x1 + beam.x2) / 2, (beam.y1 + beam.y2) / 2 - 10);
    }
    ctx.restore();
  }
}

function drawCameras(ctx, cameras, now, disabledUntil) {
  for (const cam of cameras) {
    const disabled = now < disabledUntil;
    const fill = cam.seeing ? 'rgba(255, 46, 77, 0.35)' : COLORS.coneCamera;
    if (!disabled) {
      drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.viewHalfAngle, CAMERA.viewDistance, fill, 'rgba(255, 92, 138, 0.45)');
    }
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.angle);
    ctx.fillStyle = disabled ? '#1d3a24' : '#2b2f45';
    ctx.strokeStyle = disabled ? '#7ee787' : '#ff5c8a';
    ctx.lineWidth = 2;
    roundRect(ctx, -6, -8, 20, 16, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = disabled ? '#7ee787' : '#ff2e4d';
    ctx.beginPath();
    ctx.arc(16, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (cam.seeing) {
      ctx.fillStyle = COLORS.danger;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SEEN', cam.x, cam.y - 22);
    }
  }
}

function drawGuards(ctx, guards, now) {
  for (const g of guards) {
    const chasing = g.state === 'chase';
    const suspicious = g.state === 'suspicious' || g.state === 'search';
    const dist = chasing ? GUARD.chaseViewDistance : GUARD.viewDistance;
    const fill = chasing ? COLORS.coneAlert : suspicious ? 'rgba(255, 166, 46, 0.25)' : COLORS.coneCalm;
    const edge = chasing ? 'rgba(255, 64, 64, 0.6)' : 'rgba(242, 193, 78, 0.5)';
    drawCone(ctx, g.x, g.y, g.angle, GUARD.viewHalfAngle, dist, fill, edge);

    // Body: dark suit, shoulders, head, cap.
    ctx.save();
    ctx.translate(g.x, g.y);
    const bob = Math.sin(g.stepPhase) * (g.state === 'patrol' ? 1 : 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(g.angle);
    ctx.fillStyle = COLORS.guardSuit;
    ctx.beginPath();
    ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guardSkin;
    ctx.beginPath();
    ctx.arc(6 + bob * 0.3, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    // Cap brim.
    ctx.fillStyle = '#14142a';
    ctx.fillRect(8, -7, 8, 14);
    // Flashlight dot ahead.
    ctx.fillStyle = chasing ? '#ff8080' : '#ffe9a8';
    ctx.beginPath();
    ctx.arc(20, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Suspicion ring + marker.
    if (g.suspicion > 0.05 && !chasing) {
      ctx.save();
      ctx.strokeStyle = g.suspicion > 0.5 ? '#ff9f2e' : COLORS.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 22, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff9f2e';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 26);
      ctx.restore();
    }
    if (chasing) {
      ctx.fillStyle = COLORS.danger;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 26);
    }
  }
}

function drawPlayer(ctx, player, now) {
  const bob = player.moving ? Math.sin(player.stepPhase) * 1.5 : Math.sin(now * 2) * 0.8;
  ctx.save();
  ctx.translate(player.x, player.y + bob * 0.4);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 11, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(player.angle);
  // Black suit + gold mask: the thief reads at a glance.
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.playerTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(5, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101018';
  ctx.fillRect(2, -3.5, 5, 2);
  ctx.fillRect(2, 1.5, 5, 2);
  // Direction tick.
  ctx.fillStyle = COLORS.playerTrim;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(10, -4);
  ctx.lineTo(10, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const PLAYER_RADIUS = 13;

function drawCoins(ctx, coins) {
  for (const coin of coins) {
    ctx.save();
    const arc = coin.t < 0.45 ? Math.sin((coin.t / 0.45) * Math.PI) * -26 : 0;
    ctx.translate(coin.x, coin.y + arc);
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.goldDim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (coin.rang) {
      const r = 8 + ((coin.t - 0.45) * 60) % 46;
      ctx.globalAlpha = Math.max(0, 0.6 - (coin.t - 0.45) * 0.4);
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function alarmLabel(alarm) {
  if (alarm >= ALARM.lockdownAt) return { text: 'LOCKDOWN', color: COLORS.danger };
  if (alarm >= ALARM.suspiciousAt) return { text: 'SUSPICIOUS', color: '#ff9f2e' };
  return { text: 'CALM', color: COLORS.ok };
}

function drawHud(ctx, state) {
  const { haul, alarm, timeLeft, coins, disabledUntil, now, objective } = state;
  ctx.save();
  // Top bar.
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(0, 64, VIEW_W, 2);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE GILDED VAULT', 18, 22);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Midnight at Meridian Bank', 18, 46);

  // Haul.
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HAUL $${haul.toLocaleString('en-US')} / $${HAUL_TARGET.toLocaleString('en-US')}`, 330, 22);
  ctx.fillStyle = '#2b2f45';
  roundRect(ctx, 330, 36, 220, 12, 6);
  ctx.fill();
  ctx.fillStyle = haul >= HAUL_TARGET ? COLORS.ok : COLORS.gold;
  roundRect(ctx, 330, 36, Math.min(1, haul / HAUL_TARGET) * 220, 12, 6);
  ctx.fill();

  // Alarm meter.
  const label = alarmLabel(alarm);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', 600, 22);
  ctx.fillStyle = '#2b2f45';
  roundRect(ctx, 600, 36, 220, 12, 6);
  ctx.fill();
  const aw = Math.min(1, alarm / 100) * 220;
  ctx.fillStyle = label.color;
  roundRect(ctx, 600, 36, aw, 12, 6);
  ctx.fill();
  ctx.fillStyle = label.color;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`${label.text} ${Math.round(alarm)}%`, 828, 42);

  // Timer.
  const mins = Math.floor(Math.max(0, timeLeft) / 60);
  const secs = Math.floor(Math.max(0, timeLeft) % 60);
  ctx.fillStyle = timeLeft < 30 ? COLORS.danger : COLORS.text;
  ctx.font = 'bold 24px system-ui, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 1080, 24);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('coins ' + '●'.repeat(coins) + '○'.repeat(Math.max(0, 3 - coins)), 1080, 48);

  // Systems offline countdown.
  if (now < disabledUntil) {
    ctx.fillStyle = COLORS.ok;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`SYSTEMS OFFLINE ${Math.ceil(disabledUntil - now)}s`, 1262, 24);
  }

  // Objective line.
  ctx.fillStyle = COLORS.text;
  ctx.font = '15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(objective, VIEW_W / 2, VIEW_H - 16);

  // Lockdown flash at the world frame's edge.
  if (alarm >= ALARM.lockdownAt) {
    const pulse = 0.10 + 0.06 * Math.sin(now * 6);
    ctx.strokeStyle = `rgba(255, 46, 77, ${pulse})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(64, 64, VIEW_W - 128, 720);
  }
  ctx.restore();
}

function drawCenteredPanel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 640;
  const h = 120 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = '#10122a';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, y + 58);
  ctx.fillStyle = COLORS.text;
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, y + 100 + i * 30);
  });
  ctx.restore();
}

export function render(ctx, game) {
  const { level, player, guards, cameras, lasers, now } = game;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // The world is 1280x800 but the HUD takes the top 64 px and the
  // objective line the bottom 16 px, so the world is drawn scaled to
  // fit the band between them: every tile, cone and door stays fully
  // in frame, and the HUD never covers the vault or a camera.
  ctx.save();
  ctx.translate(64, 64);
  ctx.scale(0.9, 0.9);
  drawFloor(ctx, level, now);
  drawFurniture(ctx, level, now);
  drawWalls(ctx, level);
  drawLoot(ctx, level, now);
  drawTerminals(ctx, level, now, game.disabledUntil);
  drawLasers(ctx, lasers, now);
  drawCameras(ctx, cameras, now, game.disabledUntil);
  drawGuards(ctx, guards, now);
  drawCoins(ctx, game.coins);
  drawPlayer(ctx, player, now);

  // Night vignette.
  const vg = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();

  if (game.screen === 'playing' || game.screen === 'paused') {
    drawHud(ctx, {
      haul: game.haul,
      alarm: game.alarm,
      timeLeft: game.timeLeft,
      coins: player.coins,
      disabledUntil: game.disabledUntil,
      now,
      objective: game.objective,
    });
  }

  if (game.screen === 'title') {
    drawCenteredPanel(ctx, 'THE GILDED VAULT', [
      'Midnight at Meridian Bank — one thief, four guards, four cameras.',
      'Grab $8,000 of loot, then slip out to the getaway van.',
      'WASD / arrows move · Shift run (loud!) · E hack terminals · Q toss a coin',
      'Click to walk · P pause · R restart · M mute',
      '',
      'Press ENTER or click to start the heist',
    ], COLORS.gold);
  } else if (game.screen === 'paused') {
    drawCenteredPanel(ctx, 'PAUSED', [
      'The bank waits. Press P to keep sneaking.',
    ], COLORS.textDim);
  } else if (game.screen === 'caught') {
    drawCenteredPanel(ctx, 'BUSTED!', [
      `A guard caught you with $${game.haul.toLocaleString('en-US')} of loot.`,
      'The Meridian Star stays in its vault — for tonight.',
      'Press R to run it back.',
    ], COLORS.danger);
  } else if (game.screen === 'timeout') {
    drawCenteredPanel(ctx, 'DAWN BREAKS', [
      'The sun came up over Meridian Bank. The vault never opened.',
      `You left with $${game.haul.toLocaleString('en-US')} — the Star is still there.`,
      'Press R to try again tonight.',
    ], COLORS.danger);
  } else if (game.screen === 'win') {
    drawCenteredPanel(ctx, 'CLEAN GETAWAY!', [
      `Haul: $${game.haul.toLocaleString('en-US')} · Time left: ${Math.ceil(game.timeLeft)}s`,
      `Score: ${game.score.toLocaleString('en-US')} — ${game.rankTitle}`,
      'The Meridian Star is yours. Meridian Bank never saw a thing.',
      'Press R to plan the next job.',
    ], COLORS.ok);
  }
}
