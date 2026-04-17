// 技能相关类型定义

import { SkillTrigger } from './enums';
import { Player } from './player';
import { GameState } from './game';

// 技能上下文
export interface SkillContext {
  player: Player;
  game: GameState;
  engine: any; // 避免循环引用，使用 any
  target?: Player;
  card?: any;
  damage?: number;
  damageType?: 'normal' | 'fire' | 'thunder';
  source?: Player;
}

// 技能执行结果
export interface SkillResult {
  success: boolean;
  message?: string;
  affectedTargets?: Player[];
  drawnCards?: any[];
  discardedCards?: any[];
}

// 技能配置
export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  trigger: SkillTrigger;
  maxUsePerTurn?: number;
  maxUsePerGame?: number;
  distanceLimit?: number;
}

// 技能接口（统一新旧系统）
export interface ISkill {
  id: string;
  name: string;
  description: string;
  trigger: SkillTrigger;
  isPassive: boolean;
  execute(context: SkillContext): SkillResult;
}
