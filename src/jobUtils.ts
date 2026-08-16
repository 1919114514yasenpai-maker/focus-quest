import { JobType } from './types';

export const getShopDiscountMultiplier = (job: JobType = 'balanced'): number => {
  if (job === 'merchant') return 0.8; // 20% OFF
  if (job === 'balanced') return 0.95; // 5% OFF
  return 1.0;
};

export const getSellGoldMultiplier = (job: JobType = 'balanced'): number => {
  if (job === 'merchant') return 1.5; // +50%
  if (job === 'balanced') return 1.1; // +10%
  return 1.0;
};

export const getUncurseDiscountMultiplier = (job: JobType = 'balanced'): number => {
  if (job === 'appraiser') return 0.5; // 50% OFF (半額)
  if (job === 'balanced') return 0.85; // 15% OFF
  return 1.0;
};

export const getMaterialBonusCount = (job: JobType = 'balanced'): number => {
  if (job === 'miner') return Math.floor(Math.random() * 2) + 1; // +1 ~ +2
  if (job === 'balanced') return Math.random() < 0.5 ? 1 : 0; // 50% chance +1
  return 0;
};

export const getDamageMultiplierBonus = (job: JobType = 'balanced', isFocusing: boolean = true): number => {
  if (job === 'warrior') return 0.30; // +30%
  if (job === 'balanced') return 0.10; // +10%
  return 0;
};

export const getXpBonusMultiplier = (job: JobType = 'balanced'): number => {
  if (job === 'warrior') return 0.30; // +30%
  if (job === 'balanced') return 0.10; // +10%
  return 0;
};

export const getGoldBonusMultiplier = (job: JobType = 'balanced'): number => {
  if (job === 'merchant') return 0.20; // +20%
  if (job === 'balanced') return 0.05; // +5%
  return 0;
};

export const getCritChanceBonus = (job: JobType = 'balanced'): number => {
  if (job === 'warrior') return 0.15; // +15%
  if (job === 'balanced') return 0.05; // +5%
  return 0;
};

export const getAppraiserPowerBonus = (job: JobType = 'balanced'): number => {
  if (job === 'appraiser') return 10;
  if (job === 'balanced') return 2;
  return 0;
};

// 特化職の解禁判定 (Lv.100以上で解禁)
export const isJobUnlocked = (level: number): boolean => {
  return level >= 100;
};

// 転職可能レベルかどうかの判定 (Lv.100 または Lv.500の倍数)
export const isJobChangeMilestoneLevel = (level: number): boolean => {
  if (level < 100) return false;
  if (level === 100) return true;
  return level % 500 === 0;
};

// 現在その場で転職可能かどうかの判定 (チャンスを消費していないか)
export const canChangeJobNow = (level: number, lastJobChangeLevel?: number): boolean => {
  if (level < 100) return false;
  
  // 初回解禁 (Lv100以上で過去に一度も転職機会を通っていない場合、またはLv100ちょうど)
  if (level === 100) {
    return (lastJobChangeLevel ?? 0) < 100;
  }
  
  // Lv100超でまだ一度も転職したことがない既存プレイヤーへの救済
  if (level > 100 && (lastJobChangeLevel === undefined || lastJobChangeLevel === 0)) {
    return true;
  }

  // Lv.500刻みの到達レベルちょうどであること、かつそのレベルでまだ行使/スキップしていないこと
  if (level % 500 === 0) {
    return (lastJobChangeLevel ?? 0) < level;
  }

  // それ以外のレベルでは「貯められない・その場のみ」のため不可
  return false;
};

// 次回変更可能レベルの計算
export const getNextJobChangeLevel = (level: number): number => {
  if (level < 100) return 100;
  if (level < 500) return 500;
  // 500の倍数レベルちょうどでまだ未行使ならそのレベル、過ぎていれば次の500刻み
  return Math.floor(level / 500 + 1) * 500;
};

