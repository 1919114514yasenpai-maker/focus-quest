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
