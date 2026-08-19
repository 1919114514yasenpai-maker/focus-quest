import React, { useEffect, useRef, useMemo } from 'react';
import { Monster, PlayerItem, JobType } from '../types';
import { WEAPON_SPRITES, ARMOR_SPRITES, drawIconSprite } from '../sprites';
import { getCompiledItem } from '../itemUtils';
import { getDamageMultiplierBonus, getCritChanceBonus } from '../jobUtils';

interface HeroCanvasProps {
  isFocusing: boolean;
  isAsleep: boolean;
  appearanceArmorId: string;
  appearanceWeaponId: string;
  statWeaponId: string;
  statArmorId: string;
  monster: Monster;
  inventory: PlayerItem[];
  job?: JobType;
  hasCurseImmunity?: boolean;
  onAttackMonster: (damage: number, isCrit: boolean, lifestealHeal: number) => void;
  onMonsterDefeated: (monster: Monster) => void;
  onPlayerTakeDamage: (damage: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

const TYPE_COLORS: Record<string, string> = {
  fire: '#ef4444',
  water: '#3b82f6',
  thunder: '#eab308',
  light: '#f8fafc',
  dark: '#1e293b',
  none: '#fbbf24',
};

export const HeroCanvasComponent: React.FC<HeroCanvasProps> = ({
  isFocusing,
  isAsleep,
  appearanceArmorId,
  appearanceWeaponId,
  statWeaponId,
  statArmorId,
  monster,
  inventory,
  job,
  hasCurseImmunity,
  onAttackMonster,
  onMonsterDefeated,
  onPlayerTakeDamage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectiveJob: JobType = (job || 'balanced') as JobType;

  // Pre-calculate compiled items & bonuses OUTSIDE the 60fps loop for high performance
  const combatStats = useMemo(() => {
    const weaponItem = getCompiledItem(inventory.find(i => i.uid === statWeaponId), hasCurseImmunity);
    const armorItem = getCompiledItem(inventory.find(i => i.uid === statArmorId), hasCurseImmunity);

    const jobDmgBonus = getDamageMultiplierBonus(effectiveJob, isFocusing);
    const jobCritBonus = getCritChanceBonus(effectiveJob);

    const weaponPower = weaponItem?.power || 1;
    const armorPower = armorItem?.power || 1;
    const critChance = Math.min(1.0, (weaponItem?.effect?.critChance || 0) + (armorItem?.effect?.critChance || 0) + jobCritBonus);
    const lifesteal = Math.min(1.0, (weaponItem?.effect?.lifesteal || 0) + (armorItem?.effect?.lifesteal || 0));
    const enemySlowRate = Math.min(0.90, (weaponItem?.effect?.enemySlowRate || 0) + (armorItem?.effect?.enemySlowRate || 0));
    const elementalDamage = (weaponItem?.effect?.elementalDamage || 0) + (armorItem?.effect?.elementalDamage || 0);
    const elementalType = weaponItem?.effect?.elementalType || armorItem?.effect?.elementalType || 'none';

    const baseDmgMult = 1 + (weaponItem?.effect?.damageMultiplier || 0) + (armorItem?.effect?.damageMultiplier || 0) + jobDmgBonus;
    const dmgMult = Math.max(0.1, baseDmgMult);
    const monsterAttackInterval = Math.max(50, Math.floor(50 * (1 + enemySlowRate * 1.5)));

    return {
      weaponPower,
      armorPower,
      critChance,
      lifesteal,
      enemySlowRate,
      elementalDamage,
      elementalType,
      dmgMult,
      monsterAttackInterval,
    };
  }, [inventory, statWeaponId, statArmorId, effectiveJob, hasCurseImmunity, isFocusing]);

  // Keep latest mutable props and cached stats in ref without triggering canvas remount
  const propsRef = useRef({
    isFocusing,
    isAsleep,
    monster,
    combatStats,
    onAttackMonster,
    onMonsterDefeated,
    onPlayerTakeDamage,
  });

  useEffect(() => {
    propsRef.current = {
      isFocusing,
      isAsleep,
      monster,
      combatStats,
      onAttackMonster,
      onMonsterDefeated,
      onPlayerTakeDamage,
    };
  }, [isFocusing, isAsleep, monster, combatStats, onAttackMonster, onMonsterDefeated, onPlayerTakeDamage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let animationFrameId: number;
    let elapsed = 0;

    let currentEnemyHp = monster.maxHp;
    let enemyHitTimer = 0;
    let playerHitTimer = 0;
    let screenShake = 0;
    let enemyX = 520;
    let particles: Particle[] = [];
    let floatTexts: FloatingText[] = [];
    let textIdCounter = 0;
    let slashTimer = 0;

    let lastMonsterId = monster.id;

    // Responsive canvas dimension sync
    const updateCanvasDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const dWidth = Math.floor(rect.width);
        const dHeight = Math.floor(rect.height);
        if (canvas.width !== dWidth || canvas.height !== dHeight) {
          canvas.width = dWidth;
          canvas.height = dHeight;
          ctx.imageSmoothingEnabled = false;
        }
      }
    };
    updateCanvasDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasDimensions();
    });
    resizeObserver.observe(canvas);

    const spawnParticles = (x: number, y: number, color: string, count = 10) => {
      // Keep particle count bounded to prevent lag
      if (particles.length > 40) {
        particles.splice(0, particles.length - 30);
      }
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          color,
          size: Math.floor(Math.random() * 2 + 2),
          life: 0,
          maxLife: 16 + Math.random() * 10,
        });
      }
    };

    const addFloatingText = (text: string, x: number, y: number, color: string) => {
      if (floatTexts.length > 8) {
        floatTexts.shift();
      }
      floatTexts.push({
        id: ++textIdCounter,
        text,
        x,
        y,
        color,
        life: 0,
        maxLife: 35,
      });
    };

    const draw = () => {
      elapsed += 1;
      const {
        isFocusing,
        isAsleep,
        monster: currentMonster,
        combatStats: cStats,
        onAttackMonster,
        onMonsterDefeated,
        onPlayerTakeDamage,
      } = propsRef.current;

      const groundY = canvas.height - 70;
      const heroX = 180;
      const heroY = groundY;

      if (lastMonsterId !== currentMonster.id) {
        lastMonsterId = currentMonster.id;
        currentEnemyHp = currentMonster.maxHp;
        enemyX = canvas.width + 100;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = 4;
      const isRunning = isFocusing && !isAsleep;

      ctx.save();
      if (screenShake > 0) {
        screenShake--;
        const shakeX = (Math.random() - 0.5) * 6;
        const shakeY = (Math.random() - 0.5) * 6;
        ctx.translate(shakeX, shakeY);
      }

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.7, '#111827');
      grad.addColorStop(1, '#1f2937');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      for (let i = 0; i < 20; i++) {
        const x = (i * 137 + elapsed * (isRunning ? 1.5 : 0.2)) % canvas.width;
        const y = (i * 73) % (canvas.height - 80);
        const starSize = (i % 3 === 0) ? 3 : 2;
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#f59e0b';
        ctx.fillRect(Math.floor(x), Math.floor(y), starSize, starSize);
      }

      // Ground
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, groundY, canvas.width, 70);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();

      const scrollOffset = (elapsed * (isRunning ? 4 : 0.5)) % 32;
      ctx.fillStyle = '#1e293b';
      for (let x = -scrollOffset; x < canvas.width; x += 32) {
        ctx.fillRect(Math.floor(x), groundY + 4, 16, 4);
        ctx.fillRect(Math.floor(x + 16), groundY + 24, 16, 4);
      }

      // Animation calculation
      const walkCycle = isRunning ? Math.sin(elapsed * 0.25) : 0;
      const bounceY = Math.abs(walkCycle) * 4 * scale;
      const attackCycle = isRunning ? (elapsed % 30) : 0;
      const isAttacking = isRunning && attackCycle > 18;

      // Spotlight glow
      const glow = ctx.createRadialGradient(heroX, heroY - 30, 0, heroX, heroY - 30, 130);
      glow.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fast combat logic reading precomputed stats
      if (isRunning) {
        if (enemyX > heroX + 60) {
          enemyX -= 3;
        } else {
          enemyX = heroX + 60;
        }

        if (cStats.enemySlowRate > 0 && enemyX <= heroX + 80 && currentEnemyHp > 0) {
          if (elapsed % 15 === 0) {
            spawnParticles(
              enemyX + 20 + (Math.random() - 0.5) * 20,
              heroY - 30 + (Math.random() - 0.5) * 20,
              '#22c55e',
              2
            );
          }
          if (elapsed % 90 === 0) {
            addFloatingText(`🕸️ 攻撃速度-${Math.round(cStats.enemySlowRate * 100)}%`, enemyX, heroY - 70, '#4ade80');
          }
        }

        // Hero Attack
        if (attackCycle === 22 && enemyX <= heroX + 65) {
          enemyHitTimer = 10;
          slashTimer = 12;

          const isCrit = Math.random() < Math.max(0.01, 0.1 + cStats.critChance);
          const rawDmg = 12 + cStats.weaponPower * 5 + Math.floor(Math.random() * 8);
          const baseDmg = Math.floor(rawDmg * cStats.dmgMult) + cStats.elementalDamage;
          const damage = isCrit ? Math.floor(baseDmg * 2.2) : baseDmg;
          const lifestealHeal = cStats.lifesteal > 0 ? Math.floor(damage * cStats.lifesteal) : 0;

          currentEnemyHp = Math.max(0, currentEnemyHp - damage);

          const dmgColor = cStats.elementalDamage > 0 && cStats.elementalType !== 'none'
            ? (TYPE_COLORS[cStats.elementalType] || '#fbbf24')
            : '#fbbf24';

          spawnParticles(enemyX + 20, heroY - 40, isCrit ? '#f43f5e' : dmgColor, isCrit ? 16 : 10);
          addFloatingText(isCrit ? `CRITICAL! -${damage}` : `-${damage}`, enemyX + 10, heroY - 60, isCrit ? '#f43f5e' : dmgColor);

          if (lifestealHeal > 0) {
            addFloatingText(`+${lifestealHeal} HP`, heroX - 10, heroY - 65, '#22c55e');
          }

          onAttackMonster(damage, isCrit, lifestealHeal);

          if (currentEnemyHp <= 0) {
            spawnParticles(enemyX + 20, heroY - 40, '#a855f7', 25);
            addFloatingText('討伐成功!', enemyX, heroY - 80, '#38bdf8');
            addFloatingText(`+${currentMonster.xpReward} EXP`, heroX, heroY - 80, '#38bdf8');
            addFloatingText(`+${currentMonster.goldReward} G`, heroX + 20, heroY - 95, '#f59e0b');

            onMonsterDefeated(currentMonster);
            enemyX = canvas.width + 100;
          }
        }

        // Monster Attack
        if (elapsed % cStats.monsterAttackInterval === 0 && enemyX <= heroX + 65 && currentEnemyHp > 0) {
          const rawMonsterAtk = currentMonster.attack;
          const netDamage = Math.max(1, rawMonsterAtk - Math.floor(cStats.armorPower * 0.8));

          playerHitTimer = 12;
          screenShake = 6;
          spawnParticles(heroX, heroY - 30, '#ef4444', 8);
          addFloatingText(`-${netDamage}`, heroX - 10, heroY - 50, '#ef4444');

          onPlayerTakeDamage(netDamage);
        }
      } else {
        enemyX = canvas.width + 100;
      }

      // Draw Monster
      if (enemyX < canvas.width + 50) {
        drawPixelMonster(
          ctx,
          enemyX,
          heroY,
          scale,
          elapsed,
          enemyHitTimer > 0,
          currentEnemyHp,
          currentMonster.maxHp,
          currentMonster
        );
      }
      if (enemyHitTimer > 0) enemyHitTimer--;
      if (playerHitTimer > 0) playerHitTimer--;

      // Draw Hero
      ctx.save();
      ctx.translate(heroX, heroY);

      drawDetailedPixelHero(
        ctx,
        scale,
        bounceY,
        isAsleep,
        walkCycle,
        appearanceArmorId,
        playerHitTimer > 0
      );

      let weaponAngle = Math.PI / 4;
      if (isAttacking) {
        weaponAngle = Math.PI / 1.5;
      } else if (isRunning) {
        weaponAngle = Math.PI / 4 + Math.sin(elapsed * 0.15) * 0.2;
      }

      if (!isAsleep) {
        drawDetailedPixelWeapon(ctx, scale, bounceY, weaponAngle, appearanceWeaponId);
      }

      if (slashTimer > 0 && isRunning) {
        slashTimer--;
        drawSlashEffect(ctx, scale, bounceY);
      }

      if (isAsleep) {
        drawZzzEffects(ctx, scale, elapsed);
      }

      ctx.restore();

      // Render & Update Particles
      let pLen = particles.length;
      let pWriteIdx = 0;
      for (let i = 0; i < pLen; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.life++;
        if (p.life < p.maxLife) {
          const alpha = 1 - p.life / p.maxLife;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
          particles[pWriteIdx++] = p;
        }
      }
      particles.length = pWriteIdx;
      ctx.globalAlpha = 1;

      // Render & Update Floating Texts
      let ftLen = floatTexts.length;
      let ftWriteIdx = 0;
      ctx.font = 'bold 13px "DotGothic16", monospace';
      for (let i = 0; i < ftLen; i++) {
        const ft = floatTexts[i];
        ft.y -= 1.2;
        ft.life++;
        if (ft.life < ft.maxLife) {
          const alpha = 1 - ft.life / ft.maxLife;
          ctx.fillStyle = ft.color;
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.fillText(ft.text, Math.floor(ft.x), Math.floor(ft.y));
          floatTexts[ftWriteIdx++] = ft;
        }
      }
      floatTexts.length = ftWriteIdx;
      ctx.globalAlpha = 1;

      ctx.restore();

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [appearanceArmorId, appearanceWeaponId]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block rounded-lg pixel-panel"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export const HeroCanvas = React.memo(HeroCanvasComponent);

// Pixel drawing helpers
function drawDetailedPixelHero(
  ctx: CanvasRenderingContext2D,
  scale: number,
  bounceY: number,
  isAsleep: boolean,
  walkCycle: number,
  armorId: string,
  isHit: boolean
) {
  const oy = -bounceY;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 2, (14 * scale) / 2, (3 * scale) / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const armorSprite = ARMOR_SPRITES[armorId] || ARMOR_SPRITES['a_cloth'];
  drawIconSprite(ctx, armorSprite, -8 * scale, oy - 16 * scale, scale, isAsleep, isHit);
}

function drawDetailedPixelWeapon(
  ctx: CanvasRenderingContext2D,
  scale: number,
  bounceY: number,
  angle: number,
  weaponId: string
) {
  ctx.save();
  ctx.translate(6 * scale, -8 * scale - bounceY);
  ctx.rotate(angle);

  const weaponSprite = WEAPON_SPRITES[weaponId] || WEAPON_SPRITES['w_wood_sword'];
  drawIconSprite(ctx, weaponSprite, -8 * scale, -14 * scale, scale);

  ctx.restore();
}

function drawPixelMonster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  elapsed: number,
  isHit: boolean,
  hp: number,
  maxHp: number,
  monster: Monster
) {
  ctx.save();
  ctx.translate(x, y);

  const floatY = Math.sin(elapsed * 0.1) * 3 * scale;
  const oy = -18 * scale + floatY;
  const bodyColor = isHit ? '#ffffff' : monster.color;

  if (monster.spriteType === 'slime') {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-6 * scale, oy + 4 * scale, 12 * scale, 8 * scale);
    ctx.fillRect(-8 * scale, oy + 6 * scale, 16 * scale, 5 * scale);
    ctx.fillRect(-4 * scale, oy + 2 * scale, 8 * scale, 2 * scale);

    ctx.fillStyle = '#000000';
    ctx.fillRect(-4 * scale, oy + 5 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(2 * scale, oy + 5 * scale, 2 * scale, 2 * scale);
  } else if (monster.spriteType === 'goblin') {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-5 * scale, oy, 10 * scale, 8 * scale);
    ctx.fillRect(-8 * scale, oy - 2 * scale, 3 * scale, 4 * scale);
    ctx.fillRect(5 * scale, oy - 2 * scale, 3 * scale, 4 * scale);

    ctx.fillStyle = '#991b1b';
    ctx.fillRect(-4 * scale, oy + 8 * scale, 8 * scale, 8 * scale);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3 * scale, oy + 2 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(1 * scale, oy + 2 * scale, 2 * scale, 2 * scale);
  } else if (monster.spriteType === 'orc') {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-8 * scale, oy - 4 * scale, 16 * scale, 12 * scale);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-7 * scale, oy + 8 * scale, 14 * scale, 10 * scale);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-5 * scale, oy + 1 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(3 * scale, oy + 1 * scale, 2 * scale, 2 * scale);
  } else if (monster.spriteType === 'demon') {
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-6 * scale, oy - 6 * scale, 3 * scale, 5 * scale);
    ctx.fillRect(3 * scale, oy - 6 * scale, 3 * scale, 5 * scale);

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-7 * scale, oy - 2 * scale, 14 * scale, 18 * scale);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-4 * scale, oy + 2 * scale, 3 * scale, 3 * scale);
    ctx.fillRect(1 * scale, oy + 2 * scale, 3 * scale, 3 * scale);
  } else {
    // dragon
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-10 * scale, oy - 6 * scale, 20 * scale, 22 * scale);
    ctx.fillRect(-14 * scale, oy - 12 * scale, 5 * scale, 10 * scale);
    ctx.fillRect(9 * scale, oy - 12 * scale, 5 * scale, 10 * scale);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(-6 * scale, oy + 2 * scale, 3 * scale, 3 * scale);
    ctx.fillRect(3 * scale, oy + 2 * scale, 3 * scale, 3 * scale);
  }

  // HP Bar
  const hpBarW = 20 * scale;
  const hpBarH = 3 * scale;
  const hpRatio = Math.max(0, Math.min(1, hp / maxHp));

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-hpBarW / 2, oy - 8 * scale, hpBarW, hpBarH);

  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.2 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(-hpBarW / 2 + 1, oy - 8 * scale + 1, (hpBarW - 2) * hpRatio, hpBarH - 2);

  ctx.restore();
}

function drawSlashEffect(ctx: CanvasRenderingContext2D, scale: number, bounceY: number) {
  ctx.save();
  ctx.translate(22 * scale, -10 * scale - bounceY);
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.arc(0, 0, 14 * scale, -Math.PI / 4, Math.PI / 4);
  ctx.stroke();
  ctx.restore();
}

function drawZzzEffects(ctx: CanvasRenderingContext2D, scale: number, elapsed: number) {
  const zzzOffset = (elapsed * 0.05) % 1;
  ctx.font = 'bold 16px "DotGothic16", monospace';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('z', 6 * scale + zzzOffset * 8, -18 * scale - zzzOffset * 20);
  ctx.font = 'bold 20px "DotGothic16", monospace';
  ctx.fillText('Z', 12 * scale + zzzOffset * 10, -26 * scale - zzzOffset * 22);
}
