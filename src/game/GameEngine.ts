import {
  GameState, Player, Identity, GamePhase,
  ActionRequest, GameAction, Card, CardType, BasicCardName, SpellCardName, ResponseType
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
  private static instanceCount = 0;
  private static cardIdCounter = 0;
  private isPaused: boolean = false; // 游戏暂停状态
  private gameStartedFlag: boolean = false; // 游戏是否已开始

  constructor(playerCount: number = 4) {
    GameEngine.instanceCount++;
    console.log(`创建 GameEngine 实例... (第 ${GameEngine.instanceCount} 次)`);
    this.cardManager = CardManager.getInstance();
    this.characterManager = CharacterManager.getInstance();
    // 初始化空游戏状态，不创建牌堆和玩家
    this.state = this.createEmptyGameState();
    this.aiPlayer = new AIPlayer(this);
  }

  // 记录牌堆状态到日志文件
  private saveDeckState(reason: string, changedCards?: Card[]): void {
    if (typeof window !== 'undefined') {
      const deck = this.state?.deck;
      const cards = Array.isArray(deck) ? deck : [];
      window.dispatchEvent(new CustomEvent('deck-state-update', {
        detail: {
          reason,
          cards,
          changedCards
        }
      }));
    }
  }

  // 记录弃牌堆状态到日志文件
  private saveDiscardPileState(reason: string, changedCards?: Card[]): void {
    if (typeof window !== 'undefined') {
      const discardPile = this.state?.discardPile;
      const cards = Array.isArray(discardPile) ? discardPile : [];
      window.dispatchEvent(new CustomEvent('discard-pile-state-update', {
        detail: {
          reason,
          cards,
          changedCards
        }
      }));
    }
  }

  // 创建空游戏状态（游戏开始前）
  private createEmptyGameState(): GameState {
    return {
      players: [],
      currentPlayerIndex: 0,
      phase: GamePhase.GAME_START,
      deck: [],
      discardPile: [],
      round: 1,
    };
  }

  // 设置暂停状态
  setPaused(paused: boolean): void {
    if (this.isPaused === paused) {
      return; // 状态没有变化，不记录日志
    }
    this.isPaused = paused;
    console.log(`GameEngine: 游戏${paused ? '暂停' : '恢复'}`);

    // 如果恢复游戏，继续执行回合处理
    if (!paused) {
      // 检查游戏是否已经结束
      if (this.state.phase === GamePhase.GAME_OVER) {
        console.log('GameEngine: 游戏已结束，不继续执行回合流程');
        return;
      }
      console.log('GameEngine: 继续执行回合流程');
      // 使用 setTimeout 确保状态更新后再执行，避免阻塞
      setTimeout(() => {
        this.processTurn();
      }, 0);
    }
  }

  // 获取暂停状态
  isGamePaused(): boolean {
    return this.isPaused;
  }

  // 生成全局唯一的卡牌ID
  static generateUniqueCardId(): string {
    return `card_${Date.now()}_${++GameEngine.cardIdCounter}`;
  }

  private initializeGame(playerCount: number): GameState {
    // 创建牌堆
    const deck = this.cardManager.createStandardDeck();

    // 打印完整牌堆到日志（用于复盘）
    console.log('========== 初始牌堆 ==========');
    console.log(`牌堆总数: ${deck.length} 张`);
    console.log('牌堆内容（按顺序）:');
    deck.forEach((card, index) => {
      console.log(`${index + 1}. ${card.name} [${card.suit}${card.number}] (${card.type})`);
    });
    console.log('==============================');

    // 创建临时状态以便记录初始牌堆（发牌前）
    const tempState: GameState = {
      players: [],
      currentPlayerIndex: 0,
      phase: GamePhase.GAME_START,
      deck: [...deck],
      discardPile: [],
      round: 1,
    };
    this.state = tempState;

    // 记录初始牌堆状态（发牌前）
    this.saveDeckState('游戏初始化-发牌前');

    // 分配身份
    const identities = this.assignIdentities(playerCount);

    // 随机选择武将
    const characters = this.characterManager.getRandomCharacters(playerCount);
    console.log(`获取到 ${characters.length} 个武将角色`);

    // 记录发牌前抽出的所有牌
    const allDealtCards: Card[] = [];

    // 创建玩家
    const players: Player[] = characters.map((char, index) => {
      const isAI = index !== 0; // 第一个玩家是人类，其他是AI
      // 从deck开头抽取4张牌，并直接修改deck
      const cards = deck.splice(0, 4);
      // 记录发出的牌
      allDealtCards.push(...cards);

      // 更新this.state.deck以反映当前牌堆状态（用于日志记录）
      this.state.deck = [...deck];

      // 记录给该玩家发的牌到牌堆日志
      this.saveDeckState(`发给${char.name}4张牌`, cards);

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

    // 找到主公的索引，确保游戏从主公开始
    console.log(`players数组长度: ${players.length}`);
    const lordIndex = players.findIndex(p => p.identity === Identity.LORD);
    const startingPlayerIndex = lordIndex >= 0 ? lordIndex : 0;
    console.log(`lordIndex: ${lordIndex}, startingPlayerIndex: ${startingPlayerIndex}`);
    if (players.length === 0 || startingPlayerIndex >= players.length) {
      console.error('错误：玩家数组为空或索引超出范围');
      throw new Error('玩家数组为空或索引超出范围');
    }
    console.log(`游戏初始化: 主公是 ${players[startingPlayerIndex].character.name}, 从主公开始游戏`);

    // 打印每个玩家的初始手牌
    console.log('\n========== 玩家初始手牌 ==========');
    players.forEach(player => {
      const handCardsStr = player.handCards.map(c => `${c.name}[${c.suit}${c.number}]`).join(', ');
      console.log(`${player.character.name} (${player.identity}): ${handCardsStr}`);
    });
    console.log('==================================\n');

    // 发牌后剩余的牌堆
    const remainingDeck = [...deck];

    const initialState: GameState = {
      players,
      currentPlayerIndex: startingPlayerIndex,
      phase: GamePhase.GAME_START,
      deck: remainingDeck,
      discardPile: [],
      round: 1,
    };

    // 设置状态以便saveDeckState可以访问
    this.state = initialState;

    // 记录发牌后的牌堆状态（变化的牌是发给玩家的所有牌）
    this.saveDeckState('游戏初始化-发牌后', allDealtCards);

    return initialState;
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

  // 检查游戏是否已开始
  checkGameStarted(): boolean {
    return this.gameStartedFlag;
  }

  // 开始游戏
  startGame(playerCount: number = 4): void {
    console.log(`GameEngine.startGame 被调用，playerCount: ${playerCount}`);
    // 如果游戏尚未开始，先初始化
    if (!this.gameStartedFlag) {
      console.log(`游戏尚未开始，开始初始化，playerCount: ${playerCount}`);
      this.state = this.initializeGame(playerCount);
      this.gameStartedFlag = true;
    }
    this.state.phase = GamePhase.TURN_START;
    this.processTurn();
  }

  // 处理回合
  private processTurn(): void {
    // 检查游戏是否暂停
    if (this.isPaused) {
      console.log('游戏已暂停，暂停回合处理');
      // 延迟检查，等待恢复
      setTimeout(() => {
        if (!this.isPaused) {
          this.processTurn();
        }
      }, 500);
      return;
    }

    const currentPlayer = this.getCurrentPlayer();

    if (currentPlayer.isDead) {
      this.nextTurn();
      return;
    }

    console.log(`processTurn: ${currentPlayer.character.name}, 阶段: ${this.state.phase}`);

    // 检查游戏是否已经结束
    if (this.state.phase === GamePhase.GAME_OVER) {
      console.log('游戏已结束，停止游戏流程');
      return;
    }

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
            // AI执行完后，根据当前阶段决定下一步
            if (this.state.phase === GamePhase.GAME_OVER) {
              // 游戏已结束，停止游戏流程
              console.log('AI出牌后游戏结束，停止游戏流程');
              return;
            } else if (this.state.phase === GamePhase.PLAY) {
              // 正常结束出牌阶段，进入弃牌阶段
              this.state.phase = GamePhase.DISCARD;
              this.processTurn();
            } else if (this.state.phase === GamePhase.RESPONSE) {
              // AI使用杀后进入响应阶段，需要等待响应完成
              console.log('AI出牌后进入响应阶段，等待响应完成...');
              // 不自动进入下一阶段，等待响应处理
            }
          });
        }
        break;
      case GamePhase.RESPONSE:
        // 响应阶段：等待目标玩家响应（打出闪）
        // 这个阶段由玩家操作或AI自动响应触发，不需要自动处理
        console.log(`响应阶段: 等待 ${this.state.pendingResponse?.request.targetPlayerId} 响应`);
        // 检查是否是AI目标，如果是则自动响应
        if (this.state.pendingResponse) {
          const targetPlayer = this.state.players.find(p => p.id === this.state.pendingResponse?.request.targetPlayerId);
          if (targetPlayer?.isAI) {
            this.processAIResponse(targetPlayer);
          }
        }
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

    // 检查牌堆是否足够，不够则从弃牌堆重新洗牌
    if (this.state.deck.length < 2) {
      this.reshuffleDiscardPile();
    }

    const drawCount = Math.min(2, this.state.deck.length);
    const drawResult = this.cardManager.draw(this.state.deck, drawCount);

    player.handCards.push(...drawResult.cards);
    this.state.deck = drawResult.remaining;

    // 打印摸到的牌的具体信息
    const cardNames = drawResult.cards.map(c => `【${c.name}】`).join('、');
    console.log(`${player.character.name} 摸了 ${drawResult.cards.length} 张牌: ${cardNames}，当前手牌: ${player.handCards.length}`);

    // 记录牌堆变化（摸牌是减少牌堆，变化的牌是摸到的牌）
    // 确保 changedCards 是纯数组
    const changedCards = drawResult.cards ? [...drawResult.cards] : [];
    this.saveDeckState(`${player.character.name}摸牌`, changedCards);

    this.state.phase = GamePhase.PLAY;
    // 继续执行下一阶段
    this.processTurn();
  }

  // 从弃牌堆重新洗牌到牌堆
  private reshuffleDiscardPile(): void {
    const discardCount = this.state.discardPile.length;
    if (discardCount === 0) {
      console.log('牌堆和弃牌堆都为空，无法摸牌');
      return;
    }

    console.log(`牌堆不足，从弃牌堆重新洗牌 (${discardCount} 张)`);

    // 将弃牌堆洗牌后加入牌堆
    const shuffled = this.cardManager.shuffle(this.state.discardPile);
    this.state.deck.push(...shuffled);
    this.state.discardPile = [];

    console.log(`重新洗牌完成，牌堆现在有 ${this.state.deck.length} 张牌`);

    // 记录牌堆和弃牌堆变化
    this.saveDeckState('重新洗牌');
    this.saveDiscardPileState('重新洗牌');
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
      // 记录弃牌堆变化（变化的牌是使用的牌）
      this.saveDiscardPileState(`${player.character.name}使用${card.name}`, [card]);
    }

    console.log(`${player.character.name} 成功使用了 ${card.name}`);

    // 更新目标的怀疑度（如果目标存在且是AI）
    if (targetIds && targetIds.length > 0) {
      targetIds.forEach(targetId => {
        const target = this.state.players.find(p => p.id === targetId);
        if (target && target.isAI) {
          // 根据卡牌类型增加怀疑度
          let suspicionAmount = 10; // 默认怀疑度
          if (card.name === BasicCardName.ATTACK ||
            card.name === BasicCardName.THUNDER_ATTACK ||
            card.name === BasicCardName.FIRE_ATTACK_CARD) {
            suspicionAmount = 30; // 杀的怀疑度更高
          } else if (card.type === CardType.SPELL) {
            suspicionAmount = 20; // 锦囊牌的怀疑度
          }
          this.aiPlayer.updateSuspicion(target.id, player.id, suspicionAmount, this.state.round);
        }
      });
    }

    // 注意：监听器由 executeAction 统一调用，避免重复通知
    // 这里只返回成功状态

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
      case BasicCardName.THUNDER_ATTACK:
      case BasicCardName.FIRE_ATTACK_CARD:
        // 杀/雷杀/火杀：对目标造成1点伤害
        if (targets.length === 0) return false;
        const target = targets[0];
        if (target.isDead) return false;

        // 检查攻击距离
        const canAttack = DistanceCalculator.canAttack(player, target, this.state.players);
        if (!canAttack) {
          console.log(`${player.character.name} 无法攻击 ${target.character.name}，距离太远`);
          return false;
        }

        console.log(`${player.character.name} 对 ${target.character.name} 使用${card.name}，等待对方响应...`);

        // 创建响应请求
        this.state.pendingResponse = {
          request: {
            targetPlayerId: target.id,
            sourcePlayerId: player.id,
            cardName: card.name,
            responseCardName: BasicCardName.DODGE,
            damage: 1,
            responseType: ResponseType.DODGE,
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
    // 无懈可击：在响应阶段使用，不能直接打出
    if (card.name === SpellCardName.NULLIFICATION) {
      return false;
    }

    // 南蛮入侵和万箭齐发特殊处理：需要多目标依次响应
    if (card.name === SpellCardName.SAVAGE || card.name === SpellCardName.ARCHERY) {
      return this.executeMultiTargetSpell(player, card);
    }

    // 创建锦囊牌效果函数（用于无懈可击抵消后执行）
    const spellEffect = () => {
      this.executeSpellEffect(player, card, targets);
    };

    // 进入响应阶段，等待无懈可击响应
    console.log(`${player.character.name} 使用【${card.name}】，等待是否有无懈可击响应...`);

    // 创建响应请求
    this.state.pendingResponse = {
      request: {
        targetPlayerId: player.id, // 锦囊牌使用者作为目标（用于无懈可击响应）
        sourcePlayerId: player.id,
        cardName: card.name,
        responseCardName: SpellCardName.NULLIFICATION,
        damage: 0,
        responseType: ResponseType.NULLIFY,
        spellCardEffect: spellEffect,
      },
      resolved: false,
      result: false,
    };

    // 进入响应阶段
    this.state.phase = GamePhase.RESPONSE;

    // 检查是否有AI可以打出无懈可击（其他玩家可以阻止这个锦囊牌）
    this.processAINullificationResponse(player, card);

    return true;
  }

  // 执行多目标锦囊牌（南蛮入侵、万箭齐发）
  private executeMultiTargetSpell(player: Player, card: Card): boolean {
    // 进入响应阶段，等待无懈可击响应
    console.log(`${player.character.name} 使用【${card.name}】，等待是否有无懈可击响应...`);

    // 创建锦囊牌效果函数（用于无懈可击抵消后执行）
    const spellEffect = () => {
      this.startMultiTargetResponse(player, card);
    };

    // 创建响应请求
    this.state.pendingResponse = {
      request: {
        targetPlayerId: player.id,
        sourcePlayerId: player.id,
        cardName: card.name,
        responseCardName: SpellCardName.NULLIFICATION,
        damage: 0,
        responseType: ResponseType.NULLIFY,
        spellCardEffect: spellEffect,
      },
      resolved: false,
      result: false,
    };

    // 进入响应阶段
    this.state.phase = GamePhase.RESPONSE;

    // 检查是否有AI可以打出无懈可击
    this.processAINullificationResponse(player, card);

    return true;
  }

  // 开始多目标响应流程（无懈可击响应后调用）
  private startMultiTargetResponse(player: Player, card: Card): void {
    // 获取所有需要响应的目标（除来源玩家外的所有存活玩家）
    const targetPlayers = this.state.players.filter(p => p.id !== player.id && !p.isDead);

    if (targetPlayers.length === 0) {
      console.log(`【${card.name}】没有目标需要响应`);
      this.state.phase = GamePhase.PLAY;

      // 触发监听器通知 UI 更新状态
      this.actionListeners.forEach(listener => listener({
        action: GameAction.PLAY_CARD,
        playerId: player.id,
        cardId: '',
        cardName: card.name,
        targetIds: [],
        isResponse: false,
        logMessage: `【${card.name}】没有目标需要响应`,
      }));

      return;
    }

    // 确定需要的响应牌
    const requiredResponse = card.name === SpellCardName.SAVAGE ? BasicCardName.ATTACK : BasicCardName.DODGE;
    const responseType = card.name === SpellCardName.SAVAGE ? ResponseType.ATTACK : ResponseType.DODGE;

    console.log(`【${card.name}】开始多目标响应流程，需要${targetPlayers.length}个玩家响应`);

    // 创建响应队列
    const multiTargetQueue: { targetPlayerId: string; responded: boolean; result: boolean; responseCardId?: string }[] =
      targetPlayers.map(p => ({
        targetPlayerId: p.id,
        responded: false,
        result: false,
      }));

    // 创建多目标响应请求
    this.state.pendingResponse = {
      request: {
        targetPlayerId: multiTargetQueue[0].targetPlayerId, // 第一个目标
        sourcePlayerId: player.id,
        cardName: card.name,
        responseCardName: requiredResponse,
        damage: 1,
        responseType: responseType,
      },
      resolved: false,
      result: false,
      multiTargetQueue: multiTargetQueue,
      currentTargetIndex: 0,
      sourcePlayerId: player.id,
    };

    // 进入响应阶段
    this.state.phase = GamePhase.RESPONSE;

    // 处理第一个目标的响应
    const firstTarget = this.state.players.find(p => p.id === multiTargetQueue[0].targetPlayerId);
    if (firstTarget?.isAI) {
      this.processAIResponse(firstTarget);
    }
  }

  // 实际执行锦囊牌效果（在无懈可击响应后调用）
  private executeSpellEffect(player: Player, card: Card, targets: Player[]): boolean {
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
        if (stealTarget.isDead) return false;

        // 检查距离限制（顺手牵羊距离为1）
        const stealDistance = DistanceCalculator.calculateDistance(player, stealTarget, this.state.players);
        if (stealDistance > 1) {
          console.log(`${player.character.name} 无法对 ${stealTarget.character.name} 使用顺手牵羊，距离太远（距离: ${stealDistance}）`);
          return false;
        }

        // 获取目标所有可偷的牌（手牌 + 装备区）
        const availableCards: { type: 'hand' | 'equipment', key?: string, card: Card }[] = [];

        // 添加手牌
        stealTarget.handCards.forEach(card => {
          availableCards.push({ type: 'hand', card });
        });

        // 添加装备区的牌
        if (stealTarget.equipment.weapon) {
          availableCards.push({ type: 'equipment', key: 'weapon', card: stealTarget.equipment.weapon });
        }
        if (stealTarget.equipment.armor) {
          availableCards.push({ type: 'equipment', key: 'armor', card: stealTarget.equipment.armor });
        }
        if (stealTarget.equipment.horsePlus) {
          availableCards.push({ type: 'equipment', key: 'horsePlus', card: stealTarget.equipment.horsePlus });
        }
        if (stealTarget.equipment.horseMinus) {
          availableCards.push({ type: 'equipment', key: 'horseMinus', card: stealTarget.equipment.horseMinus });
        }

        if (availableCards.length === 0) {
          console.log(`${stealTarget.character.name} 没有可以偷的牌`);
          return false;
        }

        // 随机选择一张牌
        const randomIndex = Math.floor(Math.random() * availableCards.length);
        const stolenItem = availableCards[randomIndex];

        if (stolenItem.type === 'hand') {
          // 从手牌中移除
          const cardIndex = stealTarget.handCards.findIndex(c => c.id === stolenItem.card.id);
          if (cardIndex !== -1) {
            stealTarget.handCards.splice(cardIndex, 1);
          }
        } else if (stolenItem.type === 'equipment' && stolenItem.key) {
          // 从装备区移除
          stealTarget.equipment[stolenItem.key as keyof Player['equipment']] = undefined;
        }

        // 给偷来的卡牌生成新的唯一ID，避免重复key问题
        const stolenCard = {
          ...stolenItem.card,
          id: GameEngine.generateUniqueCardId(),
        };

        // 加入自己的手牌
        player.handCards.push(stolenCard);
        console.log(`${player.character.name} 从 ${stealTarget.character.name} 处获得了 ${stolenCard.name}`);

        // 顺手牵羊只是转移牌，不影响牌堆和弃牌堆数量，不记录
        return true;

      case SpellCardName.DISMANTLE:
        // 过河拆桥：弃置目标一张牌
        if (targets.length === 0) return false;
        const dismantleTarget = targets[0];
        if (dismantleTarget.isDead) return false;

        // 获取目标所有可弃置的牌（手牌 + 装备区）
        const dismantleCards: { type: 'hand' | 'equipment', key?: string, card: Card }[] = [];

        // 添加手牌
        dismantleTarget.handCards.forEach(card => {
          dismantleCards.push({ type: 'hand', card });
        });

        // 添加装备区的牌
        if (dismantleTarget.equipment.weapon) {
          dismantleCards.push({ type: 'equipment', key: 'weapon', card: dismantleTarget.equipment.weapon });
        }
        if (dismantleTarget.equipment.armor) {
          dismantleCards.push({ type: 'equipment', key: 'armor', card: dismantleTarget.equipment.armor });
        }
        if (dismantleTarget.equipment.horsePlus) {
          dismantleCards.push({ type: 'equipment', key: 'horsePlus', card: dismantleTarget.equipment.horsePlus });
        }
        if (dismantleTarget.equipment.horseMinus) {
          dismantleCards.push({ type: 'equipment', key: 'horseMinus', card: dismantleTarget.equipment.horseMinus });
        }

        if (dismantleCards.length === 0) {
          console.log(`${dismantleTarget.character.name} 没有可以弃置的牌`);
          return false;
        }

        // 随机选择一张牌弃置
        const dismantleIndex = Math.floor(Math.random() * dismantleCards.length);
        const dismantleItem = dismantleCards[dismantleIndex];

        if (dismantleItem.type === 'hand') {
          // 从手牌中移除
          const cardIndex = dismantleTarget.handCards.findIndex(c => c.id === dismantleItem.card.id);
          if (cardIndex !== -1) {
            dismantleTarget.handCards.splice(cardIndex, 1);
          }
        } else if (dismantleItem.type === 'equipment' && dismantleItem.key) {
          // 从装备区移除
          dismantleTarget.equipment[dismantleItem.key as keyof Player['equipment']] = undefined;
        }

        // 放入弃牌堆
        this.state.discardPile.push(dismantleItem.card);
        console.log(`${player.character.name} 弃置了 ${dismantleTarget.character.name} 的 ${dismantleItem.card.name}`);

        // 记录弃牌堆变化
        this.saveDiscardPileState(`${player.character.name}过河拆桥`, [dismantleItem.card]);
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
        // 万箭齐发：已在startMultiTargetResponse中处理
        return true;

      case SpellCardName.SAVAGE:
        // 南蛮入侵：已在startMultiTargetResponse中处理
        return true;

      case SpellCardName.DRAW_TWO:
        // 无中生有：摸两张牌
        const { cards } = this.cardManager.draw(this.state.deck, 2);
        player.handCards.push(...cards);
        this.state.deck = this.state.deck.slice(2);
        console.log(`${player.character.name} 摸了 ${cards.length} 张牌`);

        // 记录牌堆变化
        this.saveDeckState(`${player.character.name}无中生有`, cards);
        return true;

      default:
        return false;
    }
  }

  // 执行装备牌效果
  private executeEquipmentCard(player: Player, card: Card): boolean {
    // 将装备放入装备区
    if (!card.equipmentType) return false;

    // 将 EquipmentType 映射到 equipment 对象的属性名
    const equipmentKeyMap: Record<string, keyof Player['equipment']> = {
      'weapon': 'weapon',
      'armor': 'armor',
      'horsePlus': 'horsePlus',
      'horseMinus': 'horseMinus',
    };

    const equipmentKey = equipmentKeyMap[card.equipmentType];
    if (!equipmentKey) return false;

    // 检查是否已经装备了同一张牌（防止重复装备）
    const currentEquipment = player.equipment[equipmentKey];
    if (currentEquipment && currentEquipment.id === card.id) {
      console.log(`${player.character.name} 已经装备了 ${card.name}，无需重复装备`);
      return false;
    }

    // 如果有旧装备，先弃置
    if (currentEquipment) {
      this.state.discardPile.push(currentEquipment);
      console.log(`${player.character.name} 弃置了旧装备 ${currentEquipment.name}`);

      // 记录弃牌堆变化
      this.saveDiscardPileState(`${player.character.name}替换装备`, [currentEquipment]);
    }

    // 装备新牌
    player.equipment[equipmentKey] = card;
    console.log(`${player.character.name} 装备了 ${card.name} [ID:${card.id}, ${card.suit}${card.number}]`);
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
        const discardedCardNames: string[] = [];
        const discardedCards: Card[] = [];
        cardsToRemove.forEach(card => {
          const index = player.handCards.findIndex(c => c.id === card.id);
          if (index !== -1) {
            const removedCard = player.handCards.splice(index, 1)[0];
            this.state.discardPile.push(removedCard);
            discardedCards.push(removedCard);
            discardedCardNames.push(removedCard.name);
            console.log(`${player.character.name} 弃置了 ${removedCard.name}`);
          }
        });

        // 记录弃牌堆变化
        this.saveDiscardPileState(`${player.character.name}弃牌`, discardedCards);

        // AI弃牌完成后通知监听器，记录所有弃置的牌
        this.actionListeners.forEach(listener => listener({
          action: GameAction.DISCARD_CARD,
          playerId: player.id,
          cardName: discardedCardNames.join('、'),
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

    // 检查游戏是否已经结束
    if (this.state.phase === GamePhase.GAME_OVER) {
      console.log('游戏已结束，不再进入下一回合');
      return;
    }

    this.nextTurn();
  }

  // 下一回合
  private nextTurn(): void {
    // 检查游戏是否已经结束
    if (this.state.phase === GamePhase.GAME_OVER) {
      console.log('游戏已结束，不再切换回合');
      return;
    }

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

  // 造成伤害并检查游戏结束（用于需要立即停止游戏流程的场景）
  dealDamageAndCheckGameOver(fromId: string, toId: string, amount: number): boolean {
    this.dealDamage(fromId, toId, amount);
    // 返回游戏是否结束
    return this.state.phase === GamePhase.GAME_OVER;
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

    // 收集所有弃置的牌
    const discardedCards: Card[] = [...player.handCards];

    // 弃置装备区的装备
    if (player.equipment.weapon) {
      discardedCards.push(player.equipment.weapon);
    }
    if (player.equipment.armor) {
      discardedCards.push(player.equipment.armor);
    }
    if (player.equipment.horsePlus) {
      discardedCards.push(player.equipment.horsePlus);
    }
    if (player.equipment.horseMinus) {
      discardedCards.push(player.equipment.horseMinus);
    }

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

    // 记录弃牌堆变化
    this.saveDiscardPileState(`${player.character.name}阵亡弃牌`, discardedCards);

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

      // 触发监听器通知 UI 更新
      this.actionListeners.forEach(listener => listener({
        action: GameAction.END_TURN,
        playerId: '',
        logMessage: '游戏结束！',
      }));
    } else if (!aliveIdentities.includes(Identity.REBEL) && !aliveIdentities.includes(Identity.TRAITOR)) {
      // 没有反贼和内奸，只剩主公和忠臣，主公和忠臣胜利
      this.state.winner = Identity.LORD;
      this.state.phase = GamePhase.GAME_OVER;
      console.log('主公和忠臣胜利！');

      // 触发监听器通知 UI 更新
      this.actionListeners.forEach(listener => listener({
        action: GameAction.END_TURN,
        playerId: '',
        logMessage: '主公和忠臣胜利！',
      }));
    } else if (aliveIdentities.length === 2 &&
      aliveIdentities.includes(Identity.LORD) &&
      aliveIdentities.includes(Identity.LOYALIST)) {
      // 只剩主公和忠臣，游戏结束（主公和忠臣胜利）
      this.state.winner = Identity.LORD;
      this.state.phase = GamePhase.GAME_OVER;
      console.log('场上只剩主公和忠臣，游戏结束，主公和忠臣胜利！');

      // 触发监听器通知 UI 更新
      this.actionListeners.forEach(listener => listener({
        action: GameAction.END_TURN,
        playerId: '',
        logMessage: '场上只剩主公和忠臣，主公和忠臣胜利！',
      }));
    }
  }

  // 添加动作监听器
  onAction(listener: (action: ActionRequest) => void): void {
    this.actionListeners.push(listener);
  }

  // 执行动作
  executeAction(action: ActionRequest): boolean {
    // 在执行动作前获取卡牌名称（因为执行后卡牌可能从手牌移除）
    let cardName: string | undefined = action.cardName;
    if (action.action === GameAction.PLAY_CARD && action.cardId && !cardName) {
      const player = this.state.players.find(p => p.id === action.playerId);
      const card = player?.handCards.find(c => c.id === action.cardId);
      cardName = card?.name;
    }

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
      // 补充 cardName 到 action 中，用于动画显示
      const actionWithCardName: ActionRequest = {
        ...action,
        cardName: cardName,
      };
      this.actionListeners.forEach(listener => listener(actionWithCardName));
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

    // 检查是否是多目标响应（南蛮入侵、万箭齐发）
    const isMultiTarget = pendingResponse.multiTargetQueue && pendingResponse.currentTargetIndex !== undefined;

    if (cardId) {
      // 玩家打出了响应牌
      const responseCard = targetPlayer.handCards.find(c => c.id === cardId);
      if (!responseCard) {
        return false;
      }

      // 验证响应牌是否正确
      let isValidResponse = false;
      if (pendingResponse.request.responseType === ResponseType.ATTACK) {
        // 南蛮入侵：普通杀、雷杀、火杀都可以响应
        isValidResponse = responseCard.name === BasicCardName.ATTACK ||
          responseCard.name === BasicCardName.THUNDER_ATTACK ||
          responseCard.name === BasicCardName.FIRE_ATTACK_CARD;
      } else {
        // 其他情况：直接匹配牌名
        isValidResponse = responseCard.name === pendingResponse.request.responseCardName;
      }

      if (!isValidResponse) {
        return false;
      }

      // 移除打出的响应牌
      const cardIndex = targetPlayer.handCards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        const playedCard = targetPlayer.handCards.splice(cardIndex, 1)[0];
        this.state.discardPile.push(playedCard);

        // 记录弃牌堆变化
        this.saveDiscardPileState(`${targetPlayer.character.name}打出响应`, [playedCard]);
      }

      const logMessage = `${targetPlayer.character.name} 打出了【${responseCard.name}】，抵消了【${pendingResponse.request.cardName}】`;
      console.log(logMessage);

      if (isMultiTarget) {
        // 多目标响应：更新队列并处理下一个目标
        return this.handleMultiTargetResponse(pendingResponse, targetPlayer.id, cardId, true, logMessage);
      } else {
        // 单目标响应（普通杀）
        pendingResponse.resolved = true;
        pendingResponse.result = true;
        pendingResponse.responseCardId = cardId;

        // 响应成功，不造成伤害，返回出牌阶段
        this.state.pendingResponse = undefined;
        this.state.phase = GamePhase.PLAY;

        // 触发监听器通知 UI 更新（标记为响应动作）
        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: targetPlayer.id,
          cardId: cardId,
          cardName: responseCard.name,
          targetIds: [sourcePlayer.id],
          isResponse: true,
          logMessage: logMessage,
        }));

        return true;
      }
    } else {
      // 玩家选择不响应
      const logMessage = `${targetPlayer.character.name} 没有打出【${pendingResponse.request.responseCardName}】，受到${pendingResponse.request.damage}点伤害`;
      console.log(logMessage);

      // 造成伤害
      this.dealDamage(pendingResponse.request.sourcePlayerId, playerId, pendingResponse.request.damage);

      // 检查游戏是否已经结束（造成伤害可能导致玩家死亡，进而结束游戏）
      if (this.state.phase === GamePhase.GAME_OVER) {
        console.log('游戏已结束，不继续响应流程');
        return true;
      }

      if (isMultiTarget) {
        // 多目标响应：更新队列并处理下一个目标
        return this.handleMultiTargetResponse(pendingResponse, targetPlayer.id, undefined, false, logMessage);
      } else {
        // 单目标响应（普通杀）
        pendingResponse.resolved = true;
        pendingResponse.result = false;

        // 清除响应状态，返回出牌阶段
        this.state.pendingResponse = undefined;
        this.state.phase = GamePhase.PLAY;

        // 触发监听器通知 UI 更新（标记为响应动作）
        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: targetPlayer.id,
          cardName: pendingResponse.request.cardName,
          targetIds: [sourcePlayer.id],
          isResponse: true,
          logMessage: logMessage,
        }));

        return true;
      }
    }
  }

  // 处理多目标响应（南蛮入侵、万箭齐发）
  private handleMultiTargetResponse(
    pendingResponse: NonNullable<typeof this.state.pendingResponse>,
    targetPlayerId: string,
    responseCardId: string | undefined,
    result: boolean,
    logMessage: string
  ): boolean {
    if (!pendingResponse.multiTargetQueue || pendingResponse.currentTargetIndex === undefined) {
      return false;
    }

    const currentIndex = pendingResponse.currentTargetIndex;
    const queue = pendingResponse.multiTargetQueue;

    // 更新当前目标的响应状态
    queue[currentIndex].responded = true;
    queue[currentIndex].result = result;
    queue[currentIndex].responseCardId = responseCardId;

    // 触发监听器通知 UI 更新
    const targetPlayer = this.state.players.find(p => p.id === targetPlayerId);
    const sourcePlayer = this.state.players.find(p => p.id === pendingResponse.request.sourcePlayerId);
    if (targetPlayer && sourcePlayer) {
      this.actionListeners.forEach(listener => listener({
        action: GameAction.PLAY_CARD,
        playerId: targetPlayer.id,
        cardId: responseCardId,
        cardName: result ? pendingResponse.request.responseCardName : pendingResponse.request.cardName,
        targetIds: [sourcePlayer.id],
        isResponse: true,
        logMessage: logMessage,
      }));
    }

    // 检查是否还有下一个目标需要响应
    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      // 还有下一个目标
      const nextTargetId = queue[nextIndex].targetPlayerId;
      const nextTarget = this.state.players.find(p => p.id === nextTargetId);

      console.log(`【${pendingResponse.request.cardName}】下一个目标: ${nextTarget?.character.name}`);

      // 更新pendingResponse为下一个目标
      pendingResponse.request.targetPlayerId = nextTargetId;
      pendingResponse.currentTargetIndex = nextIndex;
      pendingResponse.resolved = false;
      pendingResponse.result = false;
      pendingResponse.responseCardId = undefined;

      // 如果是AI，自动响应
      if (nextTarget?.isAI) {
        setTimeout(() => {
          this.processAIResponse(nextTarget);
        }, 800);
      }

      return true;
    } else {
      // 所有目标都已响应，结束多目标响应流程
      console.log(`【${pendingResponse.request.cardName}】所有目标响应完毕`);

      // 检查游戏是否已经结束（多目标响应过程中可能导致玩家死亡）
      if (this.state.phase === GamePhase.GAME_OVER) {
        console.log('游戏已结束，不继续多目标响应流程');
        return true;
      }

      this.state.pendingResponse = undefined;
      this.state.phase = GamePhase.PLAY;

      // 触发监听器通知 UI 更新状态
      this.actionListeners.forEach(listener => listener({
        action: GameAction.PLAY_CARD,
        playerId: pendingResponse.request.sourcePlayerId,
        cardId: '',
        cardName: pendingResponse.request.cardName,
        targetIds: [],
        isResponse: false,
        logMessage: `【${pendingResponse.request.cardName}】结算完成`,
      }));

      // 继续游戏流程
      this.processTurn();

      return true;
    }
  }

  // AI自动响应
  private processAIResponse(targetPlayer: Player): void {
    const pendingResponse = this.state.pendingResponse;
    if (!pendingResponse) return;

    console.log(`AI ${targetPlayer.character.name} 正在考虑是否响应...`);

    // AI检查手牌中是否有可以响应的牌
    let responseCard: Card | undefined;

    if (pendingResponse.request.responseType === ResponseType.ATTACK) {
      // 南蛮入侵：需要打出杀（普通杀、雷杀、火杀都可以）
      responseCard = targetPlayer.handCards.find(c =>
        c.name === BasicCardName.ATTACK ||
        c.name === BasicCardName.THUNDER_ATTACK ||
        c.name === BasicCardName.FIRE_ATTACK_CARD
      );
    } else {
      // 其他情况（闪、无懈可击）
      responseCard = targetPlayer.handCards.find(c => c.name === pendingResponse.request.responseCardName);
    }

    if (responseCard) {
      console.log(`AI ${targetPlayer.character.name} 有【${responseCard.name}】，考虑是否打出`);
      // AI有响应牌，80%概率打出
      if (Math.random() < 0.8) {
        setTimeout(() => {
          console.log(`AI ${targetPlayer.character.name} 选择打出【${responseCard?.name}】`);
          // 注意：监听器由 store.respondToAttack 统一处理，避免重复通知
          this.respondToAttack(targetPlayer.id, responseCard?.id);
        }, 1000);
        return;
      } else {
        console.log(`AI ${targetPlayer.character.name} 选择不打出【${responseCard.name}】`);
        // AI选择不打出响应牌，需要调用respondToAttack来表示不响应
        setTimeout(() => {
          console.log(`AI ${targetPlayer.character.name} 不响应，准备受到伤害`);
          this.respondToAttack(targetPlayer.id);
        }, 1000);
        return;
      }
    } else {
      console.log(`AI ${targetPlayer.character.name} 没有【${pendingResponse.request.responseCardName}】`);
    }

    // AI不响应或没有响应牌
    setTimeout(() => {
      console.log(`AI ${targetPlayer.character.name} 不响应，准备受到伤害`);
      // 注意：监听器由 store.respondToAttack 统一处理，避免重复通知
      this.respondToAttack(targetPlayer.id);
    }, 1000);
  }

  // 获取待处理的响应
  getPendingResponse() {
    return this.state.pendingResponse;
  }

  // AI无懈可击响应处理
  private processAINullificationResponse(sourcePlayer: Player, spellCard: Card): void {
    // 立即检查所有AI玩家是否有无懈可击
    const otherPlayers = this.state.players.filter(p =>
      p.id !== sourcePlayer.id && !p.isDead && p.isAI
    );

    // 检查是否有AI玩家有无懈可击
    const playersWithNullification = otherPlayers.filter(player =>
      player.handCards.some(c => c.name === SpellCardName.NULLIFICATION)
    );

    // 如果没有AI玩家有无懈可击，立即执行锦囊牌效果
    if (playersWithNullification.length === 0) {
      console.log(`没有AI玩家有无懈可击，【${spellCard.name}】立即生效`);
      this.resolveSpellCardEffect();
      return;
    }

    // 有AI玩家有无懈可击，延迟一下让他们有机会打出
    setTimeout(() => {
      const pendingResponse = this.state.pendingResponse;
      if (!pendingResponse || pendingResponse.resolved) return;

      // 检查是否是无懈可击响应类型
      if (pendingResponse.request.responseType !== ResponseType.NULLIFY) return;

      // 随机决定是否使用无懈可击（简化版）
      // 其他玩家有30%概率使用无懈可击来阻止锦囊牌
      for (const player of playersWithNullification) {
        const nullificationCard = player.handCards.find(
          c => c.name === SpellCardName.NULLIFICATION
        );
        if (nullificationCard && Math.random() < 0.3) {
          console.log(`AI ${player.character.name} 打出【无懈可击】抵消【${spellCard.name}】`);
          this.respondToNullification(player.id, nullificationCard.id);
          return;
        }
      }

      // 没有AI打出无懈可击，执行锦囊牌效果
      console.log(`没有无懈可击响应，【${spellCard.name}】生效`);
      this.resolveSpellCardEffect();
    }, 1500);
  }

  // 处理无懈可击响应
  respondToNullification(playerId: string, cardId?: string): boolean {
    const pendingResponse = this.state.pendingResponse;
    if (!pendingResponse) {
      console.log(`respondToNullification 失败: 没有待处理的响应`);
      return false;
    }
    if (pendingResponse.resolved) {
      console.log(`respondToNullification 失败: 响应已解决`);
      return false;
    }
    if (pendingResponse.request.responseType !== ResponseType.NULLIFY) {
      console.log(`respondToNullification 失败: 不是无懈可击响应类型`);
      return false;
    }

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) {
      console.log(`respondToNullification 失败: 找不到玩家`);
      return false;
    }

    if (cardId) {
      // 玩家打出了无懈可击
      const nullificationCard = player.handCards.find(c => c.id === cardId);
      if (!nullificationCard || nullificationCard.name !== SpellCardName.NULLIFICATION) {
        console.log(`respondToNullification 失败: 不是无懈可击牌`);
        return false;
      }

      // 移除打出的无懈可击
      const cardIndex = player.handCards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        const playedCard = player.handCards.splice(cardIndex, 1)[0];
        this.state.discardPile.push(playedCard);

        // 记录弃牌堆变化
        this.saveDiscardPileState(`${player.character.name}打出无懈可击`, [playedCard]);
      }

      const logMessage = `${player.character.name} 打出【无懈可击】，抵消了【${pendingResponse.request.cardName}】`;
      console.log(logMessage);

      pendingResponse.resolved = true;
      pendingResponse.result = true;
      pendingResponse.responseCardId = cardId;

      // 清除响应状态，返回出牌阶段
      this.state.pendingResponse = undefined;
      this.state.phase = GamePhase.PLAY;

      // 触发监听器通知 UI 更新
      this.actionListeners.forEach(listener => listener({
        action: GameAction.PLAY_CARD,
        playerId: player.id,
        cardId: cardId,
        cardName: SpellCardName.NULLIFICATION,
        targetIds: [pendingResponse.request.sourcePlayerId],
        isResponse: true,
        logMessage: logMessage,
      }));

      // 只有当当前玩家不是AI时才继续游戏流程
      // （AI使用锦囊牌时，AI的出牌循环会继续处理）
      const currentPlayer = this.getCurrentPlayer();
      if (!currentPlayer.isAI) {
        this.processTurn();
      }

      return true;
    } else {
      // 玩家选择不响应，执行锦囊牌效果
      return this.resolveSpellCardEffect();
    }
  }

  // 执行锦囊牌效果（在无懈可击响应后）
  private resolveSpellCardEffect(): boolean {
    const pendingResponse = this.state.pendingResponse;
    if (!pendingResponse || !pendingResponse.request.spellCardEffect) {
      console.log(`resolveSpellCardEffect 失败: 没有待处理的响应或效果函数`);
      return false;
    }

    const cardName = pendingResponse.request.cardName;
    const sourcePlayerId = pendingResponse.request.sourcePlayerId;

    console.log(`【${cardName}】生效`);

    // 执行锦囊牌效果
    pendingResponse.request.spellCardEffect();

    // 检查游戏是否已经结束（锦囊牌效果可能导致玩家死亡，进而结束游戏）
    if (this.state.phase === GamePhase.GAME_OVER) {
      console.log(`【${cardName}】效果执行完成，游戏已结束`);
      return true;
    }

    // 检查是否创建了新的pendingResponse（多目标锦囊牌的情况）
    // 如果是多目标锦囊牌，startMultiTargetResponse会创建新的pendingResponse
    if (this.state.pendingResponse && this.state.pendingResponse.multiTargetQueue) {
      console.log(`【${cardName}】是多目标锦囊牌，继续多目标响应流程`);
      // 不清除pendingResponse，不设置phase为PLAY，不触发监听器
      // 多目标响应流程会自行处理
      return true;
    }

    pendingResponse.resolved = true;
    pendingResponse.result = false;

    // 清除响应状态，返回出牌阶段
    this.state.pendingResponse = undefined;
    this.state.phase = GamePhase.PLAY;

    // 触发监听器通知 UI 更新状态
    this.actionListeners.forEach(listener => listener({
      action: GameAction.PLAY_CARD,
      playerId: sourcePlayerId,
      cardId: '',
      cardName: cardName,
      targetIds: [],
      isResponse: false,
      logMessage: `【${cardName}】生效`,
    }));

    // 检查使用锦囊牌的玩家是否仍然是当前回合玩家
    // 如果回合已经进行到下一个玩家，不应该再调用 processTurn()
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== sourcePlayerId) {
      console.log(`【${cardName}】效果执行完成，但回合已进行到 ${currentPlayer.character.name}，不继续流程`);
      return true;
    }

    // 只有当当前玩家不是AI时才继续游戏流程
    // （AI使用锦囊牌时，AI的出牌循环会继续处理）
    if (!currentPlayer.isAI) {
      this.processTurn();
    }

    return true;
  }
}
