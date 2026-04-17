// 技能工厂 - 统一管理所有技能实例

import { SkillConfig, SkillContext, SkillResult } from '../../shared/types';
import { SkillTrigger } from '../../shared/types/enums';
import { Skill } from './base/Skill';

// 技能注册表
export class SkillFactory {
  private static skillRegistry: Map<string, new () => Skill> = new Map();

  // 注册技能
  static register(skillId: string, SkillClass: new () => Skill): void {
    this.skillRegistry.set(skillId, SkillClass);
    console.log(`[SkillFactory] 注册技能: ${skillId}`);
  }

  // 创建技能实例
  static create(skillId: string): Skill | null {
    const SkillClass = this.skillRegistry.get(skillId);
    if (!SkillClass) {
      console.warn(`[SkillFactory] 未找到技能: ${skillId}`);
      return null;
    }
    return new SkillClass();
  }

  // 检查技能是否存在
  static has(skillId: string): boolean {
    return this.skillRegistry.has(skillId);
  }

  // 获取所有已注册的技能ID
  static getAllSkillIds(): string[] {
    return Array.from(this.skillRegistry.keys());
  }
}

// 辅助函数：批量注册技能
export function registerSkills(skills: Record<string, new () => Skill>): void {
  Object.entries(skills).forEach(([id, SkillClass]) => {
    SkillFactory.register(id, SkillClass);
  });
}
