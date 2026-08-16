import { ITEMS } from './gameData';

export interface DailyShopItem {
  shopItemId: string;
  baseId: string;
  price: number;
  originalPrice: number;
  discountPercent: number; // 例: 20 (20% OFF)
  customPrefix?: string;
  upgradeLevel: number;
  addedPower: number;
  isCursed?: boolean;
  isSoldOut?: boolean;
}

const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getTodayDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const generateDailyShopItems = (dateStr: string): DailyShopItem[] => {
  const hash = simpleHash(dateStr);
  
  const allKeys = Object.keys(ITEMS);
  const cursedKeys = allKeys.filter(k => ITEMS[k].isCursed);
  const equipKeys = allKeys.filter(k => (ITEMS[k].type === 'weapon' || ITEMS[k].type === 'armor') && !ITEMS[k].isCursed);
  const chestKeys = allKeys.filter(k => ITEMS[k].type === 'chest');
  const matKeys = allKeys.filter(k => ITEMS[k].type === 'material');

  const result: DailyShopItem[] = [];

  // Slot 1 & 2: Always guaranteed 1-2 Cursed Items!
  const cursedCount = (hash % 2) + 1; // 1 or 2
  for (let i = 0; i < cursedCount; i++) {
    const cursedId = cursedKeys[(hash + i * 3) % cursedKeys.length];
    const baseItem = ITEMS[cursedId];
    if (baseItem) {
      const discountPercent = [10, 20, 30, 40][(hash + i) % 4];
      const discountedPrice = Math.floor(baseItem.price * (1 - discountPercent / 100));
      result.push({
        shopItemId: `daily_${dateStr}_cursed_${i}_${cursedId}`,
        baseId: cursedId,
        price: discountedPrice,
        originalPrice: baseItem.price,
        discountPercent,
        customPrefix: '【黒呪】',
        upgradeLevel: (hash + i) % 2,
        addedPower: 15 + ((hash * 7) % 20),
        isCursed: true,
        isSoldOut: false,
      });
    }
  }

  // Slot 3 & 4: Rare Equipments with Prefix
  const prefixes = ['漆黒の', '覚醒の', '狂戦士の', '神聖なる', '極意の'];
  for (let i = 0; i < 2; i++) {
    const equipId = equipKeys[(hash * 13 + i * 7) % equipKeys.length];
    const baseItem = ITEMS[equipId];
    if (baseItem) {
      const discountPercent = [10, 15, 25, 30][(hash + i * 5) % 4];
      const bonusPower = Math.floor(baseItem.power * 0.2) + 5;
      const originalPrice = Math.floor(baseItem.price * 1.3);
      const discountedPrice = Math.floor(originalPrice * (1 - discountPercent / 100));

      result.push({
        shopItemId: `daily_${dateStr}_equip_${i}_${equipId}`,
        baseId: equipId,
        price: discountedPrice,
        originalPrice,
        discountPercent,
        customPrefix: prefixes[(hash + i) % prefixes.length],
        upgradeLevel: (hash + i) % 3,
        addedPower: bonusPower,
        isCursed: false,
        isSoldOut: false,
      });
    }
  }

  // Slot 5: Rare Chest or Material Pack
  const chestId = chestKeys[(hash * 17) % chestKeys.length] || matKeys[(hash * 19) % matKeys.length];
  const chestItem = ITEMS[chestId];
  if (chestItem) {
    const discountPercent = 20;
    const discountedPrice = Math.floor(chestItem.price * 0.8);
    result.push({
      shopItemId: `daily_${dateStr}_special_${chestId}`,
      baseId: chestId,
      price: discountedPrice,
      originalPrice: chestItem.price,
      discountPercent,
      upgradeLevel: 0,
      addedPower: 0,
      isSoldOut: false,
    });
  }

  return result;
};
