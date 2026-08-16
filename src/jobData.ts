import { JobDefinition, JobType } from './types';

export const JOBS: Record<JobType, JobDefinition> = {
  merchant: {
    id: 'merchant',
    name: '商人特化',
    icon: '💰',
    description: '富と流通を極めた職種。ショップでの取引や装備売却で巨額のゴールドを稼ぎ出します。',
    perks: [
      '日替わり＆通常ショップの購入価格 20% OFF',
      '装備売却時の獲得ゴールド 1.5倍 (+50%)',
      '戦闘・宝箱での獲得ゴールド 1.2倍 (+20%)',
    ],
  },
  miner: {
    id: 'miner',
    name: '採掘・素材特化',
    icon: '⛏️',
    description: '発掘と解体の専門家。モンスターや装備の分解、宝箱から大量の貴重な素材を獲得できます。',
    perks: [
      'モンスター撃破時の素材ドロップ獲得数 +1〜2個 UP',
      '装備分解時の獲得素材数 +1〜2個 UP',
      '宝箱開封時に追加の素材ドロップが必ず発生',
    ],
  },
  appraiser: {
    id: 'appraiser',
    name: '鑑定・解呪特化',
    icon: '🔍',
    description: '呪いや解呪の秘術を熟知した秘術師。解呪コストを半額にし、強化・限界突破時に追加ボーナス性能を引き出します。',
    perks: [
      '呪い装備の解呪（呪い解除）コスト 50% OFF (半額)',
      '限界突破時、追加ステータス (+10 Power) が必ずボーナス付与',
      '特殊強化・基本強化時にステータス大成功 (+5〜15 Power) が発生しやすい',
    ],
  },
  warrior: {
    id: 'warrior',
    name: '戦闘特化',
    icon: '⚔️',
    description: '武を修めた不屈の戦士。集中クエスト中のモンスターへのダメージと獲得経験値が大幅アップ。',
    perks: [
      '集中クエスト中（Focus Timer）の与ダメージ +30% UP',
      'モンスター撃破＆クエスト達成時の獲得EXP +30% UP',
      'クリティカル発生率 +15% UP',
    ],
  },
  balanced: {
    id: 'balanced',
    name: 'バランス型',
    icon: '⚖️',
    description: 'すべての能力をバランス良く備えた万能職。初心者やオールラウンダーにおすすめ。',
    perks: [
      'ショップ割引 5% OFF',
      '売却ゴールド 1.1倍 (+10%)',
      '解呪コスト 15% OFF',
      '素材獲得数 50%の確率で +1個',
      '獲得EXP +10% ＆ 与ダメージ +10% UP',
    ],
  },
};
