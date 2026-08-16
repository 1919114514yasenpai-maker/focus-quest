export type ItemType = 'weapon' | 'armor' | 'material' | 'chest';

export interface ItemEffect {
  description: string;
  critChance?: number;   // 例: 0.15 (15% クリティカル率UP)
  goldBonus?: number;    // 例: 0.2 (20% ゴールドUP、マイナスならデバフ)
  xpBonus?: number;      // 例: 0.2 (20% 経験値UP、マイナスならデバフ)
  hpRegen?: number;      // 毎秒HP回復量
  lifesteal?: number;    // 攻撃時ダメージ吸血率
  maxHpBonus?: number;   // 最大HP上昇値
  isCursed?: boolean;    // 呪われし装備フラグ
  curseHpDrain?: number; // 毎秒受ける呪いダメージ
  damageMultiplier?: number; // 例: -0.4 (与ダメージ40%ダウン)
  enemySlowRate?: number; // 粘り属性等: 敵の攻撃速度遅延率 (例: 0.2 => 敵攻撃周期+20%)
}

export interface GameItem {
  id: string;
  name: string;
  type: ItemType;
  power: number;         // 攻撃力または防御力
  price: number;         // ショップでの購入価格
  color: string;         // レンダリング用カラー
  effect?: ItemEffect;   // 特殊効果
  isCursed?: boolean;    // 呪いフラグ
}

export interface MonsterDrop {
  itemId: string;
  chance: number;
}

export interface Monster {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  color: string;
  xpReward: number;
  goldReward: number;
  spriteType: 'slime' | 'goblin' | 'orc' | 'demon' | 'dragon';
  drops?: MonsterDrop[];
}

export type JobType = 'merchant' | 'miner' | 'appraiser' | 'warrior' | 'balanced';

export interface JobDefinition {
  id: JobType;
  name: string;
  icon: string;
  description: string;
  perks: string[];
}

export interface PlayerStats {
  level: number;
  xp: number;
  gold: number;
  hp: number;
  maxHp: number;
  stage: number;          // 現在の階層/ステージ
  maxStageReached: number; // 到達した最高階層
  job?: JobType;          // 特化職 (デフォルト: balanced)
  lastJobChangeLevel?: number; // 最後に転職の機会を行使/確認したレベル (貯められない)
}

export interface EquipmentState {
  statWeaponId: string;
  appearanceWeaponId: string;
  statArmorId: string;
  appearanceArmorId: string;
}

export interface PlayerItem {
  uid: string;
  baseId: string;
  upgradeLevel: number;
  limitBreak?: number;
  addedPower: number;
  specialEnchantCount?: number;
  customPrefix?: string;
  addedEffect?: ItemEffect;
  isLocked?: boolean;
  isUncursed?: boolean;
}

export interface SaveData {
  stats: PlayerStats;
  equipment: EquipmentState;
  inventory: PlayerItem[];
}

export interface ChestReward {
  xp: number;
  gold: number;
  items: PlayerItem[];
  chestName: string;
}
