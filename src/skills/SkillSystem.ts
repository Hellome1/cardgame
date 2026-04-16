import { Skill, SkillContext, SkillResult } from './base/Skill';
import { SkillRegistry } from './SkillRegistry';
import { Player, GameState, SkillTrigger } from '../types/game';
import { GameEngine } from '../game/GameEngine';

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
