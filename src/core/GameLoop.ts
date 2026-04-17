import { GamePhase } from '../types/game';
import type { GameEngine } from '../game/GameEngine';

/**
 * 游戏循环管理器
 * 负责管理游戏的主循环和阶段流转
 */
export class GameLoop {
  private engine: GameEngine;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animationFrameId: number | null = null;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  /**
   * 启动游戏循环
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.loop();
  }

  /**
   * 停止游戏循环
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 暂停游戏循环
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * 恢复游戏循环
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * 游戏主循环
   */
  private loop(): void {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      this.update();
    }

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  /**
   * 更新游戏状态
   */
  private update(): void {
    const state = this.engine.getState();
    
    // 检查游戏是否结束
    if (state.phase === GamePhase.GAME_OVER) {
      this.stop();
      return;
    }

    // 处理当前阶段
    this.processCurrentPhase();
  }

  /**
   * 处理当前游戏阶段
   */
  private processCurrentPhase(): void {
    // 阶段处理逻辑由 GameEngine 处理
    // 这里可以添加额外的阶段控制逻辑
  }

  /**
   * 获取运行状态
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 获取暂停状态
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }
}
