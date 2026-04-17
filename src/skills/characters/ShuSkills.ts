import { SkillContext, SkillResult, PassiveSkill, LockedSkill, ActiveSkill } from '../base/Skill';
import { SkillTrigger, CardColor, BasicCardName } from '../../types/game';

/**
 * 刘备 - 仁德：出牌阶段，你可以将任意张手牌交给其他角色，然后你于此阶段内给出第二张"仁德"牌时，你回复1点体力。
 */
export class RenDeSkill extends ActiveSkill {
  private givenCardCount: number = 0;

  constructor() {
    super({
      id: 'rende',
      name: '仁德',
      description: '出牌阶段，你可以将任意张手牌交给其他角色，然后你于此阶段内给出第二张"仁德"牌时，你回复1点体力。',
      trigger: SkillTrigger.PLAY,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有手牌才能给出去
    return context.player.handCards.length > 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, target } = context;

    if (!target) {
      return { success: false, message: '需要选择目标' };
    }

    // 给目标一张手牌（简化版，实际应该让玩家选择）
    const card = player.handCards.pop();
    if (card) {
      target.handCards.push(card);
      this.givenCardCount++;

      console.log(`${player.character.name} 【仁德】给 ${target.character.name} 一张 ${card.name}`);

      // 给出第二张牌时回复1点体力
      if (this.givenCardCount === 2 && player.character.hp < player.character.maxHp) {
        player.character.hp += 1;
        console.log(`${player.character.name} 【仁德】回复1点体力`);
        return {
          success: true,
          message: `${player.character.name} 发动【仁德】，给出${card.name}并回复1点体力`,
        };
      }

      return {
        success: true,
        message: `${player.character.name} 发动【仁德】，给出${card.name}`,
      };
    }

    return { success: false, message: '没有手牌可以给出' };
  }

  get needsTarget(): boolean {
    return true;
  }

  onTurnStart(): void {
    super.onTurnStart();
    this.givenCardCount = 0;
  }
}

/**
 * 关羽 - 武圣：你可以将一张红色牌当【杀】使用或打出。
 */
export class WuShengSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'wusheng',
      name: '武圣',
      description: '你可以将一张红色牌当【杀】使用或打出。',
      trigger: SkillTrigger.PLAY,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有红色手牌
    return context.player.handCards.some(card => card.color === CardColor.RED);
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, target, engine } = context;

    // 找到一张红色牌
    const redCardIndex = player.handCards.findIndex(card => card.color === CardColor.RED);
    if (redCardIndex === -1) {
      return { success: false, message: '没有红色牌' };
    }

    const redCard = player.handCards[redCardIndex];
    console.log(`${player.character.name} 【武圣】将 ${redCard.name} 当【杀】使用`);

    // 将红色牌当杀使用
    // 移除手牌
    player.handCards.splice(redCardIndex, 1);
    // 放入弃牌堆
    engine.getState().discardPile.push(redCard);

    // 对目标造成伤害
    if (target) {
      target.character.hp -= 1;
      console.log(`${target.character.name} 受到【杀】的1点伤害`);
    }

    return {
      success: true,
      message: `${player.character.name} 发动【武圣】，将${redCard.name}当【杀】使用`,
    };
  }

  get needsTarget(): boolean {
    return true;
  }
}

/**
 * 张飞 - 咆哮：锁定技，你于出牌阶段内使用【杀】无次数限制。
 */
export class PaoXiaoSkill extends LockedSkill {
  constructor() {
    super({
      id: 'paoxiao',
      name: '咆哮',
      description: '锁定技，你于出牌阶段内使用【杀】无次数限制。',
      trigger: SkillTrigger.PLAY,
    });
  }

  protected onExecute(context: SkillContext): SkillResult {
    // 锁定技，自动生效，不需要执行具体操作
    // 在游戏引擎中检查此技能来跳过杀的次数限制
    console.log(`${context.player.character.name} 的【咆哮】生效，使用【杀】无次数限制`);
    return {
      success: true,
      message: '【咆哮】生效',
    };
  }
}

/**
 * 诸葛亮 - 观星：准备阶段，你可以观看牌堆顶的X张牌（X为存活角色数且至多为5），然后以任意顺序放回牌堆顶或牌堆底。
 */
export class GuanXingSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'guanxing',
      name: '观星',
      description: '准备阶段，你可以观看牌堆顶的X张牌（X为存活角色数且至多为5），然后以任意顺序放回牌堆顶或牌堆底。',
      trigger: SkillTrigger.TURN_START,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 牌堆需要有牌
    return context.game.deck.length > 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, game } = context;

    // 计算X（存活角色数，最多5）
    const aliveCount = game.players.filter(p => !p.isDead).length;
    const x = Math.min(aliveCount, 5);

    if (game.deck.length < x) {
      return { success: false, message: '牌堆牌数不足' };
    }

    // 观看牌堆顶的X张牌
    const topCards = game.deck.slice(0, x);
    console.log(`${player.character.name} 【观星】观看牌堆顶的${x}张牌:`);
    topCards.forEach((card, index) => {
      console.log(`  ${index + 1}. ${card.suit}${card.number} ${card.name}`);
    });

    // 简化版：直接放回牌堆顶（实际应该让玩家选择顺序和位置）
    console.log(`${player.character.name} 【观星】将牌放回牌堆顶`);

    return {
      success: true,
      message: `${player.character.name} 发动【观星】，观看牌堆顶的${x}张牌`,
    };
  }
}

/**
 * 诸葛亮 - 空城：锁定技，若你没有手牌，你不能成为【杀】或【决斗】的目标。
 */
export class KongChengSkill extends LockedSkill {
  constructor() {
    super({
      id: 'kongcheng',
      name: '空城',
      description: '锁定技，若你没有手牌，你不能成为【杀】或【决斗】的目标。',
      trigger: SkillTrigger.ON_ATTACKED,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 只有在没有手牌时才生效
    return context.player.handCards.length === 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    console.log(`${context.player.character.name} 的【空城】生效，没有手牌时不能成为【杀】或【决斗】的目标`);
    return {
      success: true,
      message: '【空城】生效',
    };
  }
}

/**
 * 赵云 - 龙胆：你可以将【杀】当【闪】，【闪】当【杀】使用或打出。
 */
export class LongDanSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'longdan',
      name: '龙胆',
      description: '你可以将【杀】当【闪】，【闪】当【杀】使用或打出。',
      trigger: SkillTrigger.PLAY,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有杀或闪
    return context.player.handCards.some(
      card => card.name === BasicCardName.ATTACK || card.name === BasicCardName.DODGE
    );
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 简化版：将闪当杀使用（实际应该根据情况选择）
    const dodgeIndex = player.handCards.findIndex(card => card.name === BasicCardName.DODGE);
    if (dodgeIndex !== -1) {
      const dodgeCard = player.handCards[dodgeIndex];
      player.handCards.splice(dodgeIndex, 1);
      engine.getState().discardPile.push(dodgeCard);

      console.log(`${player.character.name} 【龙胆】将【闪】当【杀】使用`);

      return {
        success: true,
        message: `${player.character.name} 发动【龙胆】，将【闪】当【杀】使用`,
      };
    }

    return { success: false, message: '没有可用的牌' };
  }
}

/**
 * 马超 - 铁骑：当你使用【杀】指定一个目标后，你可以进行判定，若结果为红色，该角色不能使用【闪】响应此【杀】。
 */
export class TieJiSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'tieji',
      name: '铁骑',
      description: '当你使用【杀】指定一个目标后，你可以进行判定，若结果为红色，该角色不能使用【闪】响应此【杀】。',
      trigger: SkillTrigger.AFTER_PLAY,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要使用了杀
    return context.card?.name === BasicCardName.ATTACK;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, target, engine } = context;

    // 进行判定
    const judgeResult = engine['cardManager'].draw(engine.getState().deck, 1);
    if (judgeResult.cards.length === 0) {
      return { success: false, message: '牌堆已空，无法判定' };
    }

    const judgeCard = judgeResult.cards[0];
    console.log(`${player.character.name} 【铁骑】判定: ${judgeCard.suit}${judgeCard.number} ${judgeCard.name}`);

    // 判定结果为红色时，目标不能使用闪
    if (judgeCard.color === CardColor.RED) {
      console.log(`【铁骑】判定生效！${target?.character.name} 不能使用【闪】响应`);
      return {
        success: true,
        message: '【铁骑】判定生效，目标不能使用【闪】',
      };
    } else {
      console.log(`【铁骑】判定未生效（黑色）`);
      return {
        success: true,
        message: '【铁骑】判定未生效',
      };
    }
  }
}
