// 卡牌类型
export enum CardType {
  BASIC = 'basic',       // 基本牌
  EQUIPMENT = 'equipment', // 装备牌
  SPELL = 'spell',       // 锦囊牌
}

// 卡牌花色
export enum CardSuit {
  SPADE = '♠',    // 黑桃
  HEART = '♥',    // 红桃
  CLUB = '♣',     // 梅花
  DIAMOND = '♦',  // 方块
}

// 卡牌颜色
export enum CardColor {
  RED = 'red',
  BLACK = 'black',
}

// 基本牌名称
export enum BasicCardName {
  ATTACK = '杀',
  DODGE = '闪',
  PEACH = '桃',
}

// 锦囊牌名称
export enum SpellCardName {
  DUEL = '决斗',
  FIRE_ATTACK = '火攻',
  STEAL = '顺手牵羊',
  DISMANTLE = '过河拆桥',
  PEACH_GARDEN = '桃园结义',
  ARCHERY = '万箭齐发',
  SAVAGE = '南蛮入侵',
  DRAW_TWO = '无中生有',
}

// 装备类型
export enum EquipmentType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  HORSE_PLUS = 'horse_plus',
  HORSE_MINUS = 'horse_minus',
}

// 卡牌接口
export interface Card {
  id: string;
  name: string;
  type: CardType;
  suit: CardSuit;
  number: number;
  color: CardColor;
  description: string;
  equipmentType?: EquipmentType;
  range?: number;
}

// 身份
export enum Identity {
  LORD = 'lord',       // 主公
  LOYALIST = 'loyalist', // 忠臣
  REBEL = 'rebel',     // 反贼
  TRAITOR = 'traitor', // 内奸
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
}

// 技能接口
export interface Skill {
  id: string;
  name: string;
  description: string;
  trigger: SkillTrigger;
  isPassive: boolean;
  useLimit?: number;
  execute: (context: SkillContext) => void;
}

// 技能上下文
export interface SkillContext {
  player: Player;
  target?: Player;
  card?: Card;
  game: GameState;
}

// 角色接口
export interface Character {
  id: string;
  name: string;
  kingdom: Kingdom;
  gender: Gender;
  maxHp: number;
  hp: number;
  skills: Skill[];
  avatar: string;
}

// 玩家接口
export interface Player {
  id: string;
  character: Character;
  identity: Identity;
  handCards: Card[];
  equipment: {
    weapon?: Card;
    armor?: Card;
    horsePlus?: Card;
    horseMinus?: Card;
  };
  isDead: boolean;
  isAI: boolean;
}

// 游戏阶段
export enum GamePhase {
  GAME_START = 'game_start',
  TURN_START = 'turn_start',
  JUDGMENT = 'judgment',
  DRAW = 'draw',
  PLAY = 'play',
  RESPONSE = 'response',  // 响应阶段（如打出闪响应杀）
  DISCARD = 'discard',
  TURN_END = 'turn_end',
  GAME_OVER = 'game_over',
}

// 响应请求（用于杀、决斗等需要响应的牌）
export interface ResponseRequest {
  targetPlayerId: string;      // 需要响应的玩家
  sourcePlayerId: string;      // 发起请求的玩家
  cardName: string;            // 需要响应的牌名（如"杀"）
  responseCardName: string;    // 可以打出的响应牌名（如"闪"）
  damage: number;              // 不响应时受到的伤害
  timeout?: number;            // 响应超时时间（毫秒）
}

// 待处理的响应
export interface PendingResponse {
  request: ResponseRequest;
  resolved: boolean;
  result: boolean;             // 是否成功响应
  responseCardId?: string;     // 打出的响应牌ID
}

// 游戏状态
export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  deck: Card[];
  discardPile: Card[];
  round: number;
  winner?: Identity;
  pendingResponse?: PendingResponse;  // 待处理的响应
}

// 游戏动作
export enum GameAction {
  PLAY_CARD = 'play_card',
  USE_SKILL = 'use_skill',
  DISCARD_CARD = 'discard_card',
  END_TURN = 'end_turn',
}

// 动作请求
export interface ActionRequest {
  action: GameAction;
  playerId: string;
  cardId?: string;
  cardName?: string; // 用于动画显示
  skillId?: string;
  targetIds?: string[];
  isResponse?: boolean; // 标记是否是响应动作（如打出闪），不触发动画
  logMessage?: string; // 用于游戏记录的日志消息
}
