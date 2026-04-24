import { Player, Skill, SkillTrigger, SkillContext } from '../types/game';
import { GameEngine } from './GameEngine';

/**
 * 技能管理器
 * 负责处理所有武将技能的触发和执行
 * 注意：技能系统已禁用，此类保留为空壳以兼容代码
 */
export class SkillManager {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  /**
   * 获取游戏引擎
   */
  getEngine(): GameEngine {
    return this.engine;
  }

  /**
   * 触发指定时机的技能
   * 技能系统已禁用，此方法不执行任何操作
   */
  triggerSkills(trigger: SkillTrigger, context: SkillContext): void {
    // 技能系统已禁用
  }

  /**
   * 检查玩家是否有指定触发时机的技能
   * 技能系统已禁用，始终返回 false
   */
  hasSkillWithTrigger(player: Player, trigger: SkillTrigger): boolean {
    return false;
  }

  /**
   * 获取玩家在指定触发时机的所有技能
   * 技能系统已禁用，始终返回空数组
   */
  getSkillsByTrigger(player: Player, trigger: SkillTrigger): Skill[] {
    return [];
  }

  /**
   * 类型安全地执行技能
   * 技能系统已禁用，始终返回 false
   */
  static executeSkillById(skillId: string, context: SkillContext): boolean {
    console.log(`技能系统已禁用，无法执行技能: ${skillId}`);
    return false;
  }

  /**
   * 检查技能是否存在
   * 技能系统已禁用，始终返回 false
   */
  static hasSkillExecutor(skillId: string): boolean {
    return false;
  }
}
