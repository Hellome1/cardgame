import { Card, Player, GameAction } from '../types/game';

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'action' | 'damage' | 'heal' | 'equipment' | 'spell';
  playerId?: string;
  targetId?: string;
  cardId?: string;
}

/**
 * 游戏日志系统
 * 统一管理游戏日志的记录、存储和通知
 */
export class GameLogger {
  private logs: LogEntry[] = [];
  private listeners: ((entry: LogEntry) => void)[] = [];
  private maxLogs: number = 1000; // 最大日志数量，防止内存溢出

  /**
   * 添加日志监听器
   */
  onLog(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 记录日志
   */
  log(
    message: string,
    type: LogEntry['type'] = 'info',
    options?: {
      playerId?: string;
      targetId?: string;
      cardId?: string;
    }
  ): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      message,
      type,
      ...options,
    };

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 通知监听器
    this.listeners.forEach(listener => listener(entry));

    // 同时输出到控制台
    console.log(`[${type}] ${message}`);
  }

  /**
   * 记录动作日志
   */
  logAction(
    action: GameAction,
    player: Player,
    message: string,
    options?: {
      targetId?: string;
      cardId?: string;
    }
  ): void {
    this.log(message, 'action', {
      playerId: player.id,
      ...options,
    });
  }

  /**
   * 记录伤害日志
   */
  logDamage(
    source: Player,
    target: Player,
    amount: number,
    damageType?: 'normal' | 'fire' | 'thunder'
  ): void {
    const damageTypeText = damageType === 'fire' ? '火焰' : damageType === 'thunder' ? '雷电' : '';
    const message = `${target.character.name} 受到 ${amount} 点${damageTypeText}伤害`;
    this.log(message, 'damage', {
      playerId: source.id,
      targetId: target.id,
    });
  }

  /**
   * 记录治疗日志
   */
  logHeal(player: Player, amount: number): void {
    const message = `${player.character.name} 回复了 ${amount} 点体力`;
    this.log(message, 'heal', {
      playerId: player.id,
    });
  }

  /**
   * 记录装备日志
   */
  logEquipment(
    player: Player,
    card: Card,
    isReplace: boolean = false,
    oldCard?: Card
  ): void {
    let message: string;
    if (isReplace && oldCard) {
      message = `${player.character.name} 替换装备：弃置了【${oldCard.suit}${oldCard.number} ${oldCard.name}】，装备了【${card.suit}${card.number} ${card.name}】`;
    } else {
      message = `${player.character.name} 装备了【${card.suit}${card.number} ${card.name}】`;
    }
    this.log(message, 'equipment', {
      playerId: player.id,
      cardId: card.id,
    });
  }

  /**
   * 记录锦囊牌日志
   */
  logSpell(
    player: Player,
    card: Card,
    message: string,
    targetId?: string
  ): void {
    this.log(message, 'spell', {
      playerId: player.id,
      targetId,
      cardId: card.id,
    });
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取最近的日志
   */
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * 导出日志为文本
   */
  exportToText(): string {
    return this.logs
      .map(log => {
        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleTimeString();
        return `[${timeStr}] ${log.message}`;
      })
      .join('\n');
  }
}
