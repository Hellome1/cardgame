import { GameEngine } from '../game/GameEngine';
import { SkillRegistry } from './SkillRegistry';

/**
 * 技能系统
 * 负责管理游戏中所有技能的触发和执行
 */
export class SkillSystem {
  private engine: GameEngine;
  private registry: SkillRegistry;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.registry = SkillRegistry.getInstance();
  }

  /**
   * 获取游戏引擎
   */
  getEngine(): GameEngine {
    return this.engine;
  }

  /**
   * 获取技能注册表
   */
  getRegistry(): SkillRegistry {
    return this.registry;
  }
}
