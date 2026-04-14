/**
 * 游戏配置常量
 * 集中管理所有游戏相关的常量配置
 */

export const GAME_CONFIG = {
  // 游戏基本设置
  DEFAULT_PLAYER_COUNT: 4,
  INITIAL_HAND_CARDS: 4,
  MAX_CARDS_PER_TURN: 10,

  // 回合时间限制（秒）
  TURN_TIME_LIMIT: 30,
  RESPONSE_TIME_LIMIT: 15,

  // AI延迟配置（毫秒）
  AI: {
    THINK_DELAY: 1500,
    ACTION_DELAY: 800,
    DISCARD_DELAY: 300,
    RESPONSE_DELAY: 1000,
    MAX_WAIT_FOR_RESPONSE: 5000,
  },

  // 攻击限制
  ATTACK: {
    MAX_PER_TURN: 1,
    DEFAULT_RANGE: 1,
  },

  // 锦囊牌距离限制
  SPELL: {
    STEAL_RANGE: 1,
  },

  // 怀疑度系统配置
  SUSPICION: {
    LORD_ENEMY_THRESHOLD: 50,
    LORD_SUSPECT_THRESHOLD: 20,
    REBEL_SUSPECT_THRESHOLD: 30,
    MAX_LEVEL: 100,
  },

  // 体力相关
  HP: {
    MIN: 0,
    PEACH_HEAL: 1,
  },

  // 伤害类型
  DAMAGE: {
    NORMAL: 'normal',
    FIRE: 'fire',
    THUNDER: 'thunder',
  } as const,

  // 卡牌类型优先级（用于AI弃牌决策）
  CARD_PRIORITY: {
    BASIC: 0,
    SPELL: 1,
    EQUIPMENT: 2,
  },
} as const;

// 装备类型映射
export const EQUIPMENT_KEY_MAP: Record<string, 'weapon' | 'armor' | 'horsePlus' | 'horseMinus'> = {
  'weapon': 'weapon',
  'armor': 'armor',
  'horsePlus': 'horsePlus',
  'horseMinus': 'horseMinus',
} as const;

// 身份显示文本
export const IDENTITY_TEXT: Record<string, string> = {
  'lord': '主公',
  'loyalist': '忠臣',
  'rebel': '反贼',
  'traitor': '内奸',
} as const;

// 游戏阶段显示文本
export const PHASE_TEXT: Record<string, string> = {
  'game_start': '游戏开始',
  'turn_start': '回合开始',
  'judgment': '判定阶段',
  'draw': '摸牌阶段',
  'play': '出牌阶段',
  'response': '响应阶段',
  'discard': '弃牌阶段',
  'turn_end': '回合结束',
  'game_over': '游戏结束',
} as const;
