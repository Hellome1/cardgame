import { SkillContext, SkillResult, PassiveSkill, LockedSkill, ActiveSkill } from '../base/Skill';
import { SkillTrigger, CardType } from '../../types/game';

/**
 * 孙权 - 制衡：出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌。
 */
export class ZhiHengSkill extends ActiveSkill {
  constructor() {
    super({
      id: 'zhiheng',
      name: '制衡',
      description: '出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌。',
      trigger: SkillTrigger.PLAY,
      maxUsePerTurn: 1,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有手牌才能弃置
    return context.player.handCards.length > 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 简化版：弃置所有手牌，摸等量的牌
    const discardCount = player.handCards.length;
    const discardedCards = [...player.handCards];

    // 弃置手牌
    player.handCards.forEach(card => {
      engine.getState().discardPile.push(card);
    });
    player.handCards = [];

    console.log(`${player.character.name} 【制衡】弃置${discardCount}张牌`);

    // 摸等量的牌
    const drawResult = engine['cardManager'].draw(engine.getState().deck, discardCount);
    player.handCards.push(...drawResult.cards);

    console.log(`${player.character.name} 【制衡】摸${drawResult.cards.length}张牌`);

    return {
      success: true,
      message: `${player.character.name} 发动【制衡】，弃置${discardCount}张牌并摸${drawResult.cards.length}张牌`,
      drawnCards: drawResult.cards,
      discardedCards: discardedCards,
    };
  }
}

/**
 * 周瑜 - 英姿：摸牌阶段，你可以多摸一张牌。
 */
export class YingZiSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'yingzi',
      name: '英姿',
      description: '摸牌阶段，你可以多摸一张牌。',
      trigger: SkillTrigger.ON_DRAW,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 牌堆需要有牌
    return context.game.deck.length > 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 额外摸一张牌
    const drawResult = engine['cardManager'].draw(engine.getState().deck, 1);
    if (drawResult.cards.length > 0) {
      player.handCards.push(...drawResult.cards);
      console.log(`${player.character.name} 【英姿】额外摸一张牌: ${drawResult.cards[0].name}`);
    }

    return {
      success: true,
      message: `${player.character.name} 发动【英姿】，额外摸一张牌`,
      drawnCards: drawResult.cards,
    };
  }
}

/**
 * 周瑜 - 反间：出牌阶段限一次，你可以展示一张手牌并交给一名其他角色，其选择一种花色后获得此牌，若选择的花色与此牌不同，你对其造成1点伤害。
 */
export class FanJianSkill extends ActiveSkill {
  constructor() {
    super({
      id: 'fanjian',
      name: '反间',
      description: '出牌阶段限一次，你可以展示一张手牌并交给一名其他角色，其选择一种花色后获得此牌，若选择的花色与此牌不同，你对其造成1点伤害。',
      trigger: SkillTrigger.PLAY,
      maxUsePerTurn: 1,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有手牌且有其他角色
    const hasCards = context.player.handCards.length > 0;
    const hasOtherPlayers = context.game.players.some(
      p => p.id !== context.player.id && !p.isDead
    );
    return hasCards && hasOtherPlayers;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, target } = context;

    if (!target) {
      return { success: false, message: '需要选择目标' };
    }

    // 选择一张手牌展示
    const showCard = player.handCards[0];
    console.log(`${player.character.name} 【反间】展示: ${showCard.suit}${showCard.number} ${showCard.name}`);

    // 将牌交给目标
    const cardIndex = player.handCards.indexOf(showCard);
    player.handCards.splice(cardIndex, 1);
    target.handCards.push(showCard);

    // 目标选择花色（简化版：随机选择）
    const suits = ['♠', '♥', '♣', '♦'];
    const chosenSuit = suits[Math.floor(Math.random() * suits.length)];
    console.log(`${target.character.name} 选择花色: ${chosenSuit}`);

    // 如果选择的花色与牌不同，造成1点伤害
    if (chosenSuit !== showCard.suit) {
      target.character.hp -= 1;
      console.log(`${target.character.name} 猜错花色，受到【反间】的1点伤害`);
      return {
        success: true,
        message: `${player.character.name} 发动【反间】，${target.character.name}猜错花色受到1点伤害`,
        affectedTargets: [target],
      };
    } else {
      console.log(`${target.character.name} 猜对花色，获得${showCard.name}`);
      return {
        success: true,
        message: `${player.character.name} 发动【反间】，${target.character.name}猜对花色获得此牌`,
        affectedTargets: [target],
      };
    }
  }

  get needsTarget(): boolean {
    return true;
  }
}

/**
 * 吕蒙 - 克己：若你于出牌阶段内未使用或打出过【杀】，你可以跳过弃牌阶段。
 */
export class KeJiSkill extends PassiveSkill {
  private hasUsedAttack: boolean = false;

  constructor() {
    super({
      id: 'keji',
      name: '克己',
      description: '若你于出牌阶段内未使用或打出过【杀】，你可以跳过弃牌阶段。',
      trigger: SkillTrigger.TURN_END,
    });
  }

  protected checkCanUse(_context: SkillContext): boolean {
    // 本回合未使用或打出过杀
    return !this.hasUsedAttack;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player } = context;

    console.log(`${player.character.name} 发动【克己】，跳过弃牌阶段`);

    return {
      success: true,
      message: `${player.character.name} 发动【克己】，跳过弃牌阶段`,
    };
  }

  /**
   * 标记本回合使用了杀
   */
  markAttackUsed(): void {
    this.hasUsedAttack = true;
  }

  onTurnStart(): void {
    super.onTurnStart();
    this.hasUsedAttack = false;
  }
}

/**
 * 黄盖 - 苦肉：出牌阶段，你可以失去1点体力，然后摸两张牌。
 */
export class KuRouSkill extends ActiveSkill {
  constructor() {
    super({
      id: 'kurou',
      name: '苦肉',
      description: '出牌阶段，你可以失去1点体力，然后摸两张牌。',
      trigger: SkillTrigger.PLAY,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要至少有1点体力
    return context.player.character.hp > 1;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 失去1点体力
    player.character.hp -= 1;
    console.log(`${player.character.name} 【苦肉】失去1点体力`);

    // 摸两张牌
    const drawResult = engine['cardManager'].draw(engine.getState().deck, 2);
    player.handCards.push(...drawResult.cards);

    console.log(`${player.character.name} 【苦肉】摸两张牌`);

    return {
      success: true,
      message: `${player.character.name} 发动【苦肉】，失去1点体力并摸两张牌`,
      drawnCards: drawResult.cards,
    };
  }
}

/**
 * 大乔 - 国色：你可以将一张方块牌当【乐不思蜀】使用。
 */
export class GuoSeSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'guose',
      name: '国色',
      description: '你可以将一张方块牌当【乐不思蜀】使用。',
      trigger: SkillTrigger.PLAY,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有方块牌
    return context.player.handCards.some(card => card.suit === '♦');
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 找到一张方块牌
    const diamondIndex = player.handCards.findIndex(card => card.suit === '♦');
    if (diamondIndex === -1) {
      return { success: false, message: '没有方块牌' };
    }

    const diamondCard = player.handCards[diamondIndex];
    player.handCards.splice(diamondIndex, 1);
    engine.getState().discardPile.push(diamondCard);

    console.log(`${player.character.name} 【国色】将${diamondCard.name}当【乐不思蜀】使用`);

    return {
      success: true,
      message: `${player.character.name} 发动【国色】，将方块牌当【乐不思蜀】使用`,
    };
  }

  get needsTarget(): boolean {
    return true;
  }
}

/**
 * 大乔 - 流离：当你成为【杀】的目标时，你可以弃置一张牌，将此【杀】转移给你攻击范围内的另一名其他角色。
 */
export class LiuLiSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'liuli',
      name: '流离',
      description: '当你成为【杀】的目标时，你可以弃置一张牌，将此【杀】转移给你攻击范围内的另一名其他角色。',
      trigger: SkillTrigger.ON_ATTACKED,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有手牌可以弃置
    return context.player.handCards.length > 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, target, engine } = context;

    // 弃置一张牌
    const discardCard = player.handCards.pop();
    if (discardCard) {
      engine.getState().discardPile.push(discardCard);
      console.log(`${player.character.name} 【流离】弃置${discardCard.name}`);
    }

    console.log(`${player.character.name} 【流离】将【杀】转移给${target?.character.name}`);

    return {
      success: true,
      message: `${player.character.name} 发动【流离】，将【杀】转移`,
    };
  }
}

/**
 * 孙尚香 - 枭姬：当你失去装备区里的一张牌后，你可以摸两张牌。
 */
export class XiaoJiSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'xiaoji',
      name: '枭姬',
      description: '当你失去装备区里的一张牌后，你可以摸两张牌。',
      trigger: SkillTrigger.ON_DISCARD,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要失去的是装备牌
    return context.card?.type === CardType.EQUIPMENT;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 摸两张牌
    const drawResult = engine['cardManager'].draw(engine.getState().deck, 2);
    player.handCards.push(...drawResult.cards);

    console.log(`${player.character.name} 【枭姬】失去装备，摸两张牌`);

    return {
      success: true,
      message: `${player.character.name} 发动【枭姬】，摸两张牌`,
      drawnCards: drawResult.cards,
    };
  }
}

/**
 * 陆逊 - 谦逊：锁定技，你不能成为【顺手牵羊】和【乐不思蜀】的目标。
 */
export class QianXunSkill extends LockedSkill {
  constructor() {
    super({
      id: 'qianxun',
      name: '谦逊',
      description: '锁定技，你不能成为【顺手牵羊】和【乐不思蜀】的目标。',
      trigger: SkillTrigger.ON_ATTACKED,
    });
  }

  protected onExecute(context: SkillContext): SkillResult {
    console.log(`${context.player.character.name} 的【谦逊】生效，不能成为【顺手牵羊】和【乐不思蜀】的目标`);
    return {
      success: true,
      message: '【谦逊】生效',
    };
  }
}

/**
 * 陆逊 - 连营：当你失去最后的手牌后，你可以摸一张牌。
 */
export class LianYingSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'lianying',
      name: '连营',
      description: '当你失去最后的手牌后，你可以摸一张牌。',
      trigger: SkillTrigger.ON_DISCARD,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要失去最后的手牌（当前手牌为0，且之前有牌）
    return context.player.handCards.length === 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 摸一张牌
    const drawResult = engine['cardManager'].draw(engine.getState().deck, 1);
    player.handCards.push(...drawResult.cards);

    console.log(`${player.character.name} 【连营】失去最后的手牌，摸一张牌`);

    return {
      success: true,
      message: `${player.character.name} 发动【连营】，摸一张牌`,
      drawnCards: drawResult.cards,
    };
  }
}
