import { Player, Skill, SkillTrigger, SkillContext, Card, CardType, BasicCardName, SpellCardName, GamePhase } from '../types/game';
import { GameEngine } from './GameEngine';

/**
 * 技能管理器
 * 负责处理所有武将技能的触发和执行
 */
export class SkillManager {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  /**
   * 触发指定时机的技能
   * @param trigger 技能触发时机
   * @param context 技能上下文
   */
  triggerSkills(trigger: SkillTrigger, context: SkillContext): void {
    const players = context.game.players.filter(p => !p.isDead);
    
    for (const player of players) {
      for (const skill of player.character.skills) {
        if (skill.trigger === trigger) {
          this.executeSkill(skill, { ...context, player });
        }
      }
    }
  }

  /**
   * 执行单个技能
   * @param skill 要执行的技能
   * @param context 技能上下文
   */
  private executeSkill(skill: Skill, context: SkillContext): void {
    console.log(`触发技能: ${skill.name} (${context.player.character.name})`);
    
    try {
      skill.execute(context);
    } catch (error) {
      console.error(`技能执行失败: ${skill.name}`, error);
    }
  }

  /**
   * 检查玩家是否有指定触发时机的技能
   * @param player 玩家
   * @param trigger 触发时机
   */
  hasSkillWithTrigger(player: Player, trigger: SkillTrigger): boolean {
    return player.character.skills.some(skill => skill.trigger === trigger);
  }

  /**
   * 获取玩家在指定触发时机的所有技能
   * @param player 玩家
   * @param trigger 触发时机
   */
  getSkillsByTrigger(player: Player, trigger: SkillTrigger): Skill[] {
    return player.character.skills.filter(skill => skill.trigger === trigger);
  }

  // ==================== 具体技能实现 ====================

  /**
   * 周瑜 - 英姿：摸牌阶段多摸一张牌
   */
  static yingzi(context: SkillContext): void {
    const { player, game } = context;
    console.log(`${player.character.name} 发动【英姿】，摸牌阶段多摸一张牌`);
    // 在摸牌阶段额外摸一张牌
    // 这个效果需要在 GameEngine 的 drawPhase 中处理
  }

  /**
   * 张飞 - 咆哮：出牌阶段使用杀无次数限制
   */
  static paoxiao(context: SkillContext): void {
    // 锁定技，在出牌阶段检查杀的使用次数时跳过限制
    console.log(`${context.player.character.name} 的【咆哮】生效，使用杀无次数限制`);
  }

  /**
   * 黄盖 - 苦肉：失去1点体力，摸两张牌
   */
  static kurou(context: SkillContext): void {
    const { player } = context;
    console.log(`${player.character.name} 发动【苦肉】`);
    // 失去1点体力
    // 摸两张牌
  }

  /**
   * 曹操 - 奸雄：受到伤害后获得伤害牌并摸一张牌
   */
  static jianxiong(context: SkillContext): void {
    const { player, card } = context;
    console.log(`${player.character.name} 发动【奸雄】`);
    if (card) {
      console.log(`获得伤害牌: ${card.name}`);
      // 将伤害牌加入手牌
      // 摸一张牌
    }
  }

  /**
   * 司马懿 - 反馈：受到伤害后获得伤害来源一张牌
   */
  static fankui(context: SkillContext): void {
    const { player, target } = context;
    console.log(`${player.character.name} 发动【反馈】`);
    if (target && target.handCards.length > 0) {
      // 从伤害来源随机获得一张牌
      const randomCard = target.handCards[Math.floor(Math.random() * target.handCards.length)];
      console.log(`获得 ${target.character.name} 的 ${randomCard.name}`);
    }
  }

  /**
   * 吕布 - 无双：目标需两张闪/杀才能响应
   */
  static wushuang(context: SkillContext): void {
    console.log(`${context.player.character.name} 的【无双】生效`);
    // 在响应阶段检查时需要两张闪/杀
  }

  /**
   * 华佗 - 急救：将红色牌当桃使用
   */
  static jijiu(context: SkillContext): void {
    console.log(`${context.player.character.name} 发动【急救】`);
    // 在需要打出桃时，可以将红色牌当桃使用
  }

  /**
   * 貂蝉 - 闭月：结束阶段摸一张牌
   */
  static biyue(context: SkillContext): void {
    const { player } = context;
    console.log(`${player.character.name} 发动【闭月】，摸一张牌`);
    // 摸一张牌
  }
}
