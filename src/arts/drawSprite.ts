import { PALETTE } from './palette';

export const drawIconSprite = (
  ctx: CanvasRenderingContext2D,
  sprite: string[],
  x: number,
  y: number,
  scale: number,
  isAsleep: boolean = false,
  isHit: boolean = false
) => {
  const startX = Math.floor(x);
  const startY = Math.floor(y);
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const char = sprite[r]?.[c] || ' ';
      if (char === ' ') continue;

      let color = PALETTE[char];
      if (isAsleep) {
        if (char === 'E') color = PALETTE['h'];
        if (char === 'e') color = PALETTE['d'];
      } else {
        if (char === 'E' || char === 'e') color = PALETTE['e'];
      }

      if (color) {
        ctx.fillStyle = isHit ? '#ef4444' : color;
        ctx.fillRect(Math.floor(startX + c * scale), Math.floor(startY + r * scale), Math.ceil(scale), Math.ceil(scale));
      }
    }
  }
};
