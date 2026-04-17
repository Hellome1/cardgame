// 统一的日志服务

import { Card } from '../../shared/types';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

export class LoggerService {
  private static instance: LoggerService;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private log(level: LogLevel, category: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 控制台输出
    const consoleMessage = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}] ${message}`;
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(consoleMessage, data || '');
        break;
      case LogLevel.INFO:
        console.log(consoleMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage, data || '');
        break;
      case LogLevel.ERROR:
        console.error(consoleMessage, data || '');
        break;
    }

    // 通知监听器
    this.listeners.forEach(listener => listener(entry));
  }

  debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  // 游戏相关日志
  game(message: string, data?: any): void {
    this.info('GAME', message, data);
  }

  // 卡牌相关日志
  card(message: string, data?: any): void {
    this.info('CARD', message, data);
  }

  // 技能相关日志
  skill(message: string, data?: any): void {
    this.info('SKILL', message, data);
  }

  // 牌堆相关日志
  deck(reason: string, cards: Card[], changedCards?: Card[]): void {
    this.info('DECK', reason, {
      cardCount: cards.length,
      changedCardCount: changedCards?.length || 0,
      cards: cards.map(c => ({
        id: c.id,
        name: c.name,
        suit: c.suit,
        number: c.number,
      })),
      changedCards: changedCards?.map(c => ({
        id: c.id,
        name: c.name,
        suit: c.suit,
        number: c.number,
      })),
    });
  }

  // 添加监听器
  addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 获取所有日志
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // 清空日志
  clear(): void {
    this.logs = [];
  }
}

// 导出单例实例
export const logger = LoggerService.getInstance();
