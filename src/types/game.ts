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
  THUNDER_ATTACK = '雷杀',
  FIRE_ATTACK_CARD = '火杀',
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
  NULLIFICATION = '无懈可击',
}

// 装备类型
export enum EquipmentType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  HORSE_PLUS = 'horsePlus',
  HORSE_MINUS = 'horseMinus',
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

// 响应类型
export enum ResponseType {
  DODGE = 'dodge',           // 需要出闪响应（如杀）
  ATTACK = 'attack',         // 需要出杀响应（如南蛮入侵）
  NULLIFY = 'nullify',       // 可以被无懈可击响应（锦囊牌）
  DUEL = 'duel',             // 决斗响应（双方轮流出杀）
}

// 响应请求（用于杀、决斗等需要响应的牌）
export interface ResponseRequest {
  targetPlayerId: string;      // 需要响应的玩家
  sourcePlayerId: string;      // 发起请求的玩家
  cardName: string;            // 需要响应的牌名（如"杀"）
  responseCardName: string;    // 可以打出的响应牌名（如"闪"）
  damage: number;              // 不响应时受到的伤害
  timeout?: number;            // 响应超时时间（毫秒）
  responseType?: ResponseType; // 响应类型
  spellCardEffect?: () => void; // 锦囊牌效果（用于无懈可击抵消后执行）
}

// 多目标响应队列项（用于南蛮入侵、万箭齐发等）
export interface MultiTargetResponseQueueItem {
  targetPlayerId: string;
  responded: boolean;
  result: boolean;
  responseCardId?: string;
}

// 决斗响应状态
export interface DuelState {
  challengerId: string;        // 决斗发起者ID
  targetId: string;            // 决斗目标ID
  currentTurnId: string;       // 当前需要出杀的玩家ID
  round: number;               // 决斗轮数
}

// 待处理的响应
export interface PendingResponse {
  request: ResponseRequest;
  resolved: boolean;
  result: boolean;             // 是否成功响应
  responseCardId?: string;     // 打出的响应牌ID
  // 多目标响应相关字段（用于南蛮入侵、万箭齐发）
  multiTargetQueue?: MultiTargetResponseQueueItem[];  // 响应队列
  currentTargetIndex?: number;  // 当前响应目标索引
  sourcePlayerId?: string;      // 锦囊牌来源玩家ID（用于伤害计算）
  // 决斗相关字段
  duelState?: DuelState;        // 决斗状态
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
