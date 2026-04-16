import { SkillContext, SkillResult, PassiveSkill, LockedSkill, ActiveSkill } from '../base/Skill';
import { SkillTrigger, BasicCardName } from '../../types/game';

/**
 * 吕布 - 无双：锁定技，当你使用【杀】指定一个目标后，该角色需依次使用两张【闪】才能抵消；
 * 当你使用【决斗】指定一个目标后，或成为一名角色使用【决斗】的目标后，该角色需依次打出两张【杀】才能响应。
 */
export class WuShuangSkill extends LockedSkill {
  constructor() {
    super({
      id: 'wushuang',
      name: '无双',
      description: '锁定技，当你使用【杀】指定一个目标后，该角色需依次使用两张【闪】才能抵消；当你使用【决斗】指定一个目标后，或成为一名角色使用【决斗】的目标后，该角色需依次打出两张【杀】才能响应。',
      trigger: SkillTrigger.PLAY,
    });
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, card } = context;

    if (card?.name === BasicCardName.ATTACK) {
      console.log(`${player.character.name} 的【无双】生效，目标需要两张【闪】才能抵消`);
    }

    return {
      success: true,
      message: '【无双】生效',
    };
  }
}

/**
 * 华佗 - 急救：你的回合外，你可以将一张红色牌当【桃】使用。
 */
export class JiJiuSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'jijiu',
      name: '急救',
      description: '你的回合外，你可以将一张红色牌当【桃】使用。',
      trigger: SkillTrigger.ON_HEAL,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要在回合外
    const isPlayerTurn = context.game.players[context.game.currentPlayerIndex].id === context.player.id;
    if (isPlayerTurn) {
      return false;
    }
    // 需要有红色牌
    return context.player.handCards.some(card => card.color === 'red');
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, target, engine } = context;

    // 找到一张红色牌
    const redCardIndex = player.handCards.findIndex(card => card.color === 'red');
    if (redCardIndex === -1) {
      return { success: false, message: '没有红色牌' };
    }

    const redCard = player.handCards[redCardIndex];
    player.handCards.splice(redCardIndex, 1);
    engine.getState().discardPile.push(redCard);

    // 回复1点体力
    if (target && target.character.hp < target.character.maxHp) {
      target.character.hp += 1;
      console.log(`${player.character.name} 【急救】将${redCard.name}当【桃】使用，${target.character.name}回复1点体力`);
    }

    return {
      success: true,
      message: `${player.character.name} 发动【急救】，将红色牌当【桃】使用`,
    };
  }

  get needsTarget(): boolean {
    return true;
  }
}

/**
 * 华佗 - 青囊：出牌阶段限一次，你可以弃置一张手牌，然后令一名已受伤的角色回复1点体力。
 */
export class QingNangSkill extends ActiveSkill {
  constructor() {
    super({
      id: 'qingnang',
      name: '青囊',
      description: '出牌阶段限一次，你可以弃置一张手牌，然后令一名已受伤的角色回复1点体力。',
      trigger: SkillTrigger.PLAY,
      maxUsePerTurn: 1,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有手牌
    if (context.player.handCards.length === 0) {
      return false;
    }
    // 需要有已受伤的角色
    return context.game.players.some(
      p => !p.isDead && p.character.hp < p.character.maxHp
    );
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, target, engine } = context;

    if (!target) {
      return { success: false, message: '需要选择目标' };
    }

    // 弃置一张手牌
    const discardCard = player.handCards.pop();
    if (discardCard) {
      engine.getState().discardPile.push(discardCard);
      console.log(`${player.character.name} 【青囊】弃置${discardCard.name}`);
    }

    // 目标回复1点体力
    if (target.character.hp < target.character.maxHp) {
      target.character.hp += 1;
      console.log(`${target.character.name} 【青囊】回复1点体力`);
    }

    return {
      success: true,
      message: `${player.character.name} 发动【青囊】，${target.character.name}回复1点体力`,
      affectedTargets: [target],
    };
  }

  get needsTarget(): boolean {
    return true;
  }
}

/**
 * 貂蝉 - 离间：出牌阶段限一次，你可以弃置一张牌，令一名男性角色视为对另一名男性角色使用一张【决斗】。
 */
export class LiJianSkill extends ActiveSkill {
  constructor() {
    super({
      id: 'lijian',
      name: '离间',
      description: '出牌阶段限一次，你可以弃置一张牌，令一名男性角色视为对另一名男性角色使用一张【决斗】。',
      trigger: SkillTrigger.PLAY,
      maxUsePerTurn: 1,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有手牌
    if (context.player.handCards.length === 0) {
      return false;
    }
    // 需要有两名男性角色
    const malePlayers = context.game.players.filter(
      p => !p.isDead && p.character.gender === 'male'
    );
    return malePlayers.length >= 2;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 弃置一张牌
    const discardCard = player.handCards.pop();
    if (discardCard) {
      engine.getState().discardPile.push(discardCard);
      console.log(`${player.character.name} 【离间】弃置${discardCard.name}`);
    }

    // 选择两名男性角色（简化版：随机选择）
    const malePlayers = context.game.players.filter(
      p => !p.isDead && p.character.gender === 'male'
    );

    if (malePlayers.length >= 2) {
      const challenger = malePlayers[0];
      const target = malePlayers[1];

      console.log(`${player.character.name} 【离间】令${challenger.character.name}对${target.character.name}使用【决斗】`);

      // TODO: 启动决斗流程
    }

    return {
      success: true,
      message: `${player.character.name} 发动【离间】`,
    };
  }
}

/**
 * 貂蝉 - 闭月：结束阶段，你可以摸一张牌。
 */
export class BiYueSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'biyue',
      name: '闭月',
      description: '结束阶段，你可以摸一张牌。',
      trigger: SkillTrigger.TURN_END,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 牌堆需要有牌
    return context.game.deck.length > 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 摸一张牌
    const drawResult = engine['cardManager'].draw(engine.getState().deck, 1);
    player.handCards.push(...drawResult.cards);

    console.log(`${player.character.name} 【闭月】摸一张牌`);

    return {
      success: true,
      message: `${player.character.name} 发动【闭月】，摸一张牌`,
      drawnCards: drawResult.cards,
    };
  }
}

/**
 * 袁绍 - 乱击：你可以将两张花色相同的手牌当【万箭齐发】使用。
 */
export class LuanJiSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'luanji',
      name: '乱击',
      description: '你可以将两张花色相同的手牌当【万箭齐发】使用。',
      trigger: SkillTrigger.PLAY,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要至少有两张手牌
    if (context.player.handCards.length < 2) {
      return false;
    }
    // 需要有两张花色相同的牌
    const suits = context.player.handCards.map(card => card.suit);
    const uniqueSuits = [...new Set(suits)];
    return uniqueSuits.length < suits.length;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 找到两张花色相同的牌（简化版）
    const handCards = player.handCards;
    let card1Index = -1;
    let card2Index = -1;

    for (let i = 0; i < handCards.length; i++) {
      for (let j = i + 1; j < handCards.length; j++) {
        if (handCards[i].suit === handCards[j].suit) {
          card1Index = i;
          card2Index = j;
          break;
        }
      }
      if (card1Index !== -1) break;
    }

    if (card1Index !== -1 && card2Index !== -1) {
      // 移除两张牌
      const card1 = player.handCards.splice(card1Index, 1)[0];
      const card2 = player.handCards.splice(card2Index > card1Index ? card2Index - 1 : card2Index, 1)[0];

      engine.getState().discardPile.push(card1, card2);

      console.log(`${player.character.name} 【乱击】将${card1.name}和${card2.name}当【万箭齐发】使用`);

      return {
        success: true,
        message: `${player.character.name} 发动【乱击】，将两张${card1.suit}花色的牌当【万箭齐发】使用`,
      };
    }

    return { success: false, message: '没有花色相同的牌' };
  }
}

/**
 * 董卓 - 酒池：你可以将一张黑桃手牌当【酒】使用。
 */
export class JiuChiSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'jiuchi',
      name: '酒池',
      description: '你可以将一张黑桃手牌当【酒】使用。',
      trigger: SkillTrigger.PLAY,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有黑桃牌
    return context.player.handCards.some(card => card.suit === '♠');
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine } = context;

    // 找到一张黑桃牌
    const spadeIndex = player.handCards.findIndex(card => card.suit === '♠');
    if (spadeIndex === -1) {
      return { success: false, message: '没有黑桃牌' };
    }

    const spadeCard = player.handCards[spadeIndex];
    player.handCards.splice(spadeIndex, 1);
    engine.getState().discardPile.push(spadeCard);

    console.log(`${player.character.name} 【酒池】将${spadeCard.name}当【酒】使用`);

    // 酒的效果：本回合下一张杀伤害+1
    // TODO: 实现酒的效果

    return {
      success: true,
      message: `${player.character.name} 发动【酒池】，将黑桃牌当【酒】使用`,
    };
  }
}

/**
 * 贾诩 - 完杀：锁定技，你的回合内，只有你和处于濒死状态的角色才能使用【桃】。
 */
export class WanShaSkill extends LockedSkill {
  constructor() {
    super({
      id: 'wansha',
      name: '完杀',
      description: '锁定技，你的回合内，只有你和处于濒死状态的角色才能使用【桃】。',
      trigger: SkillTrigger.PLAY,
    });
  }

  protected onExecute(context: SkillContext): SkillResult {
    console.log(`${context.player.character.name} 的【完杀】生效，其他角色不能使用【桃】`);
    return {
      success: true,
      message: '【完杀】生效',
    };
  }
}

/**
 * 贾诩 - 乱武：限定技，出牌阶段，你可以令所有其他角色依次选择一项：
 * 1.对距离最近的另一名角色使用一张【杀】；2.失去1点体力。
 */
export class LuanWuSkill extends ActiveSkill {
  private hasUsed: boolean = false;

  constructor() {
    super({
      id: 'luanwu',
      name: '乱武',
      description: '限定技，出牌阶段，你可以令所有其他角色依次选择一项：1.对距离最近的另一名角色使用一张【杀】；2.失去1点体力。',
      trigger: SkillTrigger.PLAY,
      maxUsePerGame: 1,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 限定技，整局游戏只能使用一次
    return !this.hasUsed;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, game } = context;

    this.hasUsed = true;
    console.log(`${player.character.name} 发动限定技【乱武】`);

    // 令所有其他角色依次选择
    const otherPlayers = game.players.filter(p => p.id !== player.id && !p.isDead);

    for (const otherPlayer of otherPlayers) {
      // 简化版：直接失去1点体力
      otherPlayer.character.hp -= 1;
      console.log(`${otherPlayer.character.name} 【乱武】失去1点体力`);
    }

    return {
      success: true,
      message: `${player.character.name} 发动限定技【乱武】`,
      affectedTargets: otherPlayers,
    };
  }
}
