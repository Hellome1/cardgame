import { Skill } from './base/Skill';
import { SkillTrigger } from '../types/game';

/**
 * 技能注册中心
 * 负责管理所有技能的注册和获取
 */
export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, new () => Skill> = new Map();

  static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  /**
   * 注册技能
   * @param skillClass 技能类
   */
  register(skillClass: new () => Skill): void {
    const tempInstance = new skillClass();
    this.skills.set(tempInstance.id, skillClass);
    console.log(`技能注册成功: ${tempInstance.name} (${tempInstance.id})`);
  }

  /**
   * 批量注册技能
   * @param skillClasses 技能类数组
   */
  registerMany(skillClasses: (new () => Skill)[]): void {
    skillClasses.forEach(skillClass => this.register(skillClass));
  }

  /**
   * 获取技能实例
   * @param skillId 技能ID
   * @returns 技能实例
   */
  getSkill(skillId: string): Skill | undefined {
    const SkillClass = this.skills.get(skillId);
    if (SkillClass) {
      return new SkillClass();
    }
    return undefined;
  }

  /**
   * 获取所有已注册的技能ID
   */
  getAllSkillIds(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * 检查技能是否已注册
   * @param skillId 技能ID
   */
  hasSkill(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  /**
   * 获取指定触发时机的所有技能
   * @param trigger 触发时机
   */
  getSkillsByTrigger(trigger: SkillTrigger): Skill[] {
    const result: Skill[] = [];
    for (const SkillClass of this.skills.values()) {
      const skill = new SkillClass();
      if (skill.trigger === trigger) {
        result.push(skill);
      }
    }
    return result;
  }

  /**
   * 清空所有已注册的技能
   */
  clear(): void {
    this.skills.clear();
    console.log('技能注册表已清空');
  }
}
