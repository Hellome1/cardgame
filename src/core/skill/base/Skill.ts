// 统一的技能基类

import { ISkill, SkillConfig, SkillContext, SkillResult } from '../../../shared/types';
import { SkillType, SkillTrigger } from '../../../shared/types/enums';

export abstract class Skill implements ISkill {
  readonly config: SkillConfig & { type: SkillType };
  protected useCountInTurn: number = 0;
  protected useCountInGame: number = 0;

  constructor(config: SkillConfig & { type: SkillType }) {
    this.config = config;
  }

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get description(): string {
    return this.config.description;
  }

  get trigger(): SkillTrigger {
    return this.config.trigger;
  }

  get isPassive(): boolean {
    return this.config.type === SkillType.PASSIVE;
  }

  get isLocked(): boolean {
    return this.config.type === SkillType.LOCKED;
  }

  canUse(context: SkillContext): boolean {
    if (this.config.maxUsePerTurn !== undefined) {
      if (this.useCountInTurn >= this.config.maxUsePerTurn) {
        return false;
      }
    }

    if (this.config.maxUsePerGame !== undefined) {
      if (this.useCountInGame >= this.config.maxUsePerGame) {
        return false;
      }
    }

    return this.checkCanUse(context);
  }

  protected abstract checkCanUse(context: SkillContext): boolean;

  execute(context: SkillContext): SkillResult {
    console.log(`${context.player.character.name} 发动【${this.name}】`);

    try {
      const result = this.onExecute(context);

      if (result.success) {
        this.useCountInTurn++;
        this.useCountInGame++;
      }

      return result;
    } catch (error) {
      console.error(`技能【${this.name}】执行失败:`, error);
      return {
        success: false,
        message: `技能执行失败: ${error}`,
      };
    }
  }

  protected abstract onExecute(context: SkillContext): SkillResult;

  onTurnStart(): void {
    this.useCountInTurn = 0;
  }

  getHint(_context: SkillContext): string {
    return '';
  }

  selectTargets(_context: SkillContext): any[] {
    return [];
  }

  get needsTarget(): boolean {
    return false;
  }
}

export abstract class ActiveSkill extends Skill {
  constructor(config: SkillConfig) {
    super({ ...config, type: SkillType.ACTIVE });
  }
}

export abstract class PassiveSkill extends Skill {
  constructor(config: SkillConfig) {
    super({ ...config, type: SkillType.PASSIVE });
  }

  protected checkCanUse(_context: SkillContext): boolean {
    return true;
  }
}

export abstract class LockedSkill extends Skill {
  constructor(config: SkillConfig) {
    super({ ...config, type: SkillType.LOCKED });
  }

  protected checkCanUse(_context: SkillContext): boolean {
    return true;
  }
}
