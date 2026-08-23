import { GameItem, Monster, PlayerItem, ItemType } from './types';

export const ITEMS: Record<string, GameItem> = {
  // --- 武器 (WEAPONS) ---
  'w_craft_ragnarok': {
    id: 'w_craft_ragnarok',
    name: '終焉剣ラグナロク',
    type: 'weapon',
    power: 500,
    price: 15000000,
    color: '#fb7185',
    effect: { description: '【クラフト限定】世界の終焉と創生を司る神剣。圧倒的な破壊力と自己再生力を併せ持つ。', critChance: 0.3, lifesteal: 0.1, damageMultiplier: 2.0, hpRegen: 50 }
  },
  'w_wood_sword': {
    id: 'w_wood_sword',
    name: 'ひのきのぼう',
    type: 'weapon',
    power: 2,
    price: 0,
    color: '#8B4513',
    effect: { description: '初心者のための素朴な木の棒。' }
  },
  'w_iron_sword': {
    id: 'w_iron_sword',
    name: 'てつのつるぎ',
    type: 'weapon',
    power: 6,
    price: 150,
    color: '#94a3b8',
    effect: { description: '会心の一撃が出やすくなる。', critChance: 0.15 }
  },
  'w_bronze_spear': {
    id: 'w_bronze_spear',
    name: 'ブロンズスピア',
    type: 'weapon',
    power: 9,
    price: 280,
    color: '#b45309',
    effect: { description: '間合いを取って突く槍。会心率+15%。', critChance: 0.15 }
  },
  'w_silver_rapier': {
    id: 'w_silver_rapier',
    name: 'ぎんのレイピア',
    type: 'weapon',
    power: 12,
    price: 450,
    color: '#e2e8f0',
    effect: { description: '高い会心率を誇る素早い細剣。', critChance: 0.3 }
  },
  'w_thief_dagger': {
    id: 'w_thief_dagger',
    name: 'とうぞくのナイフ',
    type: 'weapon',
    power: 8,
    price: 600,
    color: '#10b981',
    effect: { description: '敵から奪うゴールドが30%増加する。', goldBonus: 0.3 }
  },
  'w_scholar_wand': {
    id: 'w_scholar_wand',
    name: 'けんじゃのつえ',
    type: 'weapon',
    power: 10,
    price: 800,
    color: '#38bdf8',
    effect: { description: '獲得できる経験値(EXP)が35%増加する。', xpBonus: 0.35 }
  },
  'w_ice_blade': {
    id: 'w_ice_blade',
    name: 'こおりのつるぎ',
    type: 'weapon',
    power: 15,
    price: 1100,
    color: '#7dd3fc',
    effect: { description: '冷気を纏う剣。会心率+20%＆獲得EXP+20%。', critChance: 0.2, xpBonus: 0.2 }
  },
  'w_gold_sword': {
    id: 'w_gold_sword',
    name: 'おうごんのけん',
    type: 'weapon',
    power: 18,
    price: 1500,
    color: '#f59e0b',
    effect: { description: 'ゴールド獲得量が60%アップする煌びやかな剣。', goldBonus: 0.6 }
  },
  'w_thunder_axe': {
    id: 'w_thunder_axe',
    name: '雷鳴のバトルアックス',
    type: 'weapon',
    power: 24,
    price: 2000,
    color: '#facc15',
    effect: { description: '雷を宿した重厚な斧。会心率+25%。', critChance: 0.25 }
  },
  'w_vampire_blade': {
    id: 'w_vampire_blade',
    name: 'ブラッドソード',
    type: 'weapon',
    power: 28,
    price: 2500,
    color: '#be123c',
    effect: { description: '攻撃時に与えたダメージの一部で自動吸血回復。', lifesteal: 0.25 }
  },
  'w_shadow_scythe': {
    id: 'w_shadow_scythe',
    name: 'しにがみのデスサイズ',
    type: 'weapon',
    power: 35,
    price: 3500,
    color: '#8b5cf6',
    effect: { description: '強力な吸血(30%)と会心率(20%)を兼ね備えた大鎌。', lifesteal: 0.3, critChance: 0.2 }
  },
  'w_flame_sword': {
    id: 'w_flame_sword',
    name: 'ほのおのつるぎ',
    type: 'weapon',
    power: 42,
    price: 4500,
    color: '#ef4444',
    effect: { description: '圧倒的な火力を誇る伝説の魔剣。会心率35%UP。', critChance: 0.35 }
  },
  'w_excalibur': {
    id: 'w_excalibur',
    name: '聖剣エクスカリバー',
    type: 'weapon',
    power: 55,
    price: 6500,
    color: '#38bdf8',
    effect: { description: '神聖なる聖剣。会心率40%UP、EXP＆ゴールド獲得量50%UP。', critChance: 0.4, xpBonus: 0.5, goldBonus: 0.5 }
  },
  'w_dragon_slayer': {
    id: 'w_dragon_slayer',
    name: 'ドラゴンスレイヤー',
    type: 'weapon',
    power: 75,
    price: 9000,
    color: '#1e1b4b',
    effect: { description: '竜すら一撃で屠る大剣。会心率45%UP＆吸血35%。', critChance: 0.45, lifesteal: 0.35 }
  },

  // --- 防具 (ARMORS) ---
  'a_craft_aegis': {
    id: 'a_craft_aegis',
    name: '創星盾イージス',
    type: 'armor',
    power: 300,
    price: 15000000,
    color: '#38bdf8',
    effect: { description: '【クラフト限定】星々の加護を受けた神の盾。あらゆる災厄を弾き返し、装備者に無限の活力を与える。', maxHpBonus: 5000, hpRegen: 200, damageMultiplier: 1.0, critChance: 0.1 }
  },
  'a_cloth': {
    id: 'a_cloth',
    name: 'ぬののふく',
    type: 'armor',
    power: 2,
    price: 0,
    color: '#228B22',
    effect: { description: '旅立ちの服。毎秒HPが1自動回復する。', hpRegen: 1 }
  },
  'a_leather': {
    id: 'a_leather',
    name: 'かわのよろい',
    type: 'armor',
    power: 5,
    price: 120,
    color: '#78350f',
    effect: { description: '最大HP+30＆毎秒HPが2自動回復する。', maxHpBonus: 30, hpRegen: 2 }
  },
  'a_chain_mail': {
    id: 'a_chain_mail',
    name: 'くさりかたびら',
    type: 'armor',
    power: 8,
    price: 240,
    color: '#6b7280',
    effect: { description: '金属の鎖で編まれた鎧。最大HP+45＆毎秒HP+2回復。', maxHpBonus: 45, hpRegen: 2 }
  },
  'a_iron': {
    id: 'a_iron',
    name: 'てつのよろい',
    type: 'armor',
    power: 12,
    price: 350,
    color: '#64748b',
    effect: { description: '頑丈な鉄の鎧。最大HP+60＆毎秒HP+3回復。', maxHpBonus: 60, hpRegen: 3 }
  },
  'a_silver_mail': {
    id: 'a_silver_mail',
    name: 'ぎんのメイル',
    type: 'armor',
    power: 16,
    price: 550,
    color: '#cbd5e1',
    effect: { description: '銀の美しい輝き。最大HP+80＆毎秒HP+4回復。', maxHpBonus: 80, hpRegen: 4 }
  },
  'a_blessed_robe': {
    id: 'a_blessed_robe',
    name: 'しんかんのローブ',
    type: 'armor',
    power: 10,
    price: 750,
    color: '#38bdf8',
    effect: { description: '聖なる加護。毎秒HPが6自動回復する。', hpRegen: 6 }
  },
  'a_fairy_robe': {
    id: 'a_fairy_robe',
    name: '精霊の羽衣',
    type: 'armor',
    power: 18,
    price: 1200,
    color: '#a855f7',
    effect: { description: '精霊の祝福。最大HP+120＆毎秒HP+7回復＆獲得EXP+25%。', maxHpBonus: 120, hpRegen: 7, xpBonus: 0.25 }
  },
  'a_gold': {
    id: 'a_gold',
    name: 'おうごんのよろい',
    type: 'armor',
    power: 22,
    price: 1800,
    color: '#f59e0b',
    effect: { description: '最大HP+150＆ゴールド30%UP＆毎秒HP+5回復。', maxHpBonus: 150, goldBonus: 0.3, hpRegen: 5 }
  },
  'a_dragon_scale': {
    id: 'a_dragon_scale',
    name: '竜鱗の鎧',
    type: 'armor',
    power: 28,
    price: 2600,
    color: '#ea580c',
    effect: { description: '竜の鱗をあしらった強固な鎧。最大HP+200＆毎秒HP+8回復。', maxHpBonus: 200, hpRegen: 8, goldBonus: 0.2 }
  },
  'a_hero_plate': {
    id: 'a_hero_plate',
    name: 'ゆうしゃのくろがね',
    type: 'armor',
    power: 35,
    price: 3600,
    color: '#3b82f6',
    effect: { description: '伝説の勇者の装甲。最大HP+280＆毎秒HPが10自動回復する。', maxHpBonus: 280, hpRegen: 10 }
  },
  'a_aegis_plate': {
    id: 'a_aegis_plate',
    name: 'イージスの大鎧',
    type: 'armor',
    power: 45,
    price: 5000,
    color: '#0284c7',
    effect: { description: '神盾の加護。最大HP+380＆毎秒HPが14自動回復。', maxHpBonus: 380, hpRegen: 14 }
  },
  'a_dark': {
    id: 'a_dark',
    name: 'くろのよろい',
    type: 'armor',
    power: 55,
    price: 7000,
    color: '#4c1d95',
    effect: { description: '深淵の鎧。最大HP+500＆毎秒HPが18自動回復。', maxHpBonus: 500, hpRegen: 18 }
  },
  'a_celestial_armor': {
    id: 'a_celestial_armor',
    name: '創世神の聖衣',
    type: 'armor',
    power: 70,
    price: 10000,
    color: '#fbbf24',
    effect: { description: '至高の鎧。最大HP+800＆毎秒HP+25回復＆EXP・G獲得量50%UP。', maxHpBonus: 800, hpRegen: 25, xpBonus: 0.5, goldBonus: 0.5 }
  },

  // --- 呪われた装備 (CURSED EQUIPMENT) ---
  'w_cursed_blade': {
    id: 'w_cursed_blade',
    name: '呪われし魔剣',
    type: 'weapon',
    power: 120,
    price: 3200,
    color: '#9333ea',
    isCursed: true,
    effect: { description: '【呪い】圧倒的な攻撃力を秘めるが、毎秒HPが5削れ、獲得EXPが40%低下する。', isCursed: true, curseHpDrain: 5, xpBonus: -0.4 }
  },
  'w_blood_scythe': {
    id: 'w_blood_scythe',
    name: '血塗られた大鎌',
    type: 'weapon',
    power: 220,
    price: 6800,
    color: '#dc2626',
    isCursed: true,
    effect: { description: '【呪い】一撃で敵を断つ大鎌。毎秒HPが12削れ、獲得ゴールドが50%低下する。', isCursed: true, curseHpDrain: 12, goldBonus: -0.5 }
  },
  'w_abyssal_blade': {
    id: 'w_abyssal_blade',
    name: '深淵の怨念剣',
    type: 'weapon',
    power: 350,
    price: 12500,
    color: '#581c87',
    isCursed: true,
    effect: { description: '【呪い】破壊の極致。だが毎秒HPが25削れ、クリティカル率が30%低下する。', isCursed: true, curseHpDrain: 25, critChance: -0.3 }
  },
  'a_cursed_mail': {
    id: 'a_cursed_mail',
    name: '呪縛の暗黒重鎧',
    type: 'armor',
    power: 100,
    price: 3200,
    color: '#7e22ce',
    isCursed: true,
    effect: { description: '【呪い】強大な防衛力だが身体が重く与ダメージが35%低下し、毎秒HPが4削れる。', isCursed: true, curseHpDrain: 4, damageMultiplier: -0.35 }
  },
  'a_abyssal_carapace': {
    id: 'a_abyssal_carapace',
    name: '深淵の呪殻',
    type: 'armor',
    power: 200,
    price: 7000,
    color: '#4c1d95',
    isCursed: true,
    effect: { description: '【呪い】鉄壁の呪い甲冑。毎秒HPが10削れ、獲得EXPが60%低下する。', isCursed: true, curseHpDrain: 10, xpBonus: -0.6 }
  },
  'a_soul_drainer': {
    id: 'a_soul_drainer',
    name: '魂喰らいの魔甲',
    type: 'armor',
    power: 320,
    price: 13000,
    color: '#991b1b',
    isCursed: true,
    effect: { description: '【呪い】驚異的な防御性能。ただし毎秒HPが22削れ、獲得Gが70%低下する。', isCursed: true, curseHpDrain: 22, goldBonus: -0.7 }
  },

  // --- 素材 (MATERIALS) ---
  'm_slime_jelly': {
    id: 'm_slime_jelly',
    name: 'スライムゼリー',
    type: 'material',
    power: 0,
    price: 50,
    color: '#22c55e',
    effect: { description: '特殊強化に使用する素材。ぷるぷるしている。' }
  },
  'm_goblin_ear': {
    id: 'm_goblin_ear',
    name: 'ゴブリンの耳',
    type: 'material',
    power: 0,
    price: 100,
    color: '#eab308',
    effect: { description: '特殊強化に使用する素材。少し臭う。' }
  },
  'm_orc_fang': {
    id: 'm_orc_fang',
    name: 'オークの牙',
    type: 'material',
    power: 0,
    price: 250,
    color: '#ea580c',
    effect: { description: '特殊強化に使用する素材。鋭く大きい。' }
  },
  'm_demon_horn': {
    id: 'm_demon_horn',
    name: '悪魔の角',
    type: 'material',
    power: 0,
    price: 500,
    color: '#a855f7',
    effect: { description: '特殊強化に使用する素材。禍々しい魔力を放つ。' }
  },
  'm_dragon_scale': {
    id: 'm_dragon_scale',
    name: '竜の逆鱗',
    type: 'material',
    power: 0,
    price: 1000,
    color: '#ef4444',
    effect: { description: '特殊強化に使用する素材。究極の強化が可能。' }
  },

  // --- 宝石 (GEMS) ---
  'g_fire_ruby': {
    id: 'g_fire_ruby',
    name: '炎のルビー',
    type: 'gem',
    power: 10,
    price: 800,
    color: '#ef4444',
    effect: { description: '武器の穴に嵌めると、炎属性ダメージ(+10)を付与する。', elementalDamage: 10, elementalType: 'fire' }
  },
  'g_water_sapphire': {
    id: 'g_water_sapphire',
    name: '水のサファイア',
    type: 'gem',
    power: 10,
    price: 800,
    color: '#3b82f6',
    effect: { description: '武器の穴に嵌めると、水属性ダメージ(+10)を付与する。', elementalDamage: 10, elementalType: 'water' }
  },
  'g_thunder_topaz': {
    id: 'g_thunder_topaz',
    name: '雷のトパーズ',
    type: 'gem',
    power: 10,
    price: 800,
    color: '#eab308',
    effect: { description: '武器の穴に嵌めると、雷属性ダメージ(+10)を付与する。', elementalDamage: 10, elementalType: 'thunder' }
  },
  'g_light_diamond': {
    id: 'g_light_diamond',
    name: '光のダイヤモンド',
    type: 'gem',
    power: 15,
    price: 2000,
    color: '#f8fafc',
    effect: { description: '武器の穴に嵌めると、光属性ダメージ(+15)を付与する。', elementalDamage: 15, elementalType: 'light' }
  },
  'g_dark_onyx': {
    id: 'g_dark_onyx',
    name: '闇のオニキス',
    type: 'gem',
    power: 15,
    price: 2000,
    color: '#1e293b',
    effect: { description: '武器の穴に嵌めると、闇属性ダメージ(+15)を付与する。', elementalDamage: 15, elementalType: 'dark' }
  },

  // --- 消費アイテム (CONSUMABLES) ---
  'c_transfer_scroll': {
    id: 'c_transfer_scroll',
    name: '強化継承の秘伝書',
    type: 'consumable',
    power: 0,
    price: 30000000,
    color: '#a855f7',
    effect: { description: '【ショップ限定品】元の武器・防具から強化した部分（基本強化値・限界突破・特殊強化・開けた穴・はめた宝石）だけを抜き取り、別の同じ種類の装備に移せる。抽出元の装備品は消滅する。' }
  },
  'c_curse_breaker': {
    id: 'c_curse_breaker',
    name: '呪い封じの護符',
    type: 'consumable',
    power: 0,
    price: 3000,
    color: '#facc15',
    effect: { description: 'クラフトで作成。次に「解呪」を行うまで一時的に装備の呪い効果（自傷ダメージやステータス低下など）を無効化する。' }
  },

  // --- 宝箱 (CHESTS) ---
  'm_chest_wooden': {
    id: 'm_chest_wooden',
    name: '木の宝箱',
    type: 'chest',
    power: 0,
    price: 300,
    color: '#8B4513',
    effect: { description: 'クエスト達成報酬の宝箱。開けると豪華な報酬を獲得！' }
  },
  'm_chest_silver': {
    id: 'm_chest_silver',
    name: '銀の宝箱',
    type: 'chest',
    power: 0,
    price: 600,
    color: '#94a3b8',
    effect: { description: '上質なクエスト達成宝箱。レアな装備や素材が出現！' }
  },
  'm_chest_gold': {
    id: 'm_chest_gold',
    name: '金の宝箱',
    type: 'chest',
    power: 0,
    price: 1200,
    color: '#f59e0b',
    effect: { description: '煌びやかな高級宝箱。強力な武具と多額の報酬が入っている。' }
  },
  'm_chest_legend': {
    id: 'm_chest_legend',
    name: '伝説の宝箱',
    type: 'chest',
    power: 0,
    price: 2500,
    color: '#a855f7',
    effect: { description: '長時間の試練を乗り越えた勇者への最高の贈り物。' }
  }
};

export const generateUid = () => Math.random().toString(36).substring(2, 9);

export const INITIAL_INVENTORY: PlayerItem[] = [
  { uid: 'initial_w', baseId: 'w_wood_sword', upgradeLevel: 0, limitBreak: 0, addedPower: 0 },
  { uid: 'initial_a', baseId: 'a_cloth', upgradeLevel: 0, limitBreak: 0, addedPower: 0 }
];

export const LEVEL_REQUIREMENTS = [
  0,      // Lv 1
  80,     // Lv 2
  200,    // Lv 3
  450,    // Lv 4
  800,    // Lv 5
  1300,   // Lv 6
  2000,   // Lv 7
  3000,   // Lv 8
  4500,   // Lv 9
  6500,   // Lv 10
];

export const getNextLevelXp = (level: number) => {
  if (level >= LEVEL_REQUIREMENTS.length) return LEVEL_REQUIREMENTS[LEVEL_REQUIREMENTS.length - 1] * (level - 8);
  return LEVEL_REQUIREMENTS[level];
};

// 階層（ステージ）に応じたモンスター生成
export const getMonsterForStage = (stage: number): Monster => {
  const spriteTypes: ('slime' | 'goblin' | 'orc' | 'demon' | 'dragon')[] = [
    'slime', 'goblin', 'orc', 'demon', 'dragon'
  ];
  
  let spriteType: 'slime' | 'goblin' | 'orc' | 'demon' | 'dragon';
  if (stage > 500) {
    const randomIndex = Math.floor(Math.random() * spriteTypes.length);
    spriteType = spriteTypes[randomIndex];
  } else {
    const spriteIndex = Math.min(Math.floor((stage - 1) / 100), spriteTypes.length - 1);
    spriteType = spriteTypes[spriteIndex];
  }

  const names: Record<string, string[]> = {
    slime: ['ぷにスライム', 'グリーンバブル', 'キングスライム', 'カオススライム', '深淵のゼリー'],
    goblin: ['ゴブリン小兵', 'ゴブリンの剣士', 'ゴブリンキング', 'ゴブリンロード', '深層のゴブリン'],
    orc: ['オークバサーカー', 'ハイオーク', 'オーク将軍', 'ウォーロード・オーク', '深淵の巨鬼'],
    demon: ['シャドウデビル', 'アビスナイト', '魔界の使者', 'ヘルハウンド', '深層の魔王'],
    dragon: ['レッドドラゴン', 'ダークドラゴン', '終焉の竜王', '古の神竜', 'ヴォイドドラゴン']
  };

  const nameList = names[spriteType];
  let name = '';
  if (stage > 500) {
    const nameIndex = Math.floor(Math.random() * nameList.length);
    name = `[深層] ${nameList[nameIndex]} Lv.${stage}`;
  } else {
    const nameIndex = Math.min(Math.floor(((stage - 1) % 100) / 20), nameList.length - 1);
    name = nameList[nameIndex] || `${spriteType.toUpperCase()} Lv.${stage}`;
  }

  // 放置タイマーアプリとして集中を妨げないよう、敵攻撃力は非常におだやかに調整
  const maxHp = Math.floor(50 + stage * 35 + Math.pow(stage, 1.3) * 15);
  const attack = Math.floor(1 + Math.floor(stage * 0.4)); // 攻撃力を低めに保持
  const xpReward = Math.floor(15 + stage * 12 + Math.pow(stage, 1.2) * 5);
  const goldReward = Math.floor(10 + stage * 10 + Math.pow(stage, 1.1) * 6);

  const colors: Record<string, string> = {
    slime: '#22c55e',
    goblin: '#eab308',
    orc: '#ea580c',
    demon: '#a855f7',
    dragon: '#ef4444'
  };

  const dropMaterials: Record<string, string> = {
    slime: 'm_slime_jelly',
    goblin: 'm_goblin_ear',
    orc: 'm_orc_fang',
    demon: 'm_demon_horn',
    dragon: 'm_dragon_scale'
  };

  const dropGems: Record<string, string> = {
    slime: 'g_water_sapphire',
    goblin: 'g_thunder_topaz',
    orc: 'g_fire_ruby',
    demon: 'g_dark_onyx',
    dragon: 'g_light_diamond'
  };

  return {
    id: `monster_stage_${stage}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    maxHp,
    attack,
    color: colors[spriteType],
    xpReward,
    goldReward,
    spriteType,
    drops: [
      { itemId: dropMaterials[spriteType], chance: 0.2 + (stage % 3) * 0.1 }, // 20%~40% drop chance
      { itemId: dropGems[spriteType], chance: 0.05 + Math.min(stage * 0.001, 0.1) } // 5%~15% rare gem drop
    ]
  };
};
