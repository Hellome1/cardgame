// 游戏状态相关类型定义

import { Card } from './card';
import { Player } from './player';
import { GamePhase, ResponseType, GameAction } from './enums';

// 响应请求
export interface ResponseRequest {
  targetPlayerId: string;
  sourcePlayerId: string;
  cardName: string;
  responseCardName: string;
  damage: number;
  timeout?: number;
  responseType?: ResponseType;
  spellCardEffect?: () => void;
  damageType?: 'normal' | 'fire' | 'thunder';
}

// 多目标响应队列项
export interface MultiTargetResponseQueueItem {
  targetPlayerId: string;
  responded: boolean;
  result: boolean;
  responseCardId?: string;
}

// 决斗状态
export interface DuelState {
  challengerId: string;
  targetId: string;
  currentTurnId: string;
  round: number;
}

// 火攻状态
export interface FireAttackState {
  sourceId: string;
  targetId: string;
  shownCard: Card;
}

// 待处理的响应
export interface PendingResponse {
  request: ResponseRequest;
  resolved: boolean;
  result: boolean;
  responseCardId?: string;
  multiTargetQueue?: MultiTargetResponseQueueItem[];
  currentTargetIndex?: number;
  sourcePlayerId?: string;
  duelState?: DuelState;
  fireAttackState?: FireAttackState;
}

// 游戏状态
export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  deck: Card[];
  discardPile: Card[];
  round: number;
  winner?: string;
  pendingResponse?: PendingResponse;
}

// 动作请求
export interface ActionRequest {
  action: GameAction;
  playerId: string;
  cardId?: string;
  cardName?: string;
  skillId?: string;
  targetIds?: string[];
  isResponse?: boolean;
  logMessage?: string;
  isEffectResult?: boolean;
}
