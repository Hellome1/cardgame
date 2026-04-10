import { 
  GameState, Player, Identity, GamePhase, 
  ActionRequest, GameAction, Card, CardType, BasicCardName, SpellCardName
} from '../types/game';
import { CardManager } from './CardManager';
import { CharacterManager } from './CharacterManager';
import { AIPlayer } from './AIPlayer';
import { DistanceCalculator } from './DistanceCalculator';

export class GameEngine {
  private state: GameState;
  private cardManager: CardManager;
  private characterManager: CharacterManager;
  private actionListeners: ((action: ActionRequest) => void)[] = [];
  private aiPlayer: AIPlayer;

  constructor(playerCount: number = 4) {
    this.cardManager = CardManager.getInstance();
    this.characterManager = CharacterManager.getInstance();
    this.state = this.initializeGame(playerCount);
    this.aiPlayer = new AIPlayer(this);
  }

  private initializeGame(playerCount: number): GameState {
    // 创建牌堆
    const deck = this.cardManager.createStandardDeck();
    
    // 分配身份
    const identities = this.assignIdentities(playerCount);
    
    // 随机选择武将
    const characters = this.characterManager.getRandomCharacters(playerCount);
    
    // 创建玩家
    const players: Player[] = characters.map((char, index) => {
      const isAI = index !== 0; // 第一个玩家是人类，其他是AI
      const { cards } = this.cardManager.draw(deck, 4); // 初始4张牌
      
      return {
        id: `player_${index}`,
        character: { ...char, hp: char.maxHp },
        identity: identities[index],
        handCards: cards,
        equipment: {},
        isDead: false,
        isAI,
      };
    });

    return {
      players,
      currentPlayerIndex: 0,
      phase: GamePhase.GAME_START,
      deck: deck.slice(players.length * 4),
      discardPile: [],
      round: 1,
    };
  }

  private assignIdentities(count: number): Identity[] {
    const identities: Identity[] = [];
    
    // 主公
    identities.push(Identity.LORD);
    
    // 根据人数分配其他身份
    if (count === 4) {
      identities.push(Identity.LOYALIST, Identity.REBEL, Identity.TRAITOR);
    } else if (count === 5) {
      identities.push(Identity.LOYALIST, Identity.REBEL, Identity.REBEL, Identity.TRAITOR);
    } else {
      // 默认4人配置
      identities.push(Identity.LOYALIST, Identity.REBEL, Identity.TRAITOR);
    }
    
    // 打乱身份
    return identities.sort(() => Math.random() - 0.5);
  }

  // 获取游戏状态
  getState(): GameState {
    return { ...this.state };
  }

  // 获取当前玩家
  getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  // 开始游戏
  startGame(): void {
    this.state.phase = GamePhase.TURN_START;
    this.processTurn();
  }

  // 处理回合
  private processTurn(): void {
    const currentPlayer = this.getCurrentPlayer();
    
    if (currentPlayer.isDead) {
      this.nextTurn();
      return;
    }

    console.log(`processTurn: ${currentPlayer.character.name}, 阶段: ${this.state.phase}`);

    switch (this.state.phase) {
      case GamePhase.TURN_START:
        this.handleTurnStart();
        break;
      case GamePhase.JUDGMENT:
        this.handleJudgment();
        break;
      case GamePhase.DRAW:
        this.handleDraw();
        break;
      case GamePhase.PLAY:
        // 如果是AI玩家，自动执行
        if (currentPlayer.isAI) {
          this.handleAIPlay(currentPlayer).then(() => {
            // AI执行完后自动进入弃牌阶段
            if (this.state.phase === GamePhase.PLAY) {
              this.state.phase = GamePhase.DISCARD;
              this.processTurn();
            }
          });
        }
        break;
      case GamePhase.RESPONSE:
        // 响应阶段：等待目标玩家响应（打出闪）
        // 这个阶段由玩家操作或AI自动响应触发，不需要自动处理
        console.log(`响应阶段: 等待 ${this.state.pendingResponse?.request.targetPlayerId} 响应`);
        break;
      case GamePhase.DISCARD:
        this.handleDiscard();
        break;
      case GamePhase.TURN_END:
        this.handleTurnEnd();
        break;
    }
  }

  // 回合开始阶段
  private handleTurnStart(): void {
    console.log(`回合开始: ${this.getCurrentPlayer().character.name}`);
    this.state.phase = GamePhase.JUDGMENT;
    this.processTurn();
  }

  // 判定阶段
  private handleJudgment(): void {
    // 处理延时锦囊判定（简化版暂不实现）
    this.state.phase = GamePhase.DRAW;
    this.processTurn();
  }

  // 摸牌阶段
  private handleDraw(): void {
    const player = this.getCurrentPlayer();
    const drawResult = this.cardManager.draw(this.state.deck, 2);
    
    player.handCards.push(...drawResult.cards);
    this.state.deck = drawResult.remaining;
    
    console.log(`${player.character.name} 摸了 ${drawResult.cards.length} 张牌，当前手牌: ${player.handCards.length}`);
    
    this.state.phase = GamePhase.PLAY;
    // 继续执行下一阶段
    this.processTurn();
  }

  // 处理AI出牌
  private async handleAIPlay(player: Player): Promise<void> {
    console.log(`开始执行 AI ${player.character.name} 的回合`);
    await this.aiPlayer.playTurn(player);
    console.log(`AI ${player.character.name} 的回合执行完成`);
  }

  // 出牌阶段
  playCard(playerId: string, cardId: string, targetIds?: string[]): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isDead) {
      console.log(`出牌失败: 玩家不存在或已死亡`);
      return false;
    }
    
    const cardIndex = player.handCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      console.log(`出牌失败: 找不到卡牌 ${cardId}`);
      return false;
    }
    
    const card = player.handCards[cardIndex];
    console.log(`${player.character.name} 尝试使用 ${card.name}`);
    
    // 执行卡牌效果
    const effectSuccess = this.executeCardEffect(player, card, targetIds);
    if (!effectSuccess) {
      console.log(`出牌失败: 卡牌效果执行失败`);
      return false;
    }
    
    // 移除手牌
    player.handCards.splice(cardIndex, 1);
    
    // 装备牌会被executeEquipmentCard放到装备区，不需要再放到弃牌堆
    // 只有非装备牌才放到弃牌堆
    if (card.type !== CardType.EQUIPMENT) {
      this.state.discardPile.push(card);
    }
    
    console.log(`${player.character.name} 成功使用了 ${card.name}`);
    
    // 通知监听器时带上卡牌名称（用于动画显示）
    const actionWithCardName: ActionRequest = {
      ...(targetIds ? { playerId, cardId, targetIds } : { playerId, cardId }),
      action: GameAction.PLAY_CARD,
      cardName: card.name,
    };
    this.actionListeners.forEach(listener => listener(actionWithCardName));
    
    return true;
  }

  // 执行卡牌效果
  private executeCardEffect(player: Player, card: Card, targetIds?: string[]): boolean {
    const targets = targetIds?.map(id => this.state.players.find(p => p.id === id)).filter(Boolean) as Player[] || [];
    
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

  // 执行基本牌效果
  private executeBasicCard(player: Player, card: Card, targets: Player[]): boolean {
    switch (card.name) {
      case BasicCardName.ATTACK:
        // 杀：对目标造成1点伤害
        if (targets.length === 0) return false;
        const target = targets[0];
        if (target.isDead) return false;
        
        // 检查攻击距离
        const canAttack = DistanceCalculator.canAttack(player, target, this.state.players);
        if (!canAttack) {
          console.log(`${player.character.name} 无法攻击 ${target.character.name}，距离太远`);
          return false;
        }
        
        console.log(`${player.character.name} 对 ${target.character.name} 使用杀，等待对方响应...`);
        
        // 创建响应请求
        this.state.pendingResponse = {
          request: {
            targetPlayerId: target.id,
            sourcePlayerId: player.id,
            cardName: BasicCardName.ATTACK,
            responseCardName: BasicCardName.DODGE,
            damage: 1,
          },
          resolved: false,
          result: false,
        };
        
        // 进入响应阶段
        this.state.phase = GamePhase.RESPONSE;
        
        // 如果是AI被攻击，自动响应
        if (target.isAI) {
          this.processAIResponse(target);
        }
        
        return true;
        
      case BasicCardName.DODGE:
        // 闪：只能在响应时使用，不能直接打出
        return false;
        
      case BasicCardName.PEACH:
        // 桃：回复1点体力
        if (player.character.hp >= player.character.maxHp) return false;
        this.heal(player.id, 1);
        return true;
        
      default:
        return false;
    }
  }

  // 执行锦囊牌效果
  private executeSpellCard(player: Player, card: Card, targets: Player[]): boolean {
    switch (card.name) {
      case SpellCardName.DUEL:
        // 决斗：与目标拼杀
        if (targets.length === 0) return false;
        const duelTarget = targets[0];
        if (duelTarget.isDead) return false;
        // 简化版：目标受到1点伤害
        this.dealDamage(player.id, duelTarget.id, 1);
        return true;
        
      case SpellCardName.FIRE_ATTACK:
        // 火攻：对目标造成1点伤害
        if (targets.length === 0) return false;
        const fireTarget = targets[0];
        if (fireTarget.isDead) return false;
        this.dealDamage(player.id, fireTarget.id, 1);
        return true;
        
      case SpellCardName.STEAL:
        // 顺手牵羊：获得目标一张牌（距离限制为1）
        if (targets.length === 0) return false;
        const stealTarget = targets[0];
        if (stealTarget.isDead || stealTarget.handCards.length === 0) return false;
        
        // 检查距离限制（顺手牵羊距离为1）
        const stealDistance = DistanceCalculator.calculateDistance(player, stealTarget, this.state.players);
        if (stealDistance > 1) {
          console.log(`${player.character.name} 无法对 ${stealTarget.character.name} 使用顺手牵羊，距离太远（距离: ${stealDistance}）`);
          return false;
        }
        
        // 简化版：随机获得目标一张手牌
        const stolenCard = stealTarget.handCards.pop();
        if (stolenCard) {
          player.handCards.push(stolenCard);
          console.log(`${player.character.name} 从 ${stealTarget.character.name} 处获得了 ${stolenCard.name}`);
        }
        return true;
        
      case SpellCardName.DISMANTLE:
        // 过河拆桥：弃置目标一张牌
        if (targets.length === 0) return false;
        const dismantleTarget = targets[0];
        if (dismantleTarget.isDead || dismantleTarget.handCards.length === 0) return false;
        // 简化版：随机弃置目标一张手牌
        const dismantledCard = dismantleTarget.handCards.pop();
        if (dismantledCard) {
          this.state.discardPile.push(dismantledCard);
          console.log(`${player.character.name} 弃置了 ${dismantleTarget.character.name} 的 ${dismantledCard.name}`);
        }
        return true;
        
      case SpellCardName.PEACH_GARDEN:
        // 桃园结义：所有角色回复1点体力
        this.state.players.forEach(p => {
          if (!p.isDead && p.character.hp < p.character.maxHp) {
            this.heal(p.id, 1);
          }
        });
        return true;
        
      case SpellCardName.ARCHERY:
        // 万箭齐发：所有其他角色需出闪，否则受到1点伤害
        this.state.players.forEach(p => {
          if (p.id !== player.id && !p.isDead) {
            // 简化版：直接造成伤害
            this.dealDamage(player.id, p.id, 1);
          }
        });
        return true;
        
      case SpellCardName.SAVAGE:
        // 南蛮入侵：所有其他角色需出杀，否则受到1点伤害
        this.state.players.forEach(p => {
          if (p.id !== player.id && !p.isDead) {
            // 简化版：直接造成伤害
            this.dealDamage(player.id, p.id, 1);
          }
        });
        return true;
        
      case SpellCardName.DRAW_TWO:
        // 无中生有：摸两张牌
        const { cards } = this.cardManager.draw(this.state.deck, 2);
        player.handCards.push(...cards);
        this.state.deck = this.state.deck.slice(2);
        console.log(`${player.character.name} 摸了 ${cards.length} 张牌`);
        return true;
        
      default:
        return false;
    }
  }

  // 执行装备牌效果
  private executeEquipmentCard(player: Player, card: Card): boolean {
    // 将装备放入装备区
    if (!card.equipmentType) return false;
    
    // 如果有旧装备，先弃置
    const oldEquipment = player.equipment[card.equipmentType];
    if (oldEquipment) {
      this.state.discardPile.push(oldEquipment);
    }
    
    // 装备新牌
    player.equipment[card.equipmentType] = card;
    console.log(`${player.character.name} 装备了 ${card.name}`);
    return true;
  }

  // 弃牌阶段
  private handleDiscard(): void {
    const player = this.getCurrentPlayer();
    const maxCards = player.character.hp;
    
    console.log(`弃牌阶段: ${player.character.name}, 手牌${player.handCards.length}, 上限${maxCards}`);
    
    if (player.handCards.length > maxCards) {
      const cardsToDiscard = player.handCards.length - maxCards;
      
      if (player.isAI) {
        console.log(`AI ${player.character.name} 自动弃牌 ${cardsToDiscard} 张`);
        // AI自动弃牌 - 优先弃基本牌
        const sortedCards = [...player.handCards].sort((a, b) => {
          const priority = { [CardType.BASIC]: 0, [CardType.SPELL]: 1, [CardType.EQUIPMENT]: 2 };
          return priority[a.type] - priority[b.type];
        });
        
        const cardsToRemove = sortedCards.slice(0, cardsToDiscard);
        cardsToRemove.forEach(card => {
          const index = player.handCards.findIndex(c => c.id === card.id);
          if (index !== -1) {
            const removedCard = player.handCards.splice(index, 1)[0];
            this.state.discardPile.push(removedCard);
            console.log(`${player.character.name} 弃置了 ${removedCard.name}`);
          }
        });
        
        // AI弃牌完成后通知监听器（只通知一次）
        this.actionListeners.forEach(listener => listener({
          action: GameAction.DISCARD_CARD,
          playerId: player.id,
        }));
        
        this.state.phase = GamePhase.TURN_END;
        this.processTurn();
      } else {
        // 人类玩家需要手动弃牌 - 等待玩家操作
        console.log(`${player.character.name} 需要弃置 ${cardsToDiscard} 张牌`);
        // 不自动进入下一阶段，等待玩家点击卡牌弃牌
      }
    } else {
      console.log(`${player.character.name} 不需要弃牌`);
      this.state.phase = GamePhase.TURN_END;
      this.processTurn();
    }
  }

  // 弃牌 - 一次弃一张，检查是否还需要继续弃牌（用于人类玩家）
  discardCards(playerId: string, cardIds: string[]): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;
    
    let hasDiscarded = false;
    
    cardIds.forEach(cardId => {
      const index = player.handCards.findIndex(c => c.id === cardId);
      if (index !== -1) {
        const card = player.handCards.splice(index, 1)[0];
        this.state.discardPile.push(card);
        console.log(`${player.character.name} 弃置了 ${card.name}`);
        hasDiscarded = true;
      }
    });
    
    // 检查是否还需要弃牌
    const maxCards = player.character.hp;
    if (player.handCards.length <= maxCards) {
      // 弃牌完成，进入回合结束
      this.state.phase = GamePhase.TURN_END;
      this.processTurn();
    }
    
    return true;
  }

  // 回合结束阶段
  private handleTurnEnd(): void {
    const player = this.getCurrentPlayer();
    console.log(`回合结束: ${player.character.name}`);
    this.nextTurn();
  }

  // 下一回合
  private nextTurn(): void {
    const currentPlayer = this.getCurrentPlayer();
    console.log(`${currentPlayer.character.name} 的回合结束，进入下一回合`);
    
    do {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      if (this.state.currentPlayerIndex === 0) {
        this.state.round++;
      }
    } while (this.getCurrentPlayer().isDead);
    
    const nextPlayer = this.getCurrentPlayer();
    console.log(`下一回合: ${nextPlayer.character.name}`);
    
    this.state.phase = GamePhase.TURN_START;
    this.processTurn();
  }

  // 结束出牌阶段
  endPlayPhase(playerId: string): boolean {
    const player = this.getCurrentPlayer();
    if (player.id !== playerId) return false;
    
    this.state.phase = GamePhase.DISCARD;
    this.processTurn();
    return true;
  }

  // 造成伤害
  dealDamage(fromId: string, toId: string, amount: number): void {
    const fromPlayer = this.state.players.find(p => p.id === fromId);
    const target = this.state.players.find(p => p.id === toId);
    if (!target || target.isDead) return;
    
    target.character.hp -= amount;
    console.log(`${target.character.name} 受到 ${amount} 点伤害，剩余体力: ${target.character.hp}`);
    
    // 触发受伤技能（简化版）
    this.triggerSkill(target, 'ON_DAMAGE', { fromPlayer, amount });
    
    if (target.character.hp <= 0) {
      console.log(`${target.character.name} 体力降至0或以下，准备处理死亡`);
      this.handleDeath(target);
    }
  }

  // 触发技能（简化版）
  private triggerSkill(player: Player, trigger: string, context: any): void {
    player.character.skills.forEach(skill => {
      if (skill.trigger === trigger && !skill.isPassive) {
        console.log(`${player.character.name} 触发了技能 ${skill.name}`);
        // 这里可以执行技能效果
      }
    });
  }

  // 回复体力
  heal(playerId: string, amount: number): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isDead) return;
    
    const oldHp = player.character.hp;
    player.character.hp = Math.min(player.character.hp + amount, player.character.maxHp);
    const healedAmount = player.character.hp - oldHp;
    
    if (healedAmount > 0) {
      // 触发治疗技能
      this.triggerSkill(player, 'ON_HEAL', { amount: healedAmount });
    }
  }

  // 处理死亡
  private handleDeath(player: Player): void {
    player.isDead = true;
    console.log(`${player.character.name} 阵亡！`);
    
    // 弃置所有牌
    this.state.discardPile.push(...player.handCards);
    player.handCards = [];
    
    // 弃置装备区的装备
    if (player.equipment.weapon) {
      this.state.discardPile.push(player.equipment.weapon);
      player.equipment.weapon = undefined;
    }
    if (player.equipment.armor) {
      this.state.discardPile.push(player.equipment.armor);
      player.equipment.armor = undefined;
    }
    if (player.equipment.horsePlus) {
      this.state.discardPile.push(player.equipment.horsePlus);
      player.equipment.horsePlus = undefined;
    }
    if (player.equipment.horseMinus) {
      this.state.discardPile.push(player.equipment.horseMinus);
      player.equipment.horseMinus = undefined;
    }
    
    // 检查游戏结束
    this.checkGameOver();
  }

  // 检查游戏结束
  private checkGameOver(): void {
    const alivePlayers = this.state.players.filter(p => !p.isDead);
    const aliveIdentities = alivePlayers.map(p => p.identity);
    
    console.log(`检查游戏结束: 存活玩家=${alivePlayers.length}, 存活身份=${aliveIdentities}`);
    
    // 主公死亡
    const lordPlayer = this.state.players.find(p => p.identity === Identity.LORD);
    const lordDead = lordPlayer?.isDead;
    
    console.log(`主公=${lordPlayer?.character.name}, isDead=${lordDead}`);
    
    if (lordDead) {
      console.log('主公死亡，检查胜利者...');
      // 如果内奸是唯一存活的，内奸胜利
      const onlyTraitorAlive = alivePlayers.length === 1 && alivePlayers[0].identity === Identity.TRAITOR;
      if (onlyTraitorAlive) {
        this.state.winner = Identity.TRAITOR;
        console.log('内奸胜利！');
      } else {
        this.state.winner = Identity.REBEL;
        console.log('反贼胜利！');
      }
      this.state.phase = GamePhase.GAME_OVER;
      console.log('游戏结束！');
    } else if (!aliveIdentities.includes(Identity.REBEL) && !aliveIdentities.includes(Identity.TRAITOR)) {
      // 主公和忠臣胜利
      this.state.winner = Identity.LORD;
      this.state.phase = GamePhase.GAME_OVER;
      console.log('主公和忠臣胜利！');
    }
  }

  // 添加动作监听器
  onAction(listener: (action: ActionRequest) => void): void {
    this.actionListeners.push(listener);
  }

  // 执行动作
  executeAction(action: ActionRequest): boolean {
    let success = false;
    
    switch (action.action) {
      case GameAction.PLAY_CARD:
        if (action.cardId) {
          success = this.playCard(action.playerId, action.cardId, action.targetIds);
        }
        break;
      case GameAction.END_TURN:
        success = this.endPlayPhase(action.playerId);
        break;
      case GameAction.DISCARD_CARD:
        if (action.cardId) {
          success = this.discardCards(action.playerId, [action.cardId]);
        }
        break;
    }
    
    if (success) {
      this.actionListeners.forEach(listener => listener(action));
    }
    
    return success;
  }

  // 处理玩家响应（打出闪等）
  respondToAttack(playerId: string, cardId?: string): boolean {
    const pendingResponse = this.state.pendingResponse;
    if (!pendingResponse) {
      console.log(`respondToAttack 失败: 没有待处理的响应`);
      return false;
    }
    if (pendingResponse.resolved) {
      console.log(`respondToAttack 失败: 响应已解决`);
      return false;
    }
    if (pendingResponse.request.targetPlayerId !== playerId) {
      console.log(`respondToAttack 失败: 玩家ID不匹配 ${playerId} vs ${pendingResponse.request.targetPlayerId}`);
      return false;
    }

    const targetPlayer = this.state.players.find(p => p.id === playerId);
    const sourcePlayer = this.state.players.find(p => p.id === pendingResponse.request.sourcePlayerId);
    if (!targetPlayer || !sourcePlayer) {
      console.log(`respondToAttack 失败: 找不到玩家`);
      return false;
    }
    
    console.log(`respondToAttack: ${targetPlayer.character.name} ${cardId ? '打出响应牌' : '不响应'}`);

    if (cardId) {
      // 玩家打出了响应牌
      const responseCard = targetPlayer.handCards.find(c => c.id === cardId);
      if (!responseCard || responseCard.name !== pendingResponse.request.responseCardName) {
        return false;
      }

      // 移除打出的响应牌
      const cardIndex = targetPlayer.handCards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        const playedCard = targetPlayer.handCards.splice(cardIndex, 1)[0];
        this.state.discardPile.push(playedCard);
      }

      console.log(`${targetPlayer.character.name} 打出了【${responseCard.name}】，抵消了【${pendingResponse.request.cardName}】`);
      
      pendingResponse.resolved = true;
      pendingResponse.result = true;
      pendingResponse.responseCardId = cardId;

      // 响应成功，不造成伤害，返回出牌阶段
      this.state.pendingResponse = undefined;
      this.state.phase = GamePhase.PLAY;
      
      // 通知监听器响应完成
      this.actionListeners.forEach(listener => listener({
        action: GameAction.PLAY_CARD,
        playerId: targetPlayer.id,
        cardId: cardId,
      }));
      
      return true;
    } else {
      // 玩家选择不响应
      console.log(`${targetPlayer.character.name} 没有打出【${pendingResponse.request.responseCardName}】，受到${pendingResponse.request.damage}点伤害`);
      
      pendingResponse.resolved = true;
      pendingResponse.result = false;

      // 造成伤害
      this.dealDamage(pendingResponse.request.sourcePlayerId, playerId, pendingResponse.request.damage);

      // 清除响应状态，返回出牌阶段
      this.state.pendingResponse = undefined;
      this.state.phase = GamePhase.PLAY;
      
      // 通知监听器响应完成（不传cardId表示不响应）
      this.actionListeners.forEach(listener => listener({
        action: GameAction.PLAY_CARD,
        playerId: targetPlayer.id,
      }));
      
      return true;
    }
  }

  // AI自动响应
  private processAIResponse(targetPlayer: Player): void {
    const pendingResponse = this.state.pendingResponse;
    if (!pendingResponse) return;

    console.log(`AI ${targetPlayer.character.name} 正在考虑是否响应...`);

    // AI检查手牌中是否有可以响应的牌
    const responseCard = targetPlayer.handCards.find(c => c.name === pendingResponse.request.responseCardName);

    if (responseCard) {
      console.log(`AI ${targetPlayer.character.name} 有【${responseCard.name}】，考虑是否打出`);
      // AI有响应牌，80%概率打出
      if (Math.random() < 0.8) {
        setTimeout(() => {
          console.log(`AI ${targetPlayer.character.name} 选择打出【${responseCard.name}】`);
          const success = this.respondToAttack(targetPlayer.id, responseCard.id);
          if (success) {
            // 通知监听器
            this.actionListeners.forEach(listener => listener({
              action: GameAction.PLAY_CARD,
              playerId: targetPlayer.id,
              cardId: responseCard.id,
            }));
          }
        }, 1000);
        return;
      } else {
        console.log(`AI ${targetPlayer.character.name} 选择不打出【${responseCard.name}】`);
      }
    } else {
      console.log(`AI ${targetPlayer.character.name} 没有【${pendingResponse.request.responseCardName}】`);
    }

    // AI不响应或没有响应牌
    setTimeout(() => {
      console.log(`AI ${targetPlayer.character.name} 不响应，准备受到伤害`);
      this.respondToAttack(targetPlayer.id);
    }, 1000);
  }

  // 获取待处理的响应
  getPendingResponse() {
    return this.state.pendingResponse;
  }
}
