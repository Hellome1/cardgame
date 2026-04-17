// 游戏相关的所有枚举类型

// 卡牌类型
export enum CardType {
  BASIC = 'basic',
  EQUIPMENT = 'equipment',
  SPELL = 'spell',
}

// 卡牌花色
export enum CardSuit {
  SPADE = '♠',
  HEART = '♥',
  CLUB = '♣',
  DIAMOND = '♦',
}

// 卡牌颜色
export enum CardColor {
  RED = 'red',
  BLACK = 'black',
}

// 基本牌名称
export enum BasicCardName {
  ATTACK = '杀',
  THUNDER_ATTACK = '雷杀',
  FIRE_ATTACK = '火杀',
  DODGE = '闪',
  PEACH = '桃',
}

// 锦囊牌名称
export enum SpellCardName {
  DUEL = '决斗',
  FIRE_ATTACK_SPELL = '火攻',
  STEAL = '顺手牵羊',
  DISMANTLE = '过河拆桥',
  PEACH_GARDEN = '桃园结义',
  ARCHERY = '万箭齐发',
  SAVAGE = '南蛮入侵',
  DRAW_TWO = '无中生有',
  NULLIFICATION = '无懈可击',
  INDULGENCE = '乐不思蜀',
  SUPPLY_SHORTAGE = '兵粮寸断',
  LIGHTNING = '闪电',
}

// 装备类型
export enum EquipmentType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  HORSE_PLUS = 'horsePlus',
  HORSE_MINUS = 'horseMinus',
}

// 身份
export enum Identity {
  LORD = 'lord',
  LOYALIST = 'loyalist',
  REBEL = 'rebel',
  TRAITOR = 'traitor',
}

// 性别
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

// 势力
export enum Kingdom {
  WEI = '魏',
  SHU = '蜀',
  WU = '吴',
  QUN = '群',
}

// 游戏阶段
export enum GamePhase {
  GAME_START = 'game_start',
  TURN_START = 'turn_start',
  JUDGMENT = 'judgment',
  DRAW = 'draw',
  PLAY = 'play',
  RESPONSE = 'response',
  DISCARD = 'discard',
  TURN_END = 'turn_end',
  GAME_OVER = 'game_over',
}

// 技能触发时机
export enum SkillTrigger {
  GAME_START = 'game_start',
  TURN_START = 'turn_start',
  TURN_END = 'turn_end',
  BEFORE_PLAY = 'before_play',
  PLAY = 'play',
  AFTER_PLAY = 'after_play',
  ON_ATTACKED = 'on_attacked',
  ON_DAMAGE = 'on_damage',
  ON_HEAL = 'on_heal',
  ON_DRAW = 'on_draw',
  ON_DISCARD = 'on_discard',
  ON_DEATH = 'on_death',
  ON_JUDGE = 'on_judge',
}

// 响应类型
export enum ResponseType {
  DODGE = 'dodge',
  ATTACK = 'attack',
  NULLIFY = 'nullify',
  DUEL = 'duel',
  FIRE_ATTACK = 'fire_attack',
}

// 游戏动作
export enum GameAction {
  PLAY_CARD = 'play_card',
  USE_SKILL = 'use_skill',
  DISCARD_CARD = 'discard_card',
  END_TURN = 'end_turn',
}
