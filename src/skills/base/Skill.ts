import { Player, Card, GameState, SkillTrigger } from '../../types/game';
import { GameEngine } from '../../game/GameEngine';

/**
 * 技能类型
 */
export enum SkillType {
  ACTIVE = 'active',       // 主动技能
  PASSIVE = 'passive',     // 被动技能
  LOCKED = 'locked',       // 锁定技
  AWAKENING = 'awakening', // 觉醒技
  LIMITED = 'limited',     // 限定技
}

/**
 * 技能上下文
 */
export interface SkillContext {
  player: Player;
  game: GameState;
  engine: GameEngine;
  target?: Player;
  card?: Card;
  damage?: number;
  damageType?: 'normal' | 'fire' | 'thunder';
  source?: Player;
}

/**
 * 技能配置接口
 */
export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  trigger: SkillTrigger;
  maxUsePerTurn?: number;   // 每回合最大使用次数
  maxUsePerGame?: number;   // 每局游戏最大使用次数
  distanceLimit?: number;   // 距离限制
}

/**
 * 技能执行结果
 */
export interface SkillResult {
  success: boolean;
  message?: string;
  affectedTargets?: Player[];
  drawnCards?: Card[];
  discardedCards?: Card[];
}

/**
 * 技能基类
 * 所有具体技能都需要继承此类
 */
export abstract class Skill {
  readonly config: SkillConfig;
  protected useCountInTurn: number = 0;  // 本回合使用次数
  protected useCountInGame: number = 0;  // 本局游戏使用次数

  constructor(config: SkillConfig) {
    this.config = config;
  }

  /**
   * 获取技能ID
   */
  get id(): string {
    return this.config.id;
  }

  /**
   * 获取技能名称
   */
  get name(): string {
    return this.config.name;
  }

  /**
   * 获取技能描述
   */
  get description(): string {
    return this.config.description;
  }

  /**
   * 获取技能类型
   */
  get type(): SkillType {
    return this.config.type;
  }

  /**
   * 获取触发时机
   */
  get trigger(): SkillTrigger {
    return this.config.trigger;
  }

  /**
   * 是否是锁定技
   */
  get isLocked(): boolean {
    return this.config.type === SkillType.LOCKED;
  }

  /**
   * 检查技能是否可以使用
   * @param context 技能上下文
   */
  canUse(context: SkillContext): boolean {
    // 检查回合内使用次数限制
    if (this.config.maxUsePerTurn !== undefined) {
      if (this.useCountInTurn >= this.config.maxUsePerTurn) {
        return false;
      }
    }

    // 检查游戏内使用次数限制
    if (this.config.maxUsePerGame !== undefined) {
      if (this.useCountInGame >= this.config.maxUsePerGame) {
        return false;
      }
    }

    // 调用子类的具体检查逻辑
    return this.checkCanUse(context);
  }

  /**
   * 子类需要实现的检查逻辑
   * @param context 技能上下文
   */
  protected abstract checkCanUse(context: SkillContext): boolean;

  /**
   * 执行技能
   * @param context 技能上下文
   */
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

  /**
   * 子类需要实现的具体执行逻辑
   * @param context 技能上下文
   */
  protected abstract onExecute(context: SkillContext): SkillResult;

  /**
   * 回合开始时重置计数
   */
  onTurnStart(): void {
    this.useCountInTurn = 0;
  }

  /**
   * 获取技能提示信息（用于UI显示）
   */
  getHint(context: SkillContext): string {
    return '';
  }

  /**
   * 选择技能目标
   * @param context 技能上下文
   * @returns 目标玩家数组
   */
  selectTargets(context: SkillContext): Player[] {
    return [];
  }

  /**
   * 是否需要选择目标
   */
  get needsTarget(): boolean {
    return false;
  }
}

/**
 * 被动技能基类
 */
export abstract class PassiveSkill extends Skill {
  constructor(config: Omit<SkillConfig, 'type'>) {
    super({ ...config, type: SkillType.PASSIVE });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 被动技能自动触发，不需要检查是否可以使用
    return true;
  }
}

/**
 * 锁定技基类
 */
export abstract class LockedSkill extends Skill {
  constructor(config: Omit<SkillConfig, 'type'>) {
    super({ ...config, type: SkillType.LOCKED });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 锁定技必须发动
    return true;
  }
}

/**
 * 主动技能基类
 */
export abstract class ActiveSkill extends Skill {
  constructor(config: Omit<SkillConfig, 'type'>) {
    super({ ...config, type: SkillType.ACTIVE });
  }
}
