import React, { useEffect, useRef } from 'react';
import { GameItem, Monster, PlayerItem, JobType } from '../types';
import { ITEMS } from '../gameData';
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

export const HeroCanvas: React.FC<HeroCanvasProps> = ({
  isFocusing,
  isAsleep,
  appearanceArmorId,
  appearanceWeaponId,
  statWeaponId,
  statArmorId,
  monster,
  inventory,
  job = 'balanced',
  onAttackMonster,
  onMonsterDefeated,
  onPlayerTakeDamage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ステータスと特殊効果の参照を常に最新に保持するRef
  const propsRef = useRef({
    isFocusing,
    isAsleep,
    statWeaponId,
    statArmorId,
    monster,
    inventory,
    job,
    onAttackMonster,
    onMonsterDefeated,
    onPlayerTakeDamage,
  });

  useEffect(() => {
    propsRef.current = {
      isFocusing,
      isAsleep,
      statWeaponId,
      statArmorId,
      monster,
      inventory,
      job,
      onAttackMonster,
      onMonsterDefeated,
      onPlayerTakeDamage,
    };
  }, [isFocusing, isAsleep, statWeaponId, statArmorId, monster, inventory, job, onAttackMonster, onMonsterDefeated, onPlayerTakeDamage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let elapsed = 0;

    // 戦闘状態
    let currentEnemyHp = monster.maxHp;
    let enemyHitTimer = 0;
    let playerHitTimer = 0;
    let screenShake = 0;
    let enemyX = 520;
    let particles: Particle[] = [];
    let floatTexts: FloatingText[] = [];
    let textIdCounter = 0;
    let slashTimer = 0;

    // モンスター変更検知
    let lastMonsterId = monster.id;

    // キャンバスサイズのレスポンシブ同期
    const updateCanvasDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const dWidth = Math.floor(rect.width);
        const dHeight = Math.floor(rect.height);
        if (canvas.width !== dWidth || canvas.height !== dHeight) {
          canvas.width = dWidth;
          canvas.height = dHeight;
        }
      }
    };
    updateCanvasDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasDimensions();
    });
    resizeObserver.observe(canvas);

    const spawnParticles = (x: number, y: number, color: string, count = 12) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          color,
          size: Math.floor(Math.random() * 3 + 2),
          life: 0,
          maxLife: 20 + Math.random() * 15,
        });
      }
    };

    const addFloatingText = (text: string, x: number, y: number, color: string) => {
      floatTexts.push({
        id: ++textIdCounter,
        text,
        x,
        y,
        color,
        life: 0,
        maxLife: 40,
      });
    };

    const draw = () => {
      elapsed += 1;
      const { isFocusing, isAsleep, statWeaponId, statArmorId, monster: currentMonster, onAttackMonster, onMonsterDefeated, onPlayerTakeDamage } = propsRef.current;

      // モンスター切り替え時のリセット
      if (lastMonsterId !== currentMonster.id) {
        lastMonsterId = currentMonster.id;
        currentEnemyHp = currentMonster.maxHp;
        enemyX = canvas.width + 80;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = 4;
      const isRunning = isFocusing && !isAsleep;

      // 画面揺れ変換
      ctx.save();
      if (screenShake > 0) {
        screenShake--;
        const shakeX = (Math.random() - 0.5) * 8;
        const shakeY = (Math.random() - 0.5) * 8;
        ctx.translate(shakeX, shakeY);
      }

      // 1. 深淵・ダンジョンの背景
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.7, '#111827');
      grad.addColorStop(1, '#1f2937');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. 星屑/浮遊粒子
      for (let i = 0; i < 25; i++) {
        const x = (i * 137 + elapsed * (isRunning ? 1.5 : 0.2)) % canvas.width;
        const y = (i * 73) % (canvas.height - 80);
        const starSize = (i % 3 === 0) ? 3 : 2;
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#f59e0b';
        ctx.fillRect(Math.floor(x), Math.floor(y), starSize, starSize);
      }

      // 3. 地面
      const groundY = canvas.height - 70;
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

      const heroX = 180;
      const heroY = groundY;

      // アニメーション計算
      const walkCycle = isRunning ? Math.sin(elapsed * 0.25) : 0;
      const bounceY = Math.abs(walkCycle) * 4 * scale;
      const attackCycle = isRunning ? (elapsed % 30) : 0;
      const isAttacking = isRunning && attackCycle > 18;

      // スポットライト
      const glow = ctx.createRadialGradient(heroX, heroY - 30, 0, heroX, heroY - 30, 140);
      glow.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 装備効果と職業効果の取得
      const { inventory, job: currentJob } = propsRef.current;
      const weaponItem = getCompiledItem(inventory.find(i => i.uid === statWeaponId));
      const armorItem = getCompiledItem(inventory.find(i => i.uid === statArmorId));

      const jobDmgBonus = getDamageMultiplierBonus(currentJob, isFocusing);
      const jobCritBonus = getCritChanceBonus(currentJob);

      const weaponPower = weaponItem?.power || 1;
      const armorPower = armorItem?.power || 1;
      const critChance = Math.min(1.0, (weaponItem?.effect?.critChance || 0) + (armorItem?.effect?.critChance || 0) + jobCritBonus);
      const lifesteal = Math.min(1.0, (weaponItem?.effect?.lifesteal || 0) + (armorItem?.effect?.lifesteal || 0));
      const enemySlowRate = Math.min(0.90, (weaponItem?.effect?.enemySlowRate || 0) + (armorItem?.effect?.enemySlowRate || 0));

      // 呪い等によるダメージ倍率補正 + 職業ダメージボーナス
      const baseDmgMult = 1 + (weaponItem?.effect?.damageMultiplier || 0) + (armorItem?.effect?.damageMultiplier || 0) + jobDmgBonus;
      const dmgMult = Math.max(0.1, baseDmgMult);

      // 敵の攻撃間隔 (標準50フレーム、敵攻撃速度低下時に間隔が延びる)
      const monsterAttackInterval = Math.max(50, Math.floor(50 * (1 + enemySlowRate * 1.5)));

      // 敵移動 & 攻撃ロジック
      if (isRunning) {
        if (enemyX > heroX + 60) {
          enemyX -= 3;
        } else {
          enemyX = heroX + 60;
        }

        // 粘り属性(スロー効果)の視覚エフェクト
        if (enemySlowRate > 0 && enemyX <= heroX + 80 && currentEnemyHp > 0) {
          if (elapsed % 12 === 0) {
            spawnParticles(
              enemyX + 20 + (Math.random() - 0.5) * 20, 
              heroY - 30 + (Math.random() - 0.5) * 20, 
              '#22c55e', 
              3
            );
          }
          if (elapsed % 90 === 0) {
            addFloatingText(`🕸️ 攻撃速度-${Math.round(enemySlowRate * 100)}%`, enemyX, heroY - 70, '#4ade80');
          }
        }

        // 勇者の攻撃（30フレーム毎）
        if (attackCycle === 22 && enemyX <= heroX + 65) {
          enemyHitTimer = 10;
          slashTimer = 12;

          const isCrit = Math.random() < Math.max(0.01, 0.1 + critChance);
          const rawDmg = 12 + weaponPower * 5 + Math.floor(Math.random() * 8);
          const baseDmg = Math.floor(rawDmg * dmgMult);
          const damage = isCrit ? Math.floor(baseDmg * 2.2) : baseDmg;
          const lifestealHeal = lifesteal > 0 ? Math.floor(damage * lifesteal) : 0;

          currentEnemyHp = Math.max(0, currentEnemyHp - damage);

          spawnParticles(enemyX + 20, heroY - 40, isCrit ? '#f43f5e' : '#fbbf24', isCrit ? 20 : 12);
          addFloatingText(isCrit ? `CRITICAL! -${damage}` : `-${damage}`, enemyX + 10, heroY - 60, isCrit ? '#f43f5e' : '#fbbf24');

          if (lifestealHeal > 0) {
            addFloatingText(`+${lifestealHeal} HP`, heroX - 10, heroY - 65, '#22c55e');
          }

          onAttackMonster(damage, isCrit, lifestealHeal);

          // 敵撃破チェック
          if (currentEnemyHp <= 0) {
            spawnParticles(enemyX + 20, heroY - 40, '#a855f7', 35);
            addFloatingText(`討伐成功!`, enemyX, heroY - 80, '#38bdf8');
            addFloatingText(`+${currentMonster.xpReward} EXP`, heroX, heroY - 80, '#38bdf8');
            addFloatingText(`+${currentMonster.goldReward} G`, heroX + 20, heroY - 95, '#f59e0b');

            onMonsterDefeated(currentMonster);
            enemyX = canvas.width + 100; // 次の敵へ
          }
        }

        // 敵からの反撃 (monsterAttackInterval毎)
        if (elapsed % monsterAttackInterval === 0 && enemyX <= heroX + 65 && currentEnemyHp > 0) {
          const rawMonsterAtk = currentMonster.attack;
          const netDamage = Math.max(1, rawMonsterAtk - Math.floor(armorPower * 0.8));

          playerHitTimer = 12;
          screenShake = 8;
          spawnParticles(heroX, heroY - 30, '#ef4444', 10);
          addFloatingText(`-${netDamage}`, heroX - 10, heroY - 50, '#ef4444');

          onPlayerTakeDamage(netDamage);
        }
      } else {
        enemyX = canvas.width + 100;
      }

      // 敵の描画
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

      // 勇者描画
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

      // 武器 & 斬撃
      let weaponAngle = Math.PI / 4; // 待機時は45度
      if (isAttacking) {
        weaponAngle = Math.PI / 1.5; // 攻撃時は振り下ろす
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

      // パーティクル更新 & 描画
      particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.life++;
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        ctx.globalAlpha = 1;
        return p.life < p.maxLife;
      });

      // フローティングテキスト更新 & 描画
      floatTexts = floatTexts.filter(ft => {
        ft.y -= 1.2;
        ft.life++;
        const alpha = 1 - ft.life / ft.maxLife;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = 'bold 14px "DotGothic16", monospace';
        ctx.fillText(ft.text, Math.floor(ft.x), Math.floor(ft.y));
        ctx.globalAlpha = 1;
        return ft.life < ft.maxLife;
      });

      ctx.restore(); // screenShakeの終了

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

// --- 精巧なドット絵勇者描画 ---
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

  // 影
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 14 * scale / 2, 3 * scale / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const armorSprite = ARMOR_SPRITES[armorId] || ARMOR_SPRITES['a_cloth'];
  // Hero Sprite bounds: centered at 0, Y from oy-16*scale to oy
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
  // We center the weapon handle. The handle is roughly at the bottom.
  // Assuming 16x16, the handle is around (8, 14).
  drawIconSprite(ctx, weaponSprite, -8 * scale, -14 * scale, scale);

  ctx.restore();
}

// --- タイプ別モンスター描画（スライム/ゴブリン/オーク/デビル/ドラゴン） ---
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
    // スライム
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-6 * scale, oy + 4 * scale, 12 * scale, 8 * scale);
    ctx.fillRect(-8 * scale, oy + 6 * scale, 16 * scale, 5 * scale);
    ctx.fillRect(-4 * scale, oy + 2 * scale, 8 * scale, 2 * scale);

    ctx.fillStyle = '#000000';
    ctx.fillRect(-4 * scale, oy + 5 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(2 * scale, oy + 5 * scale, 2 * scale, 2 * scale);
  } else if (monster.spriteType === 'goblin') {
    // ゴブリン
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-5 * scale, oy, 10 * scale, 12 * scale); // 胴
    ctx.fillRect(-4 * scale, oy - 7 * scale, 8 * scale, 7 * scale); // 頭
    ctx.fillRect(-7 * scale, oy - 6 * scale, 3 * scale, 2 * scale); // 耳
    ctx.fillRect(4 * scale, oy - 6 * scale, 3 * scale, 2 * scale);

    ctx.fillStyle = '#000000';
    ctx.fillRect(-2 * scale, oy - 4 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(2 * scale, oy - 4 * scale, 2 * scale, 2 * scale);
  } else if (monster.spriteType === 'orc') {
    // オーク
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-8 * scale, oy - 2 * scale, 16 * scale, 14 * scale); // 巨体
    ctx.fillRect(-6 * scale, oy - 10 * scale, 12 * scale, 8 * scale); // 頭

    // 牙
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4 * scale, oy - 3 * scale, 2 * scale, 3 * scale);
    ctx.fillRect(2 * scale, oy - 3 * scale, 2 * scale, 3 * scale);
  } else if (monster.spriteType === 'demon') {
    // デビル
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-6 * scale, oy - 2 * scale, 12 * scale, 14 * scale);
    ctx.fillRect(-5 * scale, oy - 9 * scale, 10 * scale, 7 * scale);

    // 角
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-6 * scale, oy - 13 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(4 * scale, oy - 13 * scale, 2 * scale, 4 * scale);

    // 羽
    ctx.fillRect(-12 * scale, oy - 6 * scale, 6 * scale, 8 * scale);
    ctx.fillRect(6 * scale, oy - 6 * scale, 6 * scale, 8 * scale);
  } else {
    // ドラゴン
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-10 * scale, oy - 6 * scale, 20 * scale, 18 * scale); // 胴体
    ctx.fillRect(-8 * scale, oy - 16 * scale, 16 * scale, 10 * scale); // 頭

    // 巨大な羽
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(-18 * scale, oy - 18 * scale, 10 * scale, 12 * scale);
    ctx.fillRect(8 * scale, oy - 18 * scale, 10 * scale, 12 * scale);

    // 目
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-4 * scale, oy - 12 * scale, 3 * scale, 3 * scale);
    ctx.fillRect(2 * scale, oy - 12 * scale, 3 * scale, 3 * scale);
  }

  // モンスター名とHPバー
  ctx.font = 'bold 12px "DotGothic16", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(monster.name, 0, oy - 12 * scale);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-12 * scale, oy - 8 * scale, 24 * scale, 3 * scale);
  const hpPercent = Math.max(0, hp / monster.maxHp);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-12 * scale, oy - 8 * scale, 24 * scale * hpPercent, 3 * scale);

  ctx.restore();
}

function drawSlashEffect(ctx: CanvasRenderingContext2D, scale: number, bounceY: number) {
  ctx.save();
  ctx.translate(15 * scale, -12 * scale - bounceY);
  ctx.rotate(-Math.PI / 6);

  ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, 25 * scale, -Math.PI / 3, Math.PI / 3);
  ctx.lineTo(0, 0);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 18 * scale, -Math.PI / 4, Math.PI / 4);
  ctx.lineTo(0, 0);
  ctx.fill();

  ctx.restore();
}

function drawZzzEffects(ctx: CanvasRenderingContext2D, scale: number, elapsed: number) {
  const step = (elapsed % 90) / 30;
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 16px "DotGothic16", monospace';

  if (step >= 0) ctx.fillText('Z', 8 * scale, -24 * scale);
  if (step >= 1) ctx.fillText('z', 16 * scale, -32 * scale);
  if (step >= 2) ctx.fillText('z', 22 * scale, -40 * scale);
}
