import {
  Player, Card, CardType, BasicCardName, SpellCardName,
  GamePhase, ResponseType, GameAction, DamageType
} from '../types/game';
import { GameEngine } from './GameEngine';
import { DistanceCalculator } from './DistanceCalculator';
import { GameLogger } from './GameLogger';
import { GAME_CONFIG, EQUIPMENT_KEY_MAP } from './GameConfig';

/**
 * 可偷/拆的牌项
 */
interface StealableItem {
  type: 'hand' | 'equipment';
  key?: string;
  card: Card;
}

/**
 * 卡牌效果执行器
 * 负责执行所有卡牌的效果
 */
export class CardEffectExecutor {
  private engine: GameEngine;
  private logger: GameLogger;

  constructor(engine: GameEngine, logger: GameLogger) {
    this.engine = engine;
    this.logger = logger;
  }

  /**
   * 执行卡牌效果
   * @returns 是否执行成功
   */
  executeCardEffect(
    player: Player,
    card: Card,
    targets: Player[],
    state: {
      phase: GamePhase;
      pendingResponse?: {
        request: {
          responseType?: ResponseType;
        };
        resolved: boolean;
      };
    }
  ): boolean {
    // 检查是否处于响应阶段且已有未完成的响应
    if (state.phase === GamePhase.RESPONSE && state.pendingResponse && !state.pendingResponse.resolved) {
      console.log('有未完成的响应，不能打出新牌');
      return false;
    }

    switch (card.type) {
      case CardType.BASIC:
        return this.executeBasicCard(player, card, targets);
      case CardType.SPELL:
        return this.executeSpellCard(player, card, targets);
      case CardType.EQUIPMENT:
        return this.executeEquipmentCard(player, card);
      default:
        return false;
    }
  }

  /**
   * 执行基本牌效果
   */
  private executeBasicCard(player: Player, card: Card, targets: Player[]): boolean {
    switch (card.name) {
      case BasicCardName.ATTACK:
      case BasicCardName.THUNDER_ATTACK:
      case BasicCardName.FIRE_ATTACK_CARD:
        return this.executeAttack(player, card, targets);
      case BasicCardName.PEACH:
        return this.executePeach(player);
      default:
        return false;
    }
  }

  /**
   * 执行杀的效果
   */
  private executeAttack(player: Player, card: Card, targets: Player[]): boolean {
    if (targets.length === 0) return false;
    const target = targets[0];
    if (target.isDead) return false;

    // 检查攻击距离
    const canAttack = DistanceCalculator.canAttack(player, target, this.engine.getState().players);
    if (!canAttack) {
      console.log(`${player.character.name} 无法攻击 ${target.character.name}，距离太远`);
      return false;
    }

    // 确定伤害类型
    const damageType: DamageType = card.name === BasicCardName.FIRE_ATTACK_CARD ? 'fire' :
      card.name === BasicCardName.THUNDER_ATTACK ? 'thunder' : 'normal';

    console.log(`${player.character.name} 对 ${target.character.name} 使用${card.name}，等待对方响应...`);

    // 创建响应请求
    this.engine.setPendingResponse({
      request: {
        targetPlayerId: target.id,
        sourcePlayerId: player.id,
        cardName: card.name,
        responseCardName: BasicCardName.DODGE,
        damage: 1,
        responseType: ResponseType.DODGE,
        damageType: damageType,
      },
      resolved: false,
      result: false,
    });

    // 设置游戏阶段为响应阶段
    this.engine.setPhase(GamePhase.RESPONSE);

    // 通知前端
    this.engine.notifyActionListeners({
      action: GameAction.PLAY_CARD,
      playerId: player.id,
      cardId: card.id,
      cardName: card.name,
      targetIds: [target.id],
      logMessage: `${player.character.name} 对 ${target.character.name} 使用了【${card.name}】`,
    });

    return true;
  }

  /**
   * 执行桃的效果
   */
  private executePeach(player: Player): boolean {
    // 自己血量不满时使用
    if (player.character.hp >= player.character.maxHp) {
      console.log(`${player.character.name} 体力已满，不需要使用桃`);
      return false;
    }

    this.engine.heal(player.id, GAME_CONFIG.HP.PEACH_HEAL);
    this.logger.logHeal(player, GAME_CONFIG.HP.PEACH_HEAL);

    return true;
  }

  /**
   * 执行锦囊牌效果
   */
  private executeSpellCard(player: Player, card: Card, targets: Player[]): boolean {
    switch (card.name) {
      case SpellCardName.DUEL:
        return this.executeDuel(player, card, targets);
      case SpellCardName.FIRE_ATTACK:
        return this.executeFireAttack(player, card, targets);
      case SpellCardName.STEAL:
        return this.executeSteal(player, card, targets);
      case SpellCardName.DISMANTLE:
        return this.executeDismantle(player, card, targets);
      case SpellCardName.PEACH_GARDEN:
        return this.executePeachGarden(player, card);
      case SpellCardName.ARCHERY:
      case SpellCardName.SAVAGE:
        // 这些在 GameEngine 中通过 startMultiTargetResponse 处理
        return true;
      default:
        return false;
    }
  }

  /**
   * 执行决斗效果
   */
  private executeDuel(player: Player, card: Card, targets: Player[]): boolean {
    if (targets.length === 0) return false;
    const target = targets[0];
    if (target.isDead) return false;

    // 启动决斗流程
    this.engine.startDuel(player, target);

    // 通知前端
    this.engine.notifyActionListeners({
      action: GameAction.PLAY_CARD,
      playerId: player.id,
      cardId: card.id,
      cardName: card.name,
      targetIds: [target.id],
      logMessage: `${player.character.name} 对 ${target.character.name} 发起了【决斗】`,
    });

    return true;
  }

  /**
   * 执行火攻效果
   */
  private executeFireAttack(player: Player, card: Card, targets: Player[]): boolean {
    if (targets.length === 0) return false;
    const target = targets[0];
    if (target.isDead) return false;

    // 检查目标是否有手牌
    if (target.handCards.length === 0) {
      console.log(`${target.character.name} 没有手牌，火攻无效`);
      return false;
    }

    // 目标随机展示一张手牌
    const shownCardIndex = Math.floor(Math.random() * target.handCards.length);
    const shownCard = target.handCards[shownCardIndex];

    console.log(`${target.character.name} 展示了手牌 [${shownCard.suit}${shownCard.number} ${shownCard.name}]`);

    // 检查使用者是否有同花色的手牌
    const sameSuitCards = player.handCards.filter(c =>
      c.suit === shownCard.suit && c.id !== card.id
    );

    if (sameSuitCards.length === 0) {
      console.log(`${player.character.name} 没有 ${shownCard.suit} 花色的手牌，无法造成伤害`);
      // 火攻仍然算使用成功，只是没有伤害
      this.logger.logSpell(player, card,
        `${player.character.name} 对 ${target.character.name} 使用了【火攻】，${target.character.name} 展示了 [${shownCard.suit}${shownCard.number} ${shownCard.name}]，但 ${player.character.name} 没有同花色手牌`,
        target.id
      );
      return true;
    }

    // 进入火攻响应阶段
    this.engine.setPhase(GamePhase.RESPONSE);
    this.engine.setPendingResponse({
      request: {
        targetPlayerId: player.id,
        sourcePlayerId: target.id,
        cardName: '火攻',
        responseCardName: `弃置一张${shownCard.suit}花色的手牌造成火焰伤害`,
        damage: 1,
        responseType: ResponseType.FIRE_ATTACK,
      },
      resolved: false,
      result: false,
      fireAttackState: {
        sourceId: player.id,
        targetId: target.id,
        shownCard: shownCard,
      },
    });

    // 通知前端
    this.logger.logSpell(player, card,
      `${player.character.name} 对 ${target.character.name} 使用了【火攻】，${target.character.name} 展示了 [${shownCard.suit}${shownCard.number} ${shownCard.name}]`,
      target.id
    );

    return true;
  }

  /**
   * 执行顺手牵羊效果
   */
  private executeSteal(player: Player, card: Card, targets: Player[]): boolean {
    if (targets.length === 0) return false;
    const target = targets[0];
    if (target.isDead) return false;

    // 检查距离限制
    const stealDistance = DistanceCalculator.calculateDistance(player, target, this.engine.getState().players);
    if (stealDistance > GAME_CONFIG.SPELL.STEAL_RANGE) {
      console.log(`${player.character.name} 无法对 ${target.character.name} 使用顺手牵羊，距离太远（距离: ${stealDistance}）`);
      return false;
    }

    // 获取目标所有可偷的牌
    const availableCards = this.getStealableCards(target);

    if (availableCards.length === 0) {
      console.log(`${target.character.name} 没有可以偷的牌`);
      return false;
    }

    // 随机选择一张牌
    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const stolenItem = availableCards[randomIndex];

    // 从目标处移除
    if (stolenItem.type === 'hand') {
      const cardIndex = target.handCards.findIndex(c => c.id === stolenItem.card.id);
      if (cardIndex !== -1) {
        target.handCards.splice(cardIndex, 1);
      }
    } else if (stolenItem.type === 'equipment' && stolenItem.key) {
      target.equipment[stolenItem.key as keyof Player['equipment']] = undefined;
    }

    // 给偷来的卡牌生成新的唯一ID
    const stolenCard = {
      ...stolenItem.card,
      id: GameEngine.generateUniqueCardId(),
    };

    // 加入自己的手牌
    player.handCards.push(stolenCard);

    const cardSource = stolenItem.type === 'hand' ? '手牌' : '装备区';
    this.logger.logSpell(player, card,
      `${player.character.name} 对 ${target.character.name} 使用了【顺手牵羊】，从${cardSource}获得了【${stolenCard.suit}${stolenCard.number} ${stolenCard.name}】`,
      target.id
    );

    return true;
  }

  /**
   * 执行过河拆桥效果
   */
  private executeDismantle(player: Player, card: Card, targets: Player[]): boolean {
    if (targets.length === 0) return false;
    const target = targets[0];
    if (target.isDead) return false;

    // 获取目标所有可弃置的牌
    const dismantleCards = this.getStealableCards(target);

    if (dismantleCards.length === 0) {
      console.log(`${target.character.name} 没有可以弃置的牌`);
      return false;
    }

    // 随机选择一张牌弃置
    const dismantleIndex = Math.floor(Math.random() * dismantleCards.length);
    const dismantleItem = dismantleCards[dismantleIndex];

    // 从目标处移除
    if (dismantleItem.type === 'hand') {
      const cardIndex = target.handCards.findIndex(c => c.id === dismantleItem.card.id);
      if (cardIndex !== -1) {
        target.handCards.splice(cardIndex, 1);
      }
    } else if (dismantleItem.type === 'equipment' && dismantleItem.key) {
      target.equipment[dismantleItem.key as keyof Player['equipment']] = undefined;
    }

    // 放入弃牌堆
    const state = this.engine.getState();
    state.discardPile.push(dismantleItem.card);

    const cardSource = dismantleItem.type === 'hand' ? '手牌' : '装备区';
    this.logger.logSpell(player, card,
      `${player.character.name} 对 ${target.character.name} 使用了【过河拆桥】，弃置了${cardSource}中的【${dismantleItem.card.suit}${dismantleItem.card.number} ${dismantleItem.card.name}】`,
      target.id
    );

    return true;
  }

  /**
   * 执行桃园结义效果
   */
  private executePeachGarden(player: Player, card: Card): boolean {
    const state = this.engine.getState();
    state.players.forEach(p => {
      if (!p.isDead && p.character.hp < p.character.maxHp) {
        this.engine.heal(p.id, GAME_CONFIG.HP.PEACH_HEAL);
      }
    });

    this.logger.logSpell(player, card,
      `${player.character.name} 使用了【桃园结义】，所有角色回复了1点体力`
    );

    return true;
  }

  /**
   * 执行装备牌效果
   */
  private executeEquipmentCard(player: Player, card: Card): boolean {
    if (!card.equipmentType) return false;

    const equipmentKey = EQUIPMENT_KEY_MAP[card.equipmentType];
    if (!equipmentKey) return false;

    // 检查是否已经装备了同一张牌
    const currentEquipment = player.equipment[equipmentKey];
    if (currentEquipment && currentEquipment.id === card.id) {
      console.log(`${player.character.name} 已经装备了 ${card.name}，无需重复装备`);
      return false;
    }

    // 如果有旧装备，先弃置
    if (currentEquipment) {
      const state = this.engine.getState();
      state.discardPile.push(currentEquipment);
      this.logger.logEquipment(player, card, true, currentEquipment);
    } else {
      this.logger.logEquipment(player, card, false);
    }

    // 装备新牌
    player.equipment[equipmentKey] = card;

    return true;
  }

  /**
   * 获取可偷/拆的牌列表
   */
  private getStealableCards(target: Player): StealableItem[] {
    const availableCards: StealableItem[] = [];

    // 添加手牌
    target.handCards.forEach(card => {
      availableCards.push({ type: 'hand', card });
    });

    // 添加装备区的牌
    if (target.equipment.weapon) {
      availableCards.push({ type: 'equipment', key: 'weapon', card: target.equipment.weapon });
    }
    if (target.equipment.armor) {
      availableCards.push({ type: 'equipment', key: 'armor', card: target.equipment.armor });
    }
    if (target.equipment.horsePlus) {
      availableCards.push({ type: 'equipment', key: 'horsePlus', card: target.equipment.horsePlus });
    }
    if (target.equipment.horseMinus) {
      availableCards.push({ type: 'equipment', key: 'horseMinus', card: target.equipment.horseMinus });
    }

    return availableCards;
  }
}
