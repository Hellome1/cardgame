import { Player, Skill, SkillTrigger, SkillContext, Card, CardType, BasicCardName, SpellCardName, CardSuit, CardColor } from '../types/game';
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
   * 获取游戏引擎
   */
  getEngine(): GameEngine {
    return this.engine;
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
    const { player } = context;
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

  // ==================== 新增技能实现 ====================

  /**
   * 夏侯惇 - 刚烈：受到伤害后进行判定，若结果不为红桃，伤害来源弃置两张手牌或受到1点伤害
   */
  static ganglie(context: SkillContext): void {
    const { player, target, game } = context;
    console.log(`${player.character.name} 发动【刚烈】`);
    
    // 进行判定
    const deck = game.deck;
    if (deck.length === 0) {
      console.log('牌堆已空，无法判定');
      return;
    }
    
    const judgeCard = deck[0];
    game.deck = deck.slice(1);
    console.log(`${player.character.name} 【刚烈】判定: ${judgeCard.suit}${judgeCard.number} ${judgeCard.name}`);
    
    // 判定结果不为红桃时生效
    if (judgeCard.suit !== CardSuit.HEART) {
      console.log(`【刚烈】判定生效！`);
      
      if (target) {
        // 伤害来源弃置两张手牌或受到1点伤害
        if (target.handCards.length >= 2) {
          // 弃置两张手牌
          const discarded: string[] = [];
          for (let i = 0; i < 2; i++) {
            const card = target.handCards.pop();
            if (card) {
              game.discardPile.push(card);
              discarded.push(card.name);
            }
          }
          console.log(`${target.character.name} 弃置两张手牌: ${discarded.join('、')}`);
        } else {
          // 受到1点伤害
          target.character.hp -= 1;
          console.log(`${target.character.name} 受到【刚烈】的1点伤害`);
        }
      }
    } else {
      console.log(`【刚烈】判定未生效（红桃）`);
    }
    
    // 将判定牌放入弃牌堆
    game.discardPile.push(judgeCard);
  }

  /**
   * 张辽 - 突袭：摸牌阶段，改为获得至多两名其他角色的各一张手牌
   */
  static tuxi(context: SkillContext): void {
    const { player, game } = context;
    console.log(`${player.character.name} 发动【突袭】`);
    
    // 获取有手牌的其他角色
    const targets = game.players.filter(
      p => p.id !== player.id && !p.isDead && p.handCards.length > 0
    );
    
    if (targets.length === 0) {
      console.log('没有其他角色有手牌');
      return;
    }
    
    // 选择最多两名目标
    const selectedTargets = targets.slice(0, 2);
    
    for (const target of selectedTargets) {
      // 随机获得目标一张手牌
      const randomIndex = Math.floor(Math.random() * target.handCards.length);
      const stolenCard = target.handCards.splice(randomIndex, 1)[0];
      player.handCards.push(stolenCard);
      console.log(`${player.character.name} 【突袭】获得 ${target.character.name} 的 ${stolenCard.name}`);
    }
  }

  /**
   * 刘备 - 仁德：出牌阶段，将任意张手牌交给其他角色，给出第二张时回复1点体力
   */
  static rende(context: SkillContext): void {
    const { player, target } = context;
    console.log(`${player.character.name} 发动【仁德】`);
    
    if (!target) {
      console.log('需要选择目标');
      return;
    }
    
    // 简化版：给目标一张手牌
    if (player.handCards.length > 0) {
      const card = player.handCards.pop();
      if (card) {
        target.handCards.push(card);
        console.log(`${player.character.name} 【仁德】给 ${target.character.name} 一张 ${card.name}`);
      }
    }
  }

  /**
   * 关羽 - 武圣：将红色牌当杀使用或打出
   */
  static wusheng(context: SkillContext): void {
    const { player, target, game } = context;
    console.log(`${player.character.name} 发动【武圣】`);
    
    // 找到一张红色牌
    const redCardIndex = player.handCards.findIndex(card => card.color === 'red');
    if (redCardIndex === -1) {
      console.log('没有红色牌');
      return;
    }
    
    const redCard = player.handCards[redCardIndex];
    player.handCards.splice(redCardIndex, 1);
    game.discardPile.push(redCard);
    
    console.log(`${player.character.name} 【武圣】将 ${redCard.name} 当【杀】使用`);
    
    // 对目标造成伤害
    if (target) {
      target.character.hp -= 1;
      console.log(`${target.character.name} 受到【杀】的1点伤害`);
    }
  }

  /**
   * 诸葛亮 - 观星：准备阶段观看牌堆顶X张牌并调整顺序
   */
  static guanxing(context: SkillContext): void {
    const { player, game } = context;
    console.log(`${player.character.name} 发动【观星】`);
    
    // 计算X（存活角色数，最多5）
    const aliveCount = game.players.filter(p => !p.isDead).length;
    const x = Math.min(aliveCount, 5);
    
    if (game.deck.length < x) {
      console.log('牌堆牌数不足');
      return;
    }
    
    // 观看牌堆顶的X张牌
    const topCards = game.deck.slice(0, x);
    console.log(`${player.character.name} 【观星】观看牌堆顶的${x}张牌:`);
    topCards.forEach((card, index) => {
      console.log(`  ${index + 1}. ${card.suit}${card.number} ${card.name}`);
    });
  }

  /**
   * 诸葛亮 - 空城：锁定技，没有手牌时不能成为杀或决斗的目标
   */
  static kongcheng(context: SkillContext): void {
    const { player } = context;
    if (player.handCards.length === 0) {
      console.log(`${player.character.name} 的【空城】生效，没有手牌时不能成为【杀】或【决斗】的目标`);
    }
  }

  /**
   * 赵云 - 龙胆：将杀当闪，闪当杀使用或打出
   */
  static longdan(context: SkillContext): void {
    const { player, game } = context;
    console.log(`${player.character.name} 发动【龙胆】`);
    
    // 简化版：将闪当杀使用
    const dodgeIndex = player.handCards.findIndex(card => card.name === BasicCardName.DODGE);
    if (dodgeIndex !== -1) {
      const dodgeCard = player.handCards[dodgeIndex];
      player.handCards.splice(dodgeIndex, 1);
      game.discardPile.push(dodgeCard);
      console.log(`${player.character.name} 【龙胆】将【闪】当【杀】使用`);
    }
  }

  /**
   * 马超 - 铁骑：使用杀指定目标后判定，若不为红桃，目标需弃置同花色牌才能使用闪，且非锁定技失效
   */
  static tieji(context: SkillContext): void {
    const { player, target, game } = context;
    console.log(`${player.character.name} 发动【铁骑】`);

    // 进行判定
    const deck = game.deck;
    if (deck.length === 0) {
      console.log('牌堆已空，无法判定');
      return;
    }

    const judgeCard = deck[0];
    game.deck = deck.slice(1);
    console.log(`${player.character.name} 【铁骑】判定: ${judgeCard.suit}${judgeCard.number} ${judgeCard.name}`);

    // 将判定牌放入弃牌堆
    game.discardPile.push(judgeCard);

    // 判定结果不为红桃时生效
    if (judgeCard.suit !== CardSuit.HEART) {
      console.log(`【铁骑】判定生效！（不为红桃）`);

      if (target) {
        // 目标非锁定技失效
        console.log(`${target.character.name} 的非锁定技于此回合内失效`);

        // 目标需要弃置一张与判定牌花色相同的牌才能使用闪
        const sameSuitCards = target.handCards.filter(c => c.suit === judgeCard.suit);

        if (sameSuitCards.length === 0) {
          console.log(`${target.character.name} 没有${judgeCard.suit}花色的手牌，无法使用【闪】响应`);
        } else {
          console.log(`${target.character.name} 需弃置一张${judgeCard.suit}花色的手牌才能使用【闪】响应`);
          // 简化版：AI自动弃置
          if (target.isAI) {
            const cardToDiscard = sameSuitCards[0];
            const cardIndex = target.handCards.findIndex(c => c.id === cardToDiscard.id);
            if (cardIndex !== -1) {
              target.handCards.splice(cardIndex, 1);
              game.discardPile.push(cardToDiscard);
              console.log(`${target.character.name} 弃置了【${cardToDiscard.name}】以响应【铁骑】`);
            }
          }
        }
      }
    } else {
      console.log(`【铁骑】判定未生效（红桃）`);
    }
  }

  /**
   * 马超 - 马术：锁定技，计算与其他角色的距离时始终-1
   */
  static mashu(context: SkillContext): void {
    console.log(`${context.player.character.name} 的【马术】生效，与其他角色距离-1`);
  }

  /**
   * 孙权 - 制衡：出牌阶段限一次，弃置任意张牌，摸等量的牌
   */
  static zhiheng(context: SkillContext): void {
    const { player, game } = context;
    console.log(`${player.character.name} 发动【制衡】`);
    
    // 简化版：弃置所有手牌，摸等量的牌
    const discardCount = player.handCards.length;
    if (discardCount === 0) {
      console.log('没有手牌可以弃置');
      return;
    }
    
    // 弃置所有手牌
    player.handCards.forEach(card => {
      game.discardPile.push(card);
    });
    player.handCards = [];
    
    console.log(`${player.character.name} 【制衡】弃置${discardCount}张牌`);
    
    // 摸等量的牌
    const drawCount = Math.min(discardCount, game.deck.length);
    for (let i = 0; i < drawCount; i++) {
      const card = game.deck.shift();
      if (card) {
        player.handCards.push(card);
      }
    }
    
    console.log(`${player.character.name} 【制衡】摸${drawCount}张牌`);
  }

  /**
   * 华佗 - 青囊：出牌阶段限一次，弃置一张手牌，令一名已受伤的角色回复1点体力
   */
  static qingnang(context: SkillContext): void {
    const { player, target, game } = context;
    console.log(`${player.character.name} 发动【青囊】`);
    
    if (!target) {
      console.log('需要选择目标');
      return;
    }
    
    // 弃置一张手牌
    if (player.handCards.length === 0) {
      console.log('没有手牌可以弃置');
      return;
    }
    
    const discardCard = player.handCards.pop();
    if (discardCard) {
      game.discardPile.push(discardCard);
      console.log(`${player.character.name} 【青囊】弃置${discardCard.name}`);
    }
    
    // 目标回复1点体力
    if (target.character.hp < target.character.maxHp) {
      target.character.hp += 1;
      console.log(`${target.character.name} 【青囊】回复1点体力`);
    }
  }

  /**
   * 周瑜 - 反间：出牌阶段限一次，展示手牌给目标，目标猜花色，猜错受到1点伤害
   */
  static fanjian(context: SkillContext): void {
    const { player, target } = context;
    console.log(`${player.character.name} 发动【反间】`);
    
    if (!target) {
      console.log('需要选择目标');
      return;
    }
    
    if (player.handCards.length === 0) {
      console.log('没有手牌');
      return;
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
    } else {
      console.log(`${target.character.name} 猜对花色，获得${showCard.name}`);
    }
  }

  /**
   * 吕蒙 - 克己：出牌阶段未使用杀，跳过弃牌阶段
   */
  static keji(context: SkillContext): void {
    const { player } = context;
    console.log(`${player.character.name} 的【克己】生效，跳过弃牌阶段`);
  }

  /**
   * 大乔 - 国色：将方块牌当乐不思蜀使用
   */
  static guose(context: SkillContext): void {
    const { player, target, game } = context;
    console.log(`${player.character.name} 发动【国色】`);
    
    // 找到一张方块牌
    const diamondIndex = player.handCards.findIndex(card => card.suit === '♦');
    if (diamondIndex === -1) {
      console.log('没有方块牌');
      return;
    }
    
    const diamondCard = player.handCards[diamondIndex];
    player.handCards.splice(diamondIndex, 1);
    game.discardPile.push(diamondCard);
    
    console.log(`${player.character.name} 【国色】将${diamondCard.name}当【乐不思蜀】使用`);
    
    // 置于目标判定区
    if (target && !target.delayedSpells.indulgence) {
      // 创建乐不思蜀牌
      const indulgenceCard: Card = {
        id: `guose_${Date.now()}`,
        name: SpellCardName.INDULGENCE,
        type: CardType.SPELL,
        suit: CardSuit.DIAMOND,
        number: diamondCard.number,
        color: CardColor.RED,
        description: '出牌阶段，对一名其他角色使用。将【乐不思蜀】置于该角色的判定区里。',
      };
      target.delayedSpells.indulgence = indulgenceCard;
      console.log(`${player.character.name} 【国色】将【乐不思蜀】置于 ${target.character.name} 的判定区`);
    }
  }

  /**
   * 大乔 - 流离：成为杀的目标时，弃置一张牌转移给另一名角色
   */
  static liuli(context: SkillContext): void {
    const { player, target, game } = context;
    console.log(`${player.character.name} 发动【流离】`);
    
    if (player.handCards.length === 0) {
      console.log('没有手牌可以弃置');
      return;
    }
    
    // 弃置一张牌
    const discardCard = player.handCards.pop();
    if (discardCard) {
      game.discardPile.push(discardCard);
      console.log(`${player.character.name} 【流离】弃置${discardCard.name}`);
    }
    
    console.log(`${player.character.name} 【流离】将【杀】转移给${target?.character.name}`);
  }

  /**
   * 孙尚香 - 枭姬：失去装备区一张牌后摸两张牌
   */
  static xiaoji(context: SkillContext): void {
    const { player, game } = context;
    console.log(`${player.character.name} 发动【枭姬】`);
    
    // 摸两张牌
    const drawCount = Math.min(2, game.deck.length);
    for (let i = 0; i < drawCount; i++) {
      const card = game.deck.shift();
      if (card) {
        player.handCards.push(card);
      }
    }
    
    console.log(`${player.character.name} 【枭姬】失去装备，摸${drawCount}张牌`);
  }

  /**
   * 陆逊 - 谦逊：锁定技，不能成为顺手牵羊和乐不思蜀的目标
   */
  static qianxun(context: SkillContext): void {
    console.log(`${context.player.character.name} 的【谦逊】生效，不能成为【顺手牵羊】和【乐不思蜀】的目标`);
  }

  /**
   * 陆逊 - 连营：失去最后的手牌后摸一张牌
   */
  static lianying(context: SkillContext): void {
    const { player, game } = context;
    console.log(`${player.character.name} 发动【连营】`);
    
    // 摸一张牌
    if (game.deck.length > 0) {
      const card = game.deck.shift();
      if (card) {
        player.handCards.push(card);
        console.log(`${player.character.name} 【连营】失去最后的手牌，摸一张牌`);
      }
    }
  }

  /**
   * 袁绍 - 乱击：将两张花色相同的手牌当万箭齐发使用
   */
  static luanji(context: SkillContext): void {
    const { player, game } = context;
    console.log(`${player.character.name} 发动【乱击】`);
    
    // 找到两张花色相同的牌
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
      const card1 = player.handCards.splice(card1Index, 1)[0];
      const card2 = player.handCards.splice(card2Index > card1Index ? card2Index - 1 : card2Index, 1)[0];
      
      game.discardPile.push(card1, card2);
      console.log(`${player.character.name} 【乱击】将${card1.name}和${card2.name}当【万箭齐发】使用`);
    }
  }

  /**
   * 董卓 - 酒池：将黑桃手牌当酒使用
   */
  static jiuchi(context: SkillContext): void {
    const { player, game } = context;
    console.log(`${player.character.name} 发动【酒池】`);
    
    // 找到一张黑桃牌
    const spadeIndex = player.handCards.findIndex(card => card.suit === '♠');
    if (spadeIndex === -1) {
      console.log('没有黑桃牌');
      return;
    }
    
    const spadeCard = player.handCards[spadeIndex];
    player.handCards.splice(spadeIndex, 1);
    game.discardPile.push(spadeCard);
    
    console.log(`${player.character.name} 【酒池】将${spadeCard.name}当【酒】使用`);
  }

  /**
   * 贾诩 - 完杀：锁定技，回合内只有自己和濒死角色才能使用桃
   */
  static wansha(context: SkillContext): void {
    console.log(`${context.player.character.name} 的【完杀】生效，其他角色不能使用【桃】`);
  }

  /**
   * 贾诩 - 乱武：限定技，令所有其他角色选择对距离最近的角色出杀或失去1点体力
   */
  static luanwu(context: SkillContext): void {
    const { player, game } = context;
    console.log(`${player.character.name} 发动限定技【乱武】`);
    
    // 令所有其他角色依次选择
    const otherPlayers = game.players.filter(p => p.id !== player.id && !p.isDead);
    
    for (const otherPlayer of otherPlayers) {
      // 简化版：直接失去1点体力
      otherPlayer.character.hp -= 1;
      console.log(`${otherPlayer.character.name} 【乱武】失去1点体力`);
    }
  }
}
