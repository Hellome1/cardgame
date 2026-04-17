import type { GameState, Player, Card } from '../types/game';

/**
 * 状态变更类型
 */
export type StateChangeType = 
  | 'playerUpdated'
  | 'cardMoved'
  | 'phaseChanged'
  | 'turnChanged'
  | 'damageDealt'
  | 'healingApplied'
  | 'skillTriggered'
  | 'cardPlayed';

/**
 * 状态变更记录
 */
export interface StateChange {
  type: StateChangeType;
  timestamp: number;
  data: any;
  previousState?: any;
}

/**
 * 状态管理器
 * 负责管理游戏状态的变更历史和快照
 */
export class StateManager {
  private changes: StateChange[] = [];
  private maxHistorySize: number = 100;
  private snapshots: Map<string, GameState> = new Map();

  /**
   * 记录状态变更
   */
  recordChange(type: StateChangeType, data: any, previousState?: any): void {
    const change: StateChange = {
      type,
      timestamp: Date.now(),
      data,
      previousState,
    };

    this.changes.push(change);

    // 限制历史记录大小
    if (this.changes.length > this.maxHistorySize) {
      this.changes.shift();
    }
  }

  /**
   * 获取变更历史
   */
  getChanges(type?: StateChangeType): StateChange[] {
    if (type) {
      return this.changes.filter(c => c.type === type);
    }
    return [...this.changes];
  }

  /**
   * 保存状态快照
   */
  saveSnapshot(id: string, state: GameState): void {
    // 深拷贝状态
    const snapshot = JSON.parse(JSON.stringify(state));
    this.snapshots.set(id, snapshot);
  }

  /**
   * 加载状态快照
   */
  loadSnapshot(id: string): GameState | null {
    const snapshot = this.snapshots.get(id);
    if (snapshot) {
      return JSON.parse(JSON.stringify(snapshot));
    }
    return null;
  }

  /**
   * 删除状态快照
   */
  deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }

  /**
   * 清空所有快照
   */
  clearSnapshots(): void {
    this.snapshots.clear();
  }

  /**
   * 清空变更历史
   */
  clearHistory(): void {
    this.changes = [];
  }

  /**
   * 获取玩家状态变更历史
   */
  getPlayerChanges(playerId: string): StateChange[] {
    return this.changes.filter(c => 
      c.data?.playerId === playerId || 
      c.data?.targetId === playerId
    );
  }

  /**
   * 获取卡牌移动历史
   */
  getCardMoveHistory(cardId: string): StateChange[] {
    return this.changes.filter(c => 
      c.type === 'cardMoved' && c.data?.cardId === cardId
    );
  }

  /**
   * 设置最大历史记录大小
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    // 裁剪现有记录
    while (this.changes.length > this.maxHistorySize) {
      this.changes.shift();
    }
  }
}

// 全局状态管理器实例
export const globalStateManager = new StateManager();
