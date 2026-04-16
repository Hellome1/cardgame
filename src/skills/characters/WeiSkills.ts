import { SkillContext, SkillResult, PassiveSkill, LockedSkill, ActiveSkill } from '../base/Skill';
import { SkillTrigger, CardSuit, BasicCardName } from '../../types/game';

/**
 * 曹操 - 奸雄：当你受到伤害后，你可以获得对你造成伤害的牌，并摸一张牌。
 */
export class JianXiongSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'jianxiong',
      name: '奸雄',
      description: '当你受到伤害后，你可以获得对你造成伤害的牌，并摸一张牌。',
      trigger: SkillTrigger.ON_DAMAGE,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有造成伤害的牌
    return context.card !== undefined;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, card, engine } = context;
    
    if (card) {
      // 将伤害牌加入手牌
      player.handCards.push(card);
      console.log(`${player.character.name} 【奸雄】获得伤害牌: ${card.name}`);
      
      // 摸一张牌
      const drawResult = engine['cardManager'].draw(engine.getState().deck, 1);
      if (drawResult.cards.length > 0) {
        player.handCards.push(...drawResult.cards);
        console.log(`${player.character.name} 【奸雄】摸一张牌: ${drawResult.cards[0].name}`);
      }
      
      return {
        success: true,
        message: `${player.character.name} 发动【奸雄】，获得${card.name}并摸一张牌`,
        drawnCards: drawResult.cards,
      };
    }
    
    return {
      success: false,
      message: '没有可获得的伤害牌',
    };
  }
}

/**
 * 司马懿 - 反馈：当你受到伤害后，你可以获得伤害来源的一张牌。
 */
export class FanKuiSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'fankui',
      name: '反馈',
      description: '当你受到伤害后，你可以获得伤害来源的一张牌。',
      trigger: SkillTrigger.ON_DAMAGE,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有伤害来源且来源有手牌
    return context.source !== undefined && 
           context.source.handCards.length > 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, source } = context;
    
    if (source && source.handCards.length > 0) {
      // 随机获得伤害来源一张手牌
      const randomIndex = Math.floor(Math.random() * source.handCards.length);
      const stolenCard = source.handCards.splice(randomIndex, 1)[0];
      player.handCards.push(stolenCard);
      
      console.log(`${player.character.name} 【反馈】获得 ${source.character.name} 的 ${stolenCard.name}`);
      
      return {
        success: true,
        message: `${player.character.name} 发动【反馈】，获得${source.character.name}的一张手牌`,
      };
    }
    
    return {
      success: false,
      message: '伤害来源没有手牌',
    };
  }
}

/**
 * 司马懿 - 鬼才：当一名角色的判定牌生效前，你可以打出一张手牌代替之。
 */
export class GuiCaiSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'guicai',
      name: '鬼才',
      description: '当一名角色的判定牌生效前，你可以打出一张手牌代替之。',
      trigger: SkillTrigger.BEFORE_PLAY,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有手牌才能代替判定
    return context.player.handCards.length > 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, engine, card } = context;

    console.log(`${player.character.name} 发动【鬼才】`);

    // 选择一张手牌来替换判定牌（简化版：选择第一张手牌）
    const replacementCard = player.handCards[0];
    if (!replacementCard) {
      return { success: false, message: '没有手牌可以替换判定牌' };
    }

    // 从手牌中移除选中的牌
    player.handCards.splice(0, 1);

    // 将原判定牌放入弃牌堆（如果有）
    if (card) {
      engine.getState().discardPile.push(card);
      console.log(`${player.character.name} 【鬼才】将原判定牌 ${card.name} 放入弃牌堆`);
    }

    // 将替换的牌作为新的判定牌
    // 注意：实际游戏中需要将这张牌放到判定区作为新的判定牌
    // 这里简化处理，直接返回成功，由调用方处理判定逻辑

    console.log(`${player.character.name} 【鬼才】用 ${replacementCard.name} 替换了判定牌`);

    return {
      success: true,
      message: `${player.character.name} 发动【鬼才】，用${replacementCard.name}替换了判定牌`,
      affectedTargets: [player],
    };
  }
}

/**
 * 夏侯惇 - 刚烈：当你受到伤害后，你可以进行判定，若结果不为红桃，伤害来源弃置两张手牌或受到1点伤害。
 */
export class GangLieSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'ganglie',
      name: '刚烈',
      description: '当你受到伤害后，你可以进行判定，若结果不为红桃，伤害来源弃置两张手牌或受到1点伤害。',
      trigger: SkillTrigger.ON_DAMAGE,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    return context.source !== undefined;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, source, engine } = context;
    
    // 进行判定
    const judgeResult = engine['cardManager'].draw(engine.getState().deck, 1);
    if (judgeResult.cards.length === 0) {
      return { success: false, message: '牌堆已空，无法判定' };
    }
    
    const judgeCard = judgeResult.cards[0];
    console.log(`${player.character.name} 【刚烈】判定: ${judgeCard.suit}${judgeCard.number} ${judgeCard.name}`);
    
    // 判定结果不为红桃时生效
    if (judgeCard.suit !== CardSuit.HEART) {
      console.log(`【刚烈】判定生效！`);
      
      if (source) {
        // 伤害来源弃置两张手牌或受到1点伤害
        if (source.handCards.length >= 2) {
          // 弃置两张手牌
          const discarded: string[] = [];
          for (let i = 0; i < 2; i++) {
            const card = source.handCards.pop();
            if (card) {
              engine.getState().discardPile.push(card);
              discarded.push(card.name);
            }
          }
          console.log(`${source.character.name} 弃置两张手牌: ${discarded.join('、')}`);
        } else {
          // 受到1点伤害
          source.character.hp -= 1;
          console.log(`${source.character.name} 受到【刚烈】的1点伤害`);
        }
      }
      
      return {
        success: true,
        message: '【刚烈】判定生效',
      };
    } else {
      console.log(`【刚烈】判定未生效（红桃）`);
      return {
        success: true,
        message: '【刚烈】判定未生效',
      };
    }
  }
}

/**
 * 张辽 - 突袭：摸牌阶段，你可以改为获得至多两名其他角色的各一张手牌。
 */
export class TuXiSkill extends PassiveSkill {
  constructor() {
    super({
      id: 'tuxi',
      name: '突袭',
      description: '摸牌阶段，你可以改为获得至多两名其他角色的各一张手牌。',
      trigger: SkillTrigger.ON_DRAW,
    });
  }

  protected checkCanUse(context: SkillContext): boolean {
    // 需要有其他角色有手牌
    const otherPlayers = context.game.players.filter(
      p => p.id !== context.player.id && !p.isDead && p.handCards.length > 0
    );
    return otherPlayers.length > 0;
  }

  protected onExecute(context: SkillContext): SkillResult {
    const { player, game, engine } = context;
    
    // 获取有手牌的其他角色
    const targets = game.players.filter(
      p => p.id !== player.id && !p.isDead && p.handCards.length > 0
    );
    
    if (targets.length === 0) {
      return { success: false, message: '没有其他角色有手牌' };
    }
    
    // 选择最多两名目标
    const selectedTargets = targets.slice(0, 2);
    const stolenCards: string[] = [];
    
    for (const target of selectedTargets) {
      // 随机获得目标一张手牌
      const randomIndex = Math.floor(Math.random() * target.handCards.length);
      const stolenCard = target.handCards.splice(randomIndex, 1)[0];
      player.handCards.push(stolenCard);
      stolenCards.push(`${target.character.name}的${stolenCard.name}`);
      console.log(`${player.character.name} 【突袭】获得 ${target.character.name} 的 ${stolenCard.name}`);
    }
    
    return {
      success: true,
      message: `${player.character.name} 发动【突袭】，获得${stolenCards.join('、')}`,
      affectedTargets: selectedTargets,
    };
  }
}
