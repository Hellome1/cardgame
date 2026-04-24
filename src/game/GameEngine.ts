import {
  GameState, Player, Identity, GamePhase,
  ActionRequest, GameAction, Card, CardType, CardSuit, CardColor, BasicCardName, SpellCardName, ResponseType,
  DuelState, SkillContext, SkillTrigger
} from '../types/game';
import { CardManager, setDeckLogCallback, logDeckState } from './CardManager';
import { CardDealer } from './CardDealer';
import { CharacterManager } from './CharacterManager';
import { AIPlayer } from './AIPlayer';
import { DistanceCalculator } from './DistanceCalculator';
import { DebugConfig } from '../components/DebugSetup/DebugSetup';

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

  constructor(
    // @ts-ignore - 保留以备后续使用
    playerCount: number = 4
  ) {
    GameEngine.instanceCount++;
    console.log(`创建 GameEngine 实例... (第 ${GameEngine.instanceCount} 次)`);
    this.cardManager = CardManager.getInstance();
    this.characterManager = CharacterManager.getInstance();
    // 初始化空游戏状态，不创建牌堆和玩家
    this.state = this.createEmptyGameState();
    this.aiPlayer = new AIPlayer(this);

    // 设置牌堆日志回调
    this.setupDeckLogCallback();
  }

  // 设置牌堆日志回调
  private setupDeckLogCallback(): void {
    setDeckLogCallback((reason: string, cards: Card[], changedCards?: Card[]) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('deck-state-update', {
          detail: {
            reason,
            cards,
            changedCards
          }
        }));
      }
    });
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
        delayedSpells: {},
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

  // 使用调试配置开始游戏
  startDebugGame(config: DebugConfig): void {
    console.log('GameEngine.startDebugGame 被调用', config);
    if (!this.gameStartedFlag) {
      console.log('使用调试配置初始化游戏');
      this.state = this.initializeGameWithConfig(config);
      this.gameStartedFlag = true;
    }
    this.state.phase = GamePhase.TURN_START;
    this.processTurn();
  }

  // 使用调试配置初始化游戏
  private initializeGameWithConfig(config: DebugConfig): GameState {
    console.log('使用调试配置初始化游戏');

    // 创建牌堆
    const deck = this.cardManager.createStandardDeck();

    // 创建发牌系统
    const cardDealer = new CardDealer(deck);

    // 根据配置创建玩家（先不发放手牌）
    const players: Player[] = config.players.map((playerConfig, index) => {
      const character = this.characterManager.getCharacter(playerConfig.characterId);
      if (!character) {
        throw new Error(`武将 ${playerConfig.characterId} 不存在`);
      }

      const isAI = index !== 0;

      return {
        id: `player_${index}`,
        character: { ...character, hp: character.maxHp },
        identity: playerConfig.identity,
        handCards: [],
        equipment: {},
        delayedSpells: {},
        isDead: false,
        isAI,
      };
    });

    // 使用发牌系统发放初始手牌（统一使用CardDealer，避免直接操作deck）
    players.forEach((player, index) => {
      const playerConfig = config.players[index];
      const cardNames = playerConfig.initialHandCardNames || [];

      // 统一使用CardDealer处理所有发牌逻辑
      const dealtCards = cardDealer.dealInitialHandCardsByName(player, cardNames);

      // 记录发牌后的牌堆状态
      logDeckState(`${player.character.name}手牌发放完成`, deck, dealtCards);
    });

    // 记录所有玩家发牌完成后的最终牌堆状态
    logDeckState('所有玩家初始手牌发放完成-最终牌堆', deck);

    // 找到主公的索引
    const lordIndex = players.findIndex(p => p.identity === Identity.LORD);
    const startingPlayerIndex = lordIndex >= 0 ? lordIndex : 0;

    // 构建游戏状态（deck 已经被发牌系统修改）
    const gameState: GameState = {
      players,
      deck,
      discardPile: [],
      currentPlayerIndex: startingPlayerIndex,
      phase: GamePhase.GAME_START,
      round: 1,
    };

    // 打印调试信息
    console.log('\n========== 调试模式 - 游戏初始化完成 ==========');
    console.log(`玩家数量: ${players.length}`);
    players.forEach(player => {
      const handCardsStr = player.handCards.map(c => `${c.name}[${c.suit}${c.number}]`).join(', ');
      console.log(`${player.character.name} (${player.identity}): ${handCardsStr}`);
    });
    console.log(`牌堆剩余: ${deck.length} 张牌`);
    console.log('==============================================\n');

    return gameState;
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
        // 响应阶段：等待目标玩家响应（打出闪/杀等）
        // 这个阶段由玩家操作或AI自动响应触发，不需要自动处理
        console.log(`响应阶段: 等待 ${this.state.pendingResponse?.request.targetPlayerId} 响应`);
        // 检查是否是AI目标，如果是则自动响应
        if (this.state.pendingResponse) {
          const pendingResponse = this.state.pendingResponse;
          const targetPlayer = this.state.players.find(p => p.id === pendingResponse.request.targetPlayerId);

          if (targetPlayer?.isAI) {
            // 根据响应类型选择不同的AI处理方法
            if (pendingResponse.duelState) {
              // 决斗响应
              this.processDuelResponse(targetPlayer);
            } else if (pendingResponse.request.responseType === ResponseType.NULLIFY) {
              // 无懈可击响应已在 processAINullificationResponse 中处理
              // 这里不需要额外处理
            } else {
              // 普通响应（闪、杀等）
              this.processAIResponse(targetPlayer);
            }
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
    const player = this.getCurrentPlayer();
    const delayedSpells = player.delayedSpells;

    // 检查是否有延时锦囊牌需要判定
    const hasDelayedSpell = delayedSpells.lightning || delayedSpells.supplyShortage || delayedSpells.indulgence;

    if (!hasDelayedSpell) {
      // 没有延时锦囊牌，直接进入摸牌阶段
      this.state.phase = GamePhase.DRAW;
      this.processTurn();
      return;
    }

    // 有延时锦囊牌，进入判定流程
    // 按照顺序处理：闪电 -> 兵粮寸断 -> 乐不思蜀
    this.processDelayedSpells(player);
  }

  // 处理延时锦囊牌判定（带无懈可击时机）
  private processDelayedSpells(player: Player): void {
    const delayedSpells = player.delayedSpells;

    // 处理闪电
    if (delayedSpells.lightning) {
      this.startDelayedSpellJudgment(player, 'lightning');
      return;
    }

    // 处理兵粮寸断
    if (delayedSpells.supplyShortage) {
      this.startDelayedSpellJudgment(player, 'supply_shortage');
      return;
    }

    // 处理乐不思蜀
    if (delayedSpells.indulgence) {
      this.startDelayedSpellJudgment(player, 'indulgence');
      return;
    }

    // 所有延时锦囊牌处理完毕，进入摸牌阶段
    this.state.phase = GamePhase.DRAW;
    this.processTurn();
  }

  // 开始延时锦囊牌判定（给无懈可击时机）
  private startDelayedSpellJudgment(player: Player, spellType: 'lightning' | 'supply_shortage' | 'indulgence'): void {
    const spellNames: Record<string, string> = {
      'lightning': '闪电',
      'supply_shortage': '兵粮寸断',
      'indulgence': '乐不思蜀',
    };
    const spellName = spellNames[spellType];

    console.log(`${player.character.name} 的判定阶段：【${spellName}】即将判定，等待无懈可击...`);

    // 创建判定执行函数
    const judgeEffect = () => {
      this.executeDelayedSpellJudgment(player, spellType);
    };

    // 创建响应请求，给场上玩家打出无懈可击的机会
    this.state.pendingResponse = {
      request: {
        targetPlayerId: player.id, // 延时锦囊牌的目标玩家（即当前判定玩家）
        sourcePlayerId: player.id,
        cardName: spellName,
        responseCardName: SpellCardName.NULLIFICATION,
        damage: 0,
        responseType: ResponseType.NULLIFY,
        spellCardEffect: judgeEffect,
      },
      resolved: false,
      result: false,
    };

    // 进入响应阶段
    this.state.phase = GamePhase.RESPONSE;

    // 检查是否有AI可以打出无懈可击
    const hasDelayedSpell = spellType === 'lightning' ? player.delayedSpells.lightning :
      spellType === 'supply_shortage' ? player.delayedSpells.supplyShortage :
        player.delayedSpells.indulgence;
    if (hasDelayedSpell) {
      this.processAINullificationResponseForDelayedSpell(player, spellName, judgeEffect);
    } else {
      // 没有对应的延时锦囊牌，直接执行判定
      judgeEffect();
    }
  }

  // 执行延时锦囊牌判定（无懈可击响应后调用）
  private executeDelayedSpellJudgment(player: Player, spellType: 'lightning' | 'supply_shortage' | 'indulgence'): void {
    let shouldSkipToNext = false;

    switch (spellType) {
      case 'lightning':
        if (player.delayedSpells.lightning) {
          console.log(`${player.character.name} 的判定阶段：【闪电】判定`);
          this.judgeLightning(player);
        }
        break;
      case 'supply_shortage':
        if (player.delayedSpells.supplyShortage) {
          console.log(`${player.character.name} 的判定阶段：【兵粮寸断】判定`);
          const success = this.judgeSupplyShortage(player);
          if (success) {
            // 判定成功，跳过摸牌阶段
            console.log(`${player.character.name} 跳过摸牌阶段`);
            this.state.phase = GamePhase.PLAY;
            this.processTurn();
            return;
          }
        }
        break;
      case 'indulgence':
        if (player.delayedSpells.indulgence) {
          console.log(`${player.character.name} 的判定阶段：【乐不思蜀】判定`);
          const success = this.judgeIndulgence(player);
          if (success) {
            // 判定成功，跳过出牌阶段
            console.log(`${player.character.name} 跳过出牌阶段`);
            // 直接进入弃牌阶段
            this.handleDiscard();
            return;
          }
        }
        break;
    }

    // 继续处理下一个延时锦囊牌
    this.processDelayedSpells(player);
  }

  // AI无懈可击响应（用于延时锦囊牌判定前）
  private processAINullificationResponseForDelayedSpell(
    targetPlayer: Player,
    spellName: string,
    judgeEffect: () => void
  ): void {
    // 检查所有AI玩家是否有无懈可击（排除延时锦囊牌的目标玩家自己）
    const otherPlayers = this.state.players.filter(p =>
      p.id !== targetPlayer.id && !p.isDead && p.isAI
    );

    // 检查是否有AI玩家有无懈可击
    const playersWithNullification = otherPlayers.filter(player =>
      player.handCards.some(c => c.name === SpellCardName.NULLIFICATION)
    );

    // 如果没有AI玩家有无懈可击，立即执行判定
    if (playersWithNullification.length === 0) {
      console.log(`没有AI玩家有无懈可击，【${spellName}】判定立即进行`);
      judgeEffect();
      return;
    }

    // 延迟一下让AI决定是否使用无懈可击
    setTimeout(() => {
      const currentPending = this.state.pendingResponse;
      if (!currentPending || currentPending.resolved) return;
      if (currentPending.request.responseType !== ResponseType.NULLIFY) return;

      // 按血量排序（血量低的优先）
      const sortedPlayers = [...playersWithNullification].sort((a, b) => a.character.hp - b.character.hp);

      for (const player of sortedPlayers) {
        const nullificationCard = player.handCards.find(
          c => c.name === SpellCardName.NULLIFICATION
        );
        if (!nullificationCard) continue;

        // 判断是否使用无懈可击（保护目标玩家）
        const shouldUse = this.shouldUseNullificationForDelayedSpell(player, targetPlayer, spellName);

        if (shouldUse) {
          console.log(`AI ${player.character.name} 打出【无懈可击】抵消【${spellName}】`);
          this.respondToNullification(player.id, nullificationCard.id);
          return;
        }
      }

      // 没有AI打出无懈可击，执行判定
      console.log(`没有AI使用无懈可击，【${spellName}】判定进行`);
      judgeEffect();
    }, 800);
  }

  // 判断是否应对延时锦囊牌使用无懈可击
  private shouldUseNullificationForDelayedSpell(player: Player, targetPlayer: Player, spellName: string): boolean {
    // 判断是否为盟友
    const isAlly = (identity1: Identity, identity2: Identity): boolean => {
      if ((identity1 === Identity.LORD || identity1 === Identity.LOYALIST) &&
        (identity2 === Identity.LORD || identity2 === Identity.LOYALIST)) {
        return true;
      }
      if (identity1 === Identity.REBEL && identity2 === Identity.REBEL) {
        return true;
      }
      return false;
    };

    const targetIsAlly = isAlly(player.identity, targetPlayer.identity);

    // 根据延时锦囊牌类型和盟友关系决定是否使用无懈可击
    switch (spellName) {
      case '闪电':
        // 闪电：通常不使用无懈可击，因为可能转移到自己身上
        return false;
      case '兵粮寸断':
        // 兵粮寸断：对盟友使用无懈可击保护
        return targetIsAlly;
      case '乐不思蜀':
        // 乐不思蜀：对盟友使用无懈可击保护
        return targetIsAlly;
      default:
        return false;
    }
  }

  // 判定乐不思蜀
  private judgeIndulgence(player: Player): boolean {
    const card = player.delayedSpells.indulgence;
    if (!card) return false;

    // 进行判定
    const judgeResult = this.cardManager.draw(this.state.deck, 1);
    if (judgeResult.cards.length === 0) {
      console.log('牌堆已空，无法判定');
      return false;
    }

    const judgeCard = judgeResult.cards[0];
    this.state.deck = judgeResult.remaining;
    console.log(`${player.character.name} 【乐不思蜀】判定: ${judgeCard.suit}${judgeCard.number} ${judgeCard.name}`);

    // 判定结果不为红桃时生效
    const isEffective = judgeCard.suit !== CardSuit.HEART;

    // 将判定牌放入弃牌堆
    this.state.discardPile.push(judgeCard);
    // 将乐不思蜀放入弃牌堆
    this.state.discardPile.push(card);
    player.delayedSpells.indulgence = undefined;

    if (isEffective) {
      console.log(`【乐不思蜀】生效！${player.character.name} 跳过出牌阶段`);
    } else {
      console.log(`【乐不思蜀】未生效（红桃）`);
    }

    return isEffective;
  }

  // 判定兵粮寸断
  private judgeSupplyShortage(player: Player): boolean {
    const card = player.delayedSpells.supplyShortage;
    if (!card) return false;

    // 进行判定
    const judgeResult = this.cardManager.draw(this.state.deck, 1);
    if (judgeResult.cards.length === 0) {
      console.log('牌堆已空，无法判定');
      return false;
    }

    const judgeCard = judgeResult.cards[0];
    this.state.deck = judgeResult.remaining;
    console.log(`${player.character.name} 【兵粮寸断】判定: ${judgeCard.suit}${judgeCard.number} ${judgeCard.name}`);

    // 判定结果不为梅花时生效
    const isEffective = judgeCard.suit !== CardSuit.CLUB;

    // 通知前端显示判定动画
    this.actionListeners.forEach(listener => listener({
      action: GameAction.JUDGE,
      playerId: player.id,
      cardId: judgeCard.id,
      cardName: judgeCard.name,
      judgeType: 'supply_shortage',
      judgeCard: judgeCard,
      isEffective: isEffective,
      logMessage: `${player.character.name} 【兵粮寸断】判定: ${judgeCard.suit}${judgeCard.number} ${judgeCard.name}，${isEffective ? '生效' : '未生效（梅花）'}`,
    }));

    // 将判定牌放入弃牌堆
    this.state.discardPile.push(judgeCard);
    // 将兵粮寸断放入弃牌堆
    this.state.discardPile.push(card);
    player.delayedSpells.supplyShortage = undefined;

    if (isEffective) {
      console.log(`【兵粮寸断】生效！${player.character.name} 跳过摸牌阶段`);
    } else {
      console.log(`【兵粮寸断】未生效（梅花）`);
    }

    return isEffective;
  }

  // 判定闪电
  private judgeLightning(player: Player): void {
    const card = player.delayedSpells.lightning;
    if (!card) return;

    // 进行判定
    const judgeResult = this.cardManager.draw(this.state.deck, 1);
    if (judgeResult.cards.length === 0) {
      console.log('牌堆已空，无法判定');
      return;
    }

    const judgeCard = judgeResult.cards[0];
    this.state.deck = judgeResult.remaining;
    console.log(`${player.character.name} 【闪电】判定: ${judgeCard.suit}${judgeCard.number} ${judgeCard.name}`);

    // 将判定牌放入弃牌堆
    this.state.discardPile.push(judgeCard);

    // 判定结果为黑桃2-9时生效
    const isEffective = judgeCard.suit === CardSuit.SPADE &&
      judgeCard.number >= 2 && judgeCard.number <= 9;

    if (isEffective) {
      console.log(`【闪电】生效！${player.character.name} 受到3点雷电伤害`);
      // 将闪电放入弃牌堆
      this.state.discardPile.push(card);
      player.delayedSpells.lightning = undefined;
      // 造成3点雷电伤害
      this.dealDamage(player.id, player.id, 3);
    } else {
      console.log(`【闪电】未生效，移动到下家`);
      // 将闪电移动到下家
      player.delayedSpells.lightning = undefined;
      const nextPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      const nextPlayer = this.state.players[nextPlayerIndex];
      nextPlayer.delayedSpells.lightning = card;
      console.log(`【闪电】移动到 ${nextPlayer.character.name} 的判定区`);
    }
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
    // 检查当前是否是出牌阶段
    if (this.state.phase !== GamePhase.PLAY) {
      console.log(`出牌失败: 当前不是出牌阶段，当前阶段是 ${this.state.phase}`);
      return false;
    }

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

    // 对于装备牌，保存日志消息到卡牌对象（在移除前）
    let equipmentLogMessage: string | undefined;
    if (card.type === CardType.EQUIPMENT) {
      equipmentLogMessage = (card as any).logMessage;
    }

    // 移除手牌
    player.handCards.splice(cardIndex, 1);

    // 将日志消息重新附加到卡牌对象（用于executeAction获取）
    if (equipmentLogMessage) {
      (card as any).logMessage = equipmentLogMessage;
    }

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

        // 确定伤害类型
        const damageType = card.name === BasicCardName.FIRE_ATTACK_CARD ? 'fire' :
          card.name === BasicCardName.THUNDER_ATTACK ? 'thunder' : 'normal';

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
            damageType: damageType,
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

    // 延时锦囊牌（兵粮寸断、乐不思蜀、闪电）在使用时直接生效，放置到判定区
    // 无懈可击的时机是在判定阶段开始前，而不是使用时
    if (card.name === SpellCardName.SUPPLY_SHORTAGE ||
      card.name === SpellCardName.INDULGENCE ||
      card.name === SpellCardName.LIGHTNING) {
      console.log(`${player.character.name} 使用【${card.name}】（延时锦囊牌，直接放置到判定区）`);
      return this.executeSpellEffect(player, card, targets);
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
        // 决斗：与目标拼杀，由目标先出杀
        if (targets.length === 0) return false;
        const duelTarget = targets[0];
        if (duelTarget.isDead) return false;
        // 启动决斗流程，目标先出杀
        this.startDuel(player, duelTarget);
        return true;

      case SpellCardName.FIRE_ATTACK:
        // 火攻：目标展示一张手牌，使用者可弃置一张同花色手牌对其造成1点火焰伤害
        if (targets.length === 0) return false;
        const fireTarget = targets[0];
        if (fireTarget.isDead) return false;

        // 检查目标是否有手牌
        if (fireTarget.handCards.length === 0) {
          console.log(`${fireTarget.character.name} 没有手牌，火攻无效`);
          return false;
        }

        // 目标随机展示一张手牌
        const shownCardIndex = Math.floor(Math.random() * fireTarget.handCards.length);
        const shownCard = fireTarget.handCards[shownCardIndex];

        console.log(`${fireTarget.character.name} 展示了手牌 [${shownCard.suit}${shownCard.number} ${shownCard.name}]`);

        // 检查使用者是否有同花色的手牌
        // 注意：此时火攻牌已经被从手牌中移除（在 playCard 中），所以不需要排除
        const sameSuitCards = player.handCards.filter(c =>
          c.suit === shownCard.suit
        );

        if (sameSuitCards.length === 0) {
          console.log(`${player.character.name} 没有 ${shownCard.suit} 花色的手牌，无法造成伤害`);

          // 通知前端显示详细日志（标记为效果结果，避免重复记录）
          console.log('[GameEngine] 火攻（无同花色）：发送 shownCard', shownCard);
          this.actionListeners.forEach(listener => listener({
            action: GameAction.PLAY_CARD,
            playerId: player.id,
            cardId: card.id,
            cardName: card.name,
            targetIds: [fireTarget.id],
            logMessage: `${player.character.name} 对 ${fireTarget.character.name} 使用了【火攻】，${fireTarget.character.name} 展示了 [${shownCard.suit}${shownCard.number} ${shownCard.name}]，但 ${player.character.name} 没有同花色手牌`,
            isEffectResult: true,
            fireAttackShownCard: shownCard,
          }));

          // 进入火攻提示阶段，显示没有同花色手牌的提示
          this.state.phase = GamePhase.RESPONSE;
          this.state.pendingResponse = {
            request: {
              targetPlayerId: player.id,
              sourcePlayerId: fireTarget.id,
              cardName: '火攻',
              responseCardName: '无同花色手牌',
              damage: 0,
              responseType: ResponseType.FIRE_ATTACK,
            },
            resolved: false,
            result: false,
            fireAttackState: {
              sourceId: player.id,
              targetId: fireTarget.id,
              shownCard: shownCard,
              noSameSuit: true, // 标记没有同花色手牌
            },
          };

          // 如果是AI使用，自动结束火攻
          if (player.isAI) {
            setTimeout(() => {
              this.resolveFireAttackNoDamage();
            }, 1500);
          }

          return true; // 火攻仍然算使用成功，只是没有伤害
        }

        // 进入火攻响应阶段
        this.state.phase = GamePhase.RESPONSE;
        this.state.pendingResponse = {
          request: {
            targetPlayerId: player.id,
            sourcePlayerId: fireTarget.id,
            cardName: '火攻',
            responseCardName: `弃置一张${shownCard.suit}花色的手牌造成火焰伤害`,
            damage: 1,
            responseType: ResponseType.FIRE_ATTACK,
          },
          resolved: false,
          result: false,
          fireAttackState: {
            sourceId: player.id,
            targetId: fireTarget.id,
            shownCard: shownCard,
          },
        };

        // 通知前端进入火攻响应阶段（标记为效果结果，避免重复记录）
        console.log('[GameEngine] 火攻（有同花色）：发送 shownCard', shownCard);
        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: player.id,
          cardId: card.id,
          cardName: card.name,
          targetIds: [fireTarget.id],
          logMessage: `${player.character.name} 对 ${fireTarget.character.name} 使用了【火攻】，${fireTarget.character.name} 展示了 [${shownCard.suit}${shownCard.number} ${shownCard.name}]`,
          isEffectResult: true,
          fireAttackShownCard: shownCard,
        }));

        // 如果是AI使用，自动选择一张同花色牌弃置
        if (player.isAI) {
          setTimeout(() => {
            this.processFireAttackResponse(player, shownCard.suit);
          }, 1000);
        }

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
        const cardSource = stolenItem.type === 'hand' ? '手牌' : '装备区';
        console.log(`${player.character.name} 从 ${stealTarget.character.name} 的${cardSource}获得了【${stolenCard.suit}${stolenCard.number} ${stolenCard.name}】`);

        // 通知前端显示详细日志（标记为效果结果，避免重复记录）
        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: player.id,
          cardId: card.id,
          cardName: card.name,
          targetIds: [stealTarget.id],
          logMessage: `${player.character.name} 对 ${stealTarget.character.name} 使用了【顺手牵羊】，从${cardSource}获得了【${stolenCard.suit}${stolenCard.number} ${stolenCard.name}】`,
          isEffectResult: true,
        }));

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
        const dismantleCardSource = dismantleItem.type === 'hand' ? '手牌' : '装备区';
        console.log(`${player.character.name} 弃置了 ${dismantleTarget.character.name} ${dismantleCardSource}中的【${dismantleItem.card.suit}${dismantleItem.card.number} ${dismantleItem.card.name}】`);

        // 记录弃牌堆变化
        this.saveDiscardPileState(`${player.character.name}过河拆桥`, [dismantleItem.card]);

        // 通知前端显示详细日志（标记为效果结果，避免重复记录）
        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: player.id,
          cardId: card.id,
          cardName: card.name,
          targetIds: [dismantleTarget.id],
          logMessage: `${player.character.name} 对 ${dismantleTarget.character.name} 使用了【过河拆桥】，弃置了${dismantleCardSource}中的【${dismantleItem.card.suit}${dismantleItem.card.number} ${dismantleItem.card.name}】`,
          isEffectResult: true,
        }));

        return true;

      case SpellCardName.PEACH_GARDEN:
        // 桃园结义：所有角色回复1点体力
        const healedPlayers = this.state.players.filter(p => !p.isDead && p.character.hp < p.character.maxHp);
        const healedNames = healedPlayers.map(p => p.character.name).join('、');

        this.state.players.forEach(p => {
          if (!p.isDead && p.character.hp < p.character.maxHp) {
            this.heal(p.id, 1);
          }
        });

        // 通知前端显示详细日志（标记为效果结果，避免重复记录）
        const peachGardenLog = healedNames
          ? `${player.character.name} 使用了【桃园结义】，${healedNames} 回复了1点体力`
          : `${player.character.name} 使用了【桃园结义】，但所有角色体力已满`;

        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: player.id,
          cardId: card.id,
          cardName: card.name,
          logMessage: peachGardenLog,
          isEffectResult: true,
        }));

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

        // 构建摸到牌的描述
        const drawnCardsDesc = cards.map(c => `【${c.suit}${c.number} ${c.name}】`).join('、');
        console.log(`${player.character.name} 摸了 ${cards.length} 张牌：${drawnCardsDesc}`);

        // 通知前端显示详细日志（标记为效果结果，避免重复记录）
        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: player.id,
          cardId: card.id,
          cardName: card.name,
          logMessage: `${player.character.name} 使用了【无中生有】，摸到了${drawnCardsDesc}`,
          isEffectResult: true,
        }));

        // 记录牌堆变化
        this.saveDeckState(`${player.character.name}无中生有`, cards);
        return true;

      case SpellCardName.INDULGENCE:
        // 乐不思蜀：置于目标判定区
        if (targets.length === 0) return false;
        const indulgenceTarget = targets[0];
        if (indulgenceTarget.isDead) return false;
        if (indulgenceTarget.delayedSpells.indulgence) {
          console.log(`${indulgenceTarget.character.name} 已经有【乐不思蜀】了`);
          return false;
        }

        indulgenceTarget.delayedSpells.indulgence = card;
        console.log(`${player.character.name} 对 ${indulgenceTarget.character.name} 使用了【乐不思蜀】`);

        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: player.id,
          cardId: card.id,
          cardName: card.name,
          targetIds: [indulgenceTarget.id],
          logMessage: `${player.character.name} 对 ${indulgenceTarget.character.name} 使用了【乐不思蜀】`,
          isEffectResult: true,
        }));
        return true;

      case SpellCardName.SUPPLY_SHORTAGE:
        // 兵粮寸断：置于目标判定区
        // 延时锦囊牌在使用时直接放置到判定区，不需要无懈可击响应
        // 无懈可击的时机是在判定阶段开始前
        if (targets.length === 0) return false;
        const shortageTarget = targets[0];
        if (shortageTarget.isDead) return false;
        if (shortageTarget.delayedSpells.supplyShortage) {
          console.log(`${shortageTarget.character.name} 已经有【兵粮寸断】了`);
          return false;
        }

        shortageTarget.delayedSpells.supplyShortage = card;
        console.log(`${player.character.name} 对 ${shortageTarget.character.name} 使用了【兵粮寸断】`);

        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: player.id,
          cardId: card.id,
          cardName: card.name,
          targetIds: [shortageTarget.id],
          logMessage: `${player.character.name} 对 ${shortageTarget.character.name} 使用了【兵粮寸断】`,
          isEffectResult: true,
        }));
        return true;

      case SpellCardName.LIGHTNING:
        // 闪电：置于自己判定区
        if (player.delayedSpells.lightning) {
          console.log(`${player.character.name} 已经有【闪电】了`);
          return false;
        }

        player.delayedSpells.lightning = card;
        console.log(`${player.character.name} 使用了【闪电】`);

        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: player.id,
          cardId: card.id,
          cardName: card.name,
          logMessage: `${player.character.name} 使用了【闪电】`,
          isEffectResult: true,
        }));
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
    let logMessage: string;
    if (currentEquipment) {
      this.state.discardPile.push(currentEquipment);
      console.log(`${player.character.name} 替换装备：弃置了【${currentEquipment.suit}${currentEquipment.number} ${currentEquipment.name}】，装备了【${card.suit}${card.number} ${card.name}】`);

      // 记录弃牌堆变化
      this.saveDiscardPileState(`${player.character.name}替换装备`, [currentEquipment]);
      logMessage = `${player.character.name} 替换装备：弃置了【${currentEquipment.suit}${currentEquipment.number} ${currentEquipment.name}】，装备了【${card.suit}${card.number} ${card.name}】`;
    } else {
      console.log(`${player.character.name} 装备了【${card.suit}${card.number} ${card.name}】`);
      logMessage = `${player.character.name} 装备了【${card.suit}${card.number} ${card.name}】`;
    }

    // 装备新牌
    player.equipment[equipmentKey] = card;

    // 不直接调用监听器，让 executeAction 统一处理
    // 通过设置 logMessage 到 card 对象，让 executeAction 可以获取到
    (card as any).logMessage = logMessage;

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

    // @ts-ignore - 保留以备后续使用
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

  // 进入濒死阶段
  enterDyingPhase(playerId: string, pendingDraw?: number): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isDead) return;

    console.log(`${player.character.name} 进入濒死阶段，需要使用【桃】或【酒】自救`);

    // 设置濒死状态
    this.state.dyingState = {
      playerId: playerId,
      neededPeaches: 1,      // 需要1个桃
      currentPeaches: 0,     // 已使用0个
      canUseWine: true,      // 可以使用酒自救
      pendingDraw: pendingDraw, // 濒死判定通过后需要摸的牌数（苦肉技能用）
    };

    // 切换到濒死阶段
    this.state.phase = GamePhase.DYING;

    // 通知UI更新
    this.actionListeners.forEach(listener => listener({
      action: GameAction.PLAY_CARD,
      playerId: player.id,
      cardId: '',
      cardName: '濒死',
      targetIds: [player.id],
      isResponse: false,
      logMessage: `${player.character.name} 进入濒死阶段，需要使用【桃】或【酒】自救`,
    }));

    // 如果是AI玩家，自动使用桃或酒
    if (player.isAI) {
      this.handleAIDyingResponse(player);
    }
  }

  // 查找指定类型的卡牌索引（辅助函数）
  private findCardIndexByType(cards: Card[], cardType: 'peach' | 'wine'): number {
    return cards.findIndex(c =>
      c.name === (cardType === 'peach' ? BasicCardName.PEACH : BasicCardName.WINE)
    );
  }

  // 检查是否包含指定类型的卡牌（辅助函数）
  private hasCardOfType(cards: Card[], cardType: 'peach' | 'wine'): boolean {
    return cards.some(c =>
      c.name === (cardType === 'peach' ? BasicCardName.PEACH : BasicCardName.WINE)
    );
  }

  // 处理濒死阶段的响应（使用桃或酒）
  handleDyingResponse(playerId: string, cardType: 'peach' | 'wine'): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || !this.state.dyingState) return false;

    // 检查是否是濒死玩家本人
    if (this.state.dyingState.playerId !== playerId) {
      console.log('只有濒死玩家本人可以使用桃或酒自救');
      return false;
    }

    // 检查手牌中是否有对应的牌
    if (!this.hasCardOfType(player.handCards, cardType)) {
      console.log(`${player.character.name} 手牌中没有【${cardType === 'peach' ? '桃' : '酒'}】`);
      return false;
    }

    // 使用牌
    const cardIndex = this.findCardIndexByType(player.handCards, cardType);

    if (cardIndex !== -1) {
      const usedCard = player.handCards.splice(cardIndex, 1)[0];
      this.state.discardPile.push(usedCard);

      // 回复1点体力
      player.character.hp += 1;
      this.state.dyingState.currentPeaches += 1;

      console.log(`${player.character.name} 使用【${usedCard.name}】回复1点体力，当前体力: ${player.character.hp}`);

      // 检查是否脱离濒死状态
      if (player.character.hp > 0) {
        console.log(`${player.character.name} 脱离濒死状态`);
        this.exitDyingPhase();
      }

      return true;
    }

    return false;
  }

  // 检查濒死玩家是否有桃或酒
  checkDyingPlayerHasSaveCard(playerId: string): { hasPeach: boolean; hasWine: boolean } {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return { hasPeach: false, hasWine: false };

    const hasPeach = player.handCards.some(card => card.name === BasicCardName.PEACH);
    const hasWine = player.handCards.some(card => card.name === BasicCardName.WINE);

    return { hasPeach, hasWine };
  }

  // 玩家放弃自救（死亡）
  giveUpDying(playerId: string): boolean {
    if (!this.state.dyingState || this.state.dyingState.playerId !== playerId) {
      console.log('当前不在濒死状态或不是该玩家的濒死阶段');
      return false;
    }

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    console.log(`${player.character.name} 放弃自救，角色死亡`);

    // 退出濒死阶段，标记为死亡
    this.exitDyingPhase(true);

    return true;
  }

  // 处理AI濒死响应
  private handleAIDyingResponse(player: Player): void {
    if (!this.state.dyingState) return;

    const { hasPeach, hasWine } = this.checkDyingPlayerHasSaveCard(player.id);

    // 优先使用桃，其次使用酒
    if (hasPeach) {
      this.handleDyingResponse(player.id, 'peach');
    } else if (hasWine && this.state.dyingState.canUseWine) {
      this.handleDyingResponse(player.id, 'wine');
    } else {
      // 没有桃或酒，死亡
      console.log(`${player.character.name} 没有【桃】或【酒】，无法自救`);
      this.exitDyingPhase(true); // true 表示死亡
    }
  }

  // 退出濒死阶段
  private exitDyingPhase(playerDied: boolean = false): void {
    const dyingState = this.state.dyingState;
    const dyingPlayerId = dyingState?.playerId;
    const pendingDraw = dyingState?.pendingDraw;
    this.state.dyingState = undefined;

    if (playerDied && dyingPlayerId) {
      const player = this.state.players.find(p => p.id === dyingPlayerId);
      if (player) {
        this.handleDeath(player);
      }
    } else {
      // 脱离濒死，回到出牌阶段
      console.log('濒死阶段结束，回到出牌阶段继续游戏');

      // 切换回出牌阶段
      this.state.phase = GamePhase.PLAY;

      // 如果有延迟摸牌（苦肉技能），执行摸牌
      if (pendingDraw && pendingDraw > 0 && dyingPlayerId) {
        const player = this.state.players.find(p => p.id === dyingPlayerId);
        if (player) {
          console.log(`${player.character.name} 濒死判定通过，执行苦肉的摸${pendingDraw}张牌效果`);
          const drawResult = this.cardManager.draw(this.state.deck, pendingDraw);
          player.handCards.push(...drawResult.cards);

          const drawnCardNames = drawResult.cards.map(c => `【${c.name}】[${c.suit}${c.number}]`).join('、');
          console.log(`${player.character.name} 【苦肉】摸${pendingDraw}张牌: ${drawnCardNames}`);
          console.log(`${player.character.name} 当前手牌数: ${player.handCards.length}`);

          // 通知UI更新
          this.actionListeners.forEach(listener => listener({
            action: GameAction.PLAY_CARD,
            playerId: player.id,
            cardId: '',
            cardName: '苦肉摸牌',
            targetIds: [player.id],
            isResponse: false,
            logMessage: `${player.character.name} 脱离濒死状态，【苦肉】摸${pendingDraw}张牌: ${drawnCardNames}`,
          }));
          return; // 已经发送了通知，直接返回
        }
      }

      // 通知UI更新
      const player = dyingPlayerId ? this.state.players.find(p => p.id === dyingPlayerId) : undefined;
      if (player) {
        this.actionListeners.forEach(listener => listener({
          action: GameAction.PLAY_CARD,
          playerId: player.id,
          cardId: '',
          cardName: '脱离濒死',
          targetIds: [player.id],
          isResponse: false,
          logMessage: `${player.character.name} 脱离濒死状态，继续出牌阶段`,
        }));
      }
    }
  }

  // 造成伤害
  dealDamage(fromId: string, toId: string, amount: number, damageType?: 'normal' | 'fire' | 'thunder'): void {
    const fromPlayer = this.state.players.find(p => p.id === fromId);
    const target = this.state.players.find(p => p.id === toId);
    if (!target || target.isDead) return;

    target.character.hp -= amount;

    // 根据伤害类型显示不同日志
    const damageTypeText = damageType === 'fire' ? '火焰' : damageType === 'thunder' ? '雷电' : '';
    console.log(`${target.character.name} 受到 ${amount} 点${damageTypeText}伤害，剩余体力: ${target.character.hp}`);

    // 如果体力降至0或以下，进入濒死阶段
    if (target.character.hp <= 0) {
      console.log(`${target.character.name} 体力降至0或以下，进入濒死阶段`);
      this.enterDyingPhase(target.id);
    }
  }

  // 造成伤害并检查游戏结束（用于需要立即停止游戏流程的场景）
  dealDamageAndCheckGameOver(fromId: string, toId: string, amount: number): boolean {
    this.dealDamage(fromId, toId, amount);
    // 返回游戏是否结束
    return this.state.phase === GamePhase.GAME_OVER;
  }

  // 回复体力
  heal(playerId: string, amount: number): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isDead) return;

    const oldHp = player.character.hp;
    player.character.hp = Math.min(player.character.hp + amount, player.character.maxHp);
  }

  // 处理死亡
  private handleDeath(player: Player, fromId?: string): void {
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

    // 检查是否是主公杀死了忠臣
    if (fromId) {
      const fromPlayer = this.state.players.find(p => p.id === fromId);
      if (fromPlayer && fromPlayer.identity === Identity.LORD && player.identity === Identity.LOYALIST) {
        console.log(`${fromPlayer.character.name}(主公) 杀死了 ${player.character.name}(忠臣)，需要弃置所有手牌和装备！`);
        this.discardAllCardsAndEquipment(fromPlayer);
      }
    }

    // 检查游戏结束
    this.checkGameOver();
  }

  // 弃置所有手牌和装备（主公杀死忠臣时）
  private discardAllCardsAndEquipment(player: Player): void {
    const discardedCards: Card[] = [];

    // 弃置所有手牌
    if (player.handCards.length > 0) {
      discardedCards.push(...player.handCards);
      this.state.discardPile.push(...player.handCards);
      console.log(`${player.character.name} 弃置了 ${player.handCards.length} 张手牌`);
      player.handCards = [];
    }

    // 弃置所有装备
    if (player.equipment.weapon) {
      discardedCards.push(player.equipment.weapon);
      this.state.discardPile.push(player.equipment.weapon);
      console.log(`${player.character.name} 弃置了武器 ${player.equipment.weapon.name}`);
      player.equipment.weapon = undefined;
    }
    if (player.equipment.armor) {
      discardedCards.push(player.equipment.armor);
      this.state.discardPile.push(player.equipment.armor);
      console.log(`${player.character.name} 弃置了防具 ${player.equipment.armor.name}`);
      player.equipment.armor = undefined;
    }
    if (player.equipment.horsePlus) {
      discardedCards.push(player.equipment.horsePlus);
      this.state.discardPile.push(player.equipment.horsePlus);
      console.log(`${player.character.name} 弃置了+1马 ${player.equipment.horsePlus.name}`);
      player.equipment.horsePlus = undefined;
    }
    if (player.equipment.horseMinus) {
      discardedCards.push(player.equipment.horseMinus);
      this.state.discardPile.push(player.equipment.horseMinus);
      console.log(`${player.character.name} 弃置了-1马 ${player.equipment.horseMinus.name}`);
      player.equipment.horseMinus = undefined;
    }

    // 记录弃牌堆变化
    if (discardedCards.length > 0) {
      this.saveDiscardPileState(`${player.character.name}(主公杀忠臣)弃置所有牌`, discardedCards);

      // 通知前端
      this.actionListeners.forEach(listener => listener({
        action: GameAction.DISCARD_CARD,
        playerId: player.id,
        cardId: '',
        cardName: '主公杀忠臣惩罚',
        targetIds: [],
        logMessage: `${player.character.name}(主公) 杀死忠臣，弃置所有手牌和装备`,
      }));
    }
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
  onAction(listener: (action: ActionRequest) => void): () => void {
    this.actionListeners.push(listener);
    // 返回移除监听器的函数
    return () => {
      const index = this.actionListeners.indexOf(listener);
      if (index !== -1) {
        this.actionListeners.splice(index, 1);
      }
    };
  }

  // 执行动作
  executeAction(action: ActionRequest): boolean {
    // 在执行动作前获取卡牌名称和日志消息（因为执行后卡牌可能从手牌移除）
    let cardName: string | undefined = action.cardName;
    let equipmentLogMessage: string | undefined;
    let isSpellCard = false;
    if (action.action === GameAction.PLAY_CARD && action.cardId && !cardName) {
      const player = this.state.players.find(p => p.id === action.playerId);
      const card = player?.handCards.find(c => c.id === action.cardId);
      cardName = card?.name;
      // 获取装备牌的日志消息（如果有）
      equipmentLogMessage = (card as any)?.logMessage;
      // 检查是否是锦囊牌（需要无懈可击响应的牌）
      isSpellCard = card?.type === CardType.SPELL &&
        card.name !== SpellCardName.NULLIFICATION;
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
      // 对于锦囊牌（需要无懈可击响应的），不在这里发送通知
      // 因为详细日志会在 executeSpellEffect 中发送
      if (isSpellCard) {
        // 只更新状态，不发送日志通知
        this.actionListeners.forEach(listener => listener({
          ...action,
          cardName: cardName,
          isEffectResult: true, // 标记为效果结果，避免生成额外日志
        }));
      } else {
        // 补充 cardName 和日志消息到 action 中
        const actionWithCardName: ActionRequest = {
          ...action,
          cardName: cardName,
          logMessage: action.logMessage || equipmentLogMessage,
        };
        this.actionListeners.forEach(listener => listener(actionWithCardName));
      }
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
      const damageType = pendingResponse.request.damageType;
      const damageTypeText = damageType === 'fire' ? '火焰' : damageType === 'thunder' ? '雷电' : '';
      const logMessage = `${targetPlayer.character.name} 没有打出【${pendingResponse.request.responseCardName}】，受到${pendingResponse.request.damage}点${damageTypeText}伤害`;
      console.log(logMessage);

      // 造成伤害（带伤害类型）
      this.dealDamage(pendingResponse.request.sourcePlayerId, playerId, pendingResponse.request.damage, damageType);

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

      // 获取使用锦囊牌的玩家
      const sourcePlayer = this.state.players.find(p => p.id === pendingResponse.request.sourcePlayerId);

      // 只有当使用锦囊牌的玩家是人类玩家时，才需要调用processTurn继续游戏流程
      // 如果是AI玩家，AI的出牌循环(playCards)会继续处理，不需要额外调用processTurn
      if (sourcePlayer && !sourcePlayer.isAI) {
        console.log(`【${pendingResponse.request.cardName}】由人类玩家使用，继续游戏流程`);
        this.processTurn();
      } else {
        console.log(`【${pendingResponse.request.cardName}】由AI玩家使用，等待AI出牌循环继续`);
      }

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

  // 启动决斗流程
  private startDuel(challenger: Player, target: Player): void {
    console.log(`【决斗】${challenger.character.name} 向 ${target.character.name} 发起决斗！`);

    // 创建决斗状态，由目标先出杀
    const duelState: DuelState = {
      challengerId: challenger.id,
      targetId: target.id,
      currentTurnId: target.id, // 目标先出杀
      round: 1,
    };

    // 创建响应请求
    this.state.pendingResponse = {
      request: {
        targetPlayerId: target.id,
        sourcePlayerId: challenger.id,
        cardName: '决斗',
        responseCardName: BasicCardName.ATTACK,
        damage: 1,
        responseType: ResponseType.DUEL,
      },
      resolved: false,
      result: false,
      duelState: duelState,
    };

    // 进入响应阶段
    this.state.phase = GamePhase.RESPONSE;

    // 如果是AI目标，自动响应
    if (target.isAI) {
      this.processDuelResponse(target);
    }
  }

  // 处理决斗响应（打出杀或不响应）
  respondToDuel(playerId: string, cardId?: string): boolean {
    const pendingResponse = this.state.pendingResponse;
    if (!pendingResponse || !pendingResponse.duelState) {
      console.log(`respondToDuel 失败: 没有待处理的决斗响应`);
      return false;
    }
    if (pendingResponse.resolved) {
      console.log(`respondToDuel 失败: 响应已解决`);
      return false;
    }
    if (pendingResponse.request.responseType !== ResponseType.DUEL) {
      console.log(`respondToDuel 失败: 不是决斗响应类型`);
      return false;
    }

    const player = this.state.players.find(p => p.id === playerId);
    const challenger = this.state.players.find(p => p.id === pendingResponse.duelState?.challengerId);
    const target = this.state.players.find(p => p.id === pendingResponse.duelState?.targetId);

    if (!player || !challenger || !target) {
      console.log(`respondToDuel 失败: 找不到玩家`);
      return false;
    }

    const duelState = pendingResponse.duelState;

    // 检查是否是当前该出牌的玩家
    if (duelState.currentTurnId !== playerId) {
      console.log(`respondToDuel 失败: 不是 ${player.character.name} 的回合`);
      return false;
    }

    if (cardId) {
      // 玩家打出了杀
      const attackCard = player.handCards.find(c => c.id === cardId);
      if (!attackCard) {
        console.log(`respondToDuel 失败: 找不到卡牌`);
        return false;
      }

      // 验证是否是杀（普通杀、雷杀、火杀都可以）
      const isValidAttack = attackCard.name === BasicCardName.ATTACK ||
        attackCard.name === BasicCardName.THUNDER_ATTACK ||
        attackCard.name === BasicCardName.FIRE_ATTACK_CARD;

      if (!isValidAttack) {
        console.log(`respondToDuel 失败: 不是杀牌`);
        return false;
      }

      // 移除打出的杀
      const cardIndex = player.handCards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        const playedCard = player.handCards.splice(cardIndex, 1)[0];
        this.state.discardPile.push(playedCard);
        this.saveDiscardPileState(`${player.character.name}决斗出杀`, [playedCard]);
      }

      const otherPlayer = playerId === challenger.id ? target : challenger;
      const logMessage = `${player.character.name} 打出【${attackCard.name}】，${otherPlayer.character.name} 需要继续出杀`;
      console.log(logMessage);

      // 触发监听器通知 UI 更新
      this.actionListeners.forEach(listener => listener({
        action: GameAction.PLAY_CARD,
        playerId: player.id,
        cardId: cardId,
        cardName: attackCard.name,
        targetIds: [otherPlayer.id],
        isResponse: true,
        logMessage: logMessage,
      }));

      // 切换回合到另一方
      duelState.currentTurnId = otherPlayer.id;
      duelState.round++;
      pendingResponse.request.targetPlayerId = otherPlayer.id;

      // 如果另一方是AI，自动响应
      if (otherPlayer.isAI) {
        setTimeout(() => {
          this.processDuelResponse(otherPlayer);
        }, 800);
      }

      return true;
    } else {
      // 玩家选择不出杀，受到伤害
      const otherPlayer = playerId === challenger.id ? target : challenger;
      const logMessage = `${player.character.name} 没有打出【杀】，受到【决斗】的 1 点伤害`;
      console.log(logMessage);

      // 造成伤害（由对方造成）
      this.dealDamage(otherPlayer.id, playerId, 1);

      // 检查游戏是否已经结束
      if (this.state.phase === GamePhase.GAME_OVER) {
        console.log('游戏已结束，决斗终止');
        return true;
      }

      // 结束决斗
      pendingResponse.resolved = true;
      pendingResponse.result = false;
      this.state.pendingResponse = undefined;
      this.state.phase = GamePhase.PLAY;

      // 触发监听器通知 UI 更新
      this.actionListeners.forEach(listener => listener({
        action: GameAction.PLAY_CARD,
        playerId: player.id,
        cardName: '决斗',
        targetIds: [otherPlayer.id],
        isResponse: true,
        logMessage: logMessage,
      }));

      return true;
    }
  }

  // AI决斗响应处理
  private processDuelResponse(player: Player): void {
    const pendingResponse = this.state.pendingResponse;
    if (!pendingResponse || !pendingResponse.duelState) return;

    console.log(`AI ${player.character.name} 正在考虑是否出杀响应决斗...`);

    // 检查手牌中是否有杀
    const attackCard = player.handCards.find(c =>
      c.name === BasicCardName.ATTACK ||
      c.name === BasicCardName.THUNDER_ATTACK ||
      c.name === BasicCardName.FIRE_ATTACK_CARD
    );

    if (attackCard) {
      // AI有杀，90%概率打出（决斗中通常愿意出杀）
      if (Math.random() < 0.9) {
        setTimeout(() => {
          console.log(`AI ${player.character.name} 选择打出【${attackCard.name}】响应决斗`);
          this.respondToDuel(player.id, attackCard.id);
        }, 1000);
        return;
      } else {
        console.log(`AI ${player.character.name} 选择不出杀`);
      }
    } else {
      console.log(`AI ${player.character.name} 没有杀`);
    }

    // AI不出杀或没有杀
    setTimeout(() => {
      this.respondToDuel(player.id);
    }, 1000);
  }

  // 火攻响应处理（AI弃置同花色牌）
  private processFireAttackResponse(player: Player, requiredSuit: string): void {
    const pendingResponse = this.state.pendingResponse;
    if (!pendingResponse || !pendingResponse.fireAttackState) return;

    console.log(`AI ${player.character.name} 正在考虑是否弃置${requiredSuit}花色的手牌...`);

    // 查找同花色的手牌
    const sameSuitCards = player.handCards.filter(c => c.suit === requiredSuit);

    if (sameSuitCards.length > 0) {
      // AI有同花色牌，80%概率弃置造成伤害
      if (Math.random() < 0.8) {
        const cardToDiscard = sameSuitCards[0];
        setTimeout(() => {
          console.log(`AI ${player.character.name} 弃置了【${cardToDiscard.name}】造成火焰伤害`);
          this.respondToFireAttack(player.id, cardToDiscard.id);
        }, 1000);
        return;
      } else {
        console.log(`AI ${player.character.name} 选择不弃牌`);
      }
    } else {
      console.log(`AI ${player.character.name} 没有${requiredSuit}花色的手牌`);
    }

    // AI不弃牌
    setTimeout(() => {
      this.respondToFireAttack(player.id);
    }, 1000);
  }

  // 响应火攻（弃置同花色牌造成火焰伤害）
  public respondToFireAttack(playerId: string, cardId?: string): boolean {
    const pendingResponse = this.state.pendingResponse;
    if (!pendingResponse || !pendingResponse.fireAttackState) {
      console.log('没有待处理的火攻响应');
      return false;
    }

    const { sourceId, targetId, shownCard } = pendingResponse.fireAttackState;
    const player = this.state.players.find(p => p.id === playerId);

    if (!player || player.id !== sourceId) {
      console.log('不是火攻使用者，无法响应');
      return false;
    }

    if (cardId) {
      // 弃置指定牌造成火焰伤害
      const cardIndex = player.handCards.findIndex(c => c.id === cardId);
      if (cardIndex === -1) {
        console.log('找不到指定的手牌');
        return false;
      }

      const discardedCard = player.handCards[cardIndex];

      // 检查花色是否匹配
      if (discardedCard.suit !== shownCard.suit) {
        console.log(`弃置的牌花色不匹配，需要${shownCard.suit}，实际${discardedCard.suit}`);
        return false;
      }

      // 弃置牌
      player.handCards.splice(cardIndex, 1);
      this.state.discardPile.push(discardedCard);
      this.saveDiscardPileState(`${player.character.name} 弃置手牌`, [discardedCard]);

      console.log(`${player.character.name} 弃置了【${discardedCard.name}】对 ${this.state.players.find(p => p.id === targetId)?.character.name} 造成1点火焰伤害`);

      // 造成火焰伤害
      this.dealDamage(sourceId, targetId, 1, 'fire');

      // 通知前端
      this.actionListeners.forEach(listener => listener({
        action: GameAction.DISCARD_CARD,
        playerId: player.id,
        cardId: discardedCard.id,
        cardName: discardedCard.name,
        logMessage: `${player.character.name} 弃置了【${discardedCard.suit}${discardedCard.number} ${discardedCard.name}】，对 ${this.state.players.find(p => p.id === targetId)?.character.name} 造成1点火焰伤害`,
      }));
    } else {
      // 不弃牌，不造成伤害
      console.log(`${player.character.name} 选择不弃牌，火攻结束`);
    }

    // 清除火攻状态
    this.state.pendingResponse = undefined;
    this.state.phase = GamePhase.PLAY;

    return true;
  }

  // 火攻无伤害结束（没有同花色手牌时）
  private resolveFireAttackNoDamage(): void {
    const pendingResponse = this.state.pendingResponse;
    if (!pendingResponse || !pendingResponse.fireAttackState) {
      console.log('没有待处理的火攻响应');
      return;
    }

    const { sourceId, targetId, shownCard } = pendingResponse.fireAttackState;
    const player = this.state.players.find(p => p.id === sourceId);
    const target = this.state.players.find(p => p.id === targetId);

    if (player && target) {
      console.log(`${player.character.name} 没有 ${shownCard.suit} 花色的手牌，火攻结束，未造成伤害`);

      // 通知前端
      this.actionListeners.forEach(listener => listener({
        action: GameAction.PLAY_CARD,
        playerId: player.id,
        cardName: '火攻',
        logMessage: `${player.character.name} 没有 ${shownCard.suit} 花色的手牌，火攻结束`,
        isEffectResult: true,
      }));
    }

    // 清除火攻状态
    this.state.pendingResponse = undefined;
    this.state.phase = GamePhase.PLAY;
  }

  // AI无懈可击响应处理
  private processAINullificationResponse(sourcePlayer: Player, spellCard: Card): void {
    // 如果锦囊牌是人类玩家打出的，不提示人类玩家使用无懈可击（自己不能无懈自己的锦囊）
    // 直接让AI玩家决定是否使用无懈可击

    // 检查所有AI玩家是否有无懈可击（排除锦囊牌使用者自己）
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

    // 获取锦囊牌的目标玩家（用于判断是否应该保护）
    const pendingResponse = this.state.pendingResponse;
    const targetPlayerId = pendingResponse?.request.targetPlayerId;
    const targetPlayer = targetPlayerId ? this.state.players.find(p => p.id === targetPlayerId) : undefined;

    // 有AI玩家有无懈可击，延迟一下让他们有机会打出（缩短延迟时间）
    setTimeout(() => {
      const currentPending = this.state.pendingResponse;
      if (!currentPending || currentPending.resolved) return;

      // 检查是否是无懈可击响应类型
      if (currentPending.request.responseType !== ResponseType.NULLIFY) return;

      // 优先让血量低的AI玩家使用无懈可击保护自己
      // 按血量排序（血量低的优先）
      const sortedPlayers = [...playersWithNullification].sort((a, b) => a.character.hp - b.character.hp);

      for (const player of sortedPlayers) {
        const nullificationCard = player.handCards.find(
          c => c.name === SpellCardName.NULLIFICATION
        );
        if (!nullificationCard) continue;

        // 判断是否应该使用无懈可击（传入目标玩家信息）
        const shouldUseNullification = this.shouldUseNullification(player, sourcePlayer, spellCard, targetPlayer);

        if (shouldUseNullification) {
          console.log(`AI ${player.character.name} 打出【无懈可击】抵消【${spellCard.name}】`);
          this.respondToNullification(player.id, nullificationCard.id);
          return;
        }
      }

      // 没有AI打出无懈可击，执行锦囊牌效果
      console.log(`没有AI使用无懈可击，【${spellCard.name}】生效`);
      this.resolveSpellCardEffect();
    }, 800); // 缩短延迟时间从1500ms到800ms
  }

  // 判断是否应使用无懈可击
  private shouldUseNullification(player: Player, sourcePlayer: Player, spellCard: Card, targetPlayer?: Player): boolean {
    // 判断是否为盟友（主公和忠臣是盟友，反贼是盟友，内奸独立）
    const isAlly = (identity1: Identity, identity2: Identity): boolean => {
      // 主公和忠臣是盟友
      if ((identity1 === Identity.LORD || identity1 === Identity.LOYALIST) &&
        (identity2 === Identity.LORD || identity2 === Identity.LOYALIST)) {
        return true;
      }
      // 反贼之间是盟友
      if (identity1 === Identity.REBEL && identity2 === Identity.REBEL) {
        return true;
      }
      return false;
    };

    const sourceIsAlly = isAlly(player.identity, sourcePlayer.identity);

    // 根据锦囊牌类型和盟友关系决定是否使用无懈可击
    switch (spellCard.name) {
      case SpellCardName.DUEL:
        // 决斗：如果是盟友被决斗，使用无懈可击保护
        const duelTarget = targetPlayer || this.state.players.find(p => p.id === this.state.pendingResponse?.request.targetPlayerId);
        if (duelTarget) {
          const targetIsAlly = isAlly(player.identity, duelTarget.identity);
          // 保护盟友，阻止对盟友的决斗
          if (targetIsAlly && !sourceIsAlly) {
            console.log(`  ${player.character.name} 考虑保护盟友 ${duelTarget.character.name} 免受决斗`);
            return Math.random() < 0.8; // 80%概率保护盟友
          }
          // 如果是敌人之间的决斗，不干预
          if (!targetIsAlly && !sourceIsAlly) {
            console.log(`  ${player.character.name} 看到敌人内斗，不干预`);
            return false;
          }
        }
        return false;

      case SpellCardName.STEAL:
      case SpellCardName.DISMANTLE:
        // 顺手牵羊、过河拆桥：如果是盟友被针对，使用无懈可击保护
        const stealTarget = targetPlayer || this.state.players.find(p => p.id === this.state.pendingResponse?.request.targetPlayerId);
        if (stealTarget) {
          const targetIsAlly = isAlly(player.identity, stealTarget.identity);
          // 保护盟友
          if (targetIsAlly && !sourceIsAlly) {
            console.log(`  ${player.character.name} 考虑保护盟友 ${stealTarget.character.name} 免受${spellCard.name}`);
            return Math.random() < 0.7; // 70%概率保护盟友
          }
          // 如果是敌人被针对，不干预（甚至乐见其成）
          if (!targetIsAlly && !sourceIsAlly) {
            console.log(`  ${player.character.name} 看到敌人互斗，不干预`);
            return false;
          }
        }
        return false;

      case SpellCardName.SAVAGE:
      case SpellCardName.ARCHERY:
        // 南蛮入侵、万箭齐发：AOE伤害
        // 计算会对多少盟友造成伤害
        let allyCount = 0;
        let enemyCount = 0;
        for (const p of this.state.players) {
          if (p.isDead || p.id === sourcePlayer.id) continue;
          if (isAlly(player.identity, p.identity)) {
            allyCount++;
          } else {
            enemyCount++;
          }
        }
        console.log(`  ${player.character.name} 分析AOE：盟友${allyCount}人，敌人${enemyCount}人会受伤`);
        // 如果对盟友伤害大于对敌人伤害，使用无懈可击
        if (allyCount > enemyCount) {
          return Math.random() < 0.6;
        }
        // 如果对自己也有伤害，考虑使用
        if (allyCount > 0 && player.character.hp <= 2) {
          return Math.random() < 0.4; // 体力低时更可能使用
        }
        return false;

      case SpellCardName.DRAW_TWO:
        // 无中生有：敌人获得牌，对自己不利
        if (!sourceIsAlly) {
          console.log(`  ${player.character.name} 考虑阻止敌人使用无中生有`);
          return Math.random() < 0.5; // 50%概率阻止敌人
        }
        return false;

      case SpellCardName.PEACH_GARDEN:
        // 桃园结义：回复体力
        // 计算会对多少敌人回复体力
        let enemyBenefit = 0;
        let allyBenefit = 0;
        for (const p of this.state.players) {
          if (p.isDead) continue;
          if (p.character.hp < p.character.maxHp) {
            if (isAlly(player.identity, p.identity)) {
              allyBenefit++;
            } else {
              enemyBenefit++;
            }
          }
        }
        console.log(`  ${player.character.name} 分析桃园结义：盟友回复${allyBenefit}人，敌人回复${enemyBenefit}人`);
        // 如果敌人受益明显多于盟友，使用无懈可击
        if (enemyBenefit > allyBenefit) {
          return Math.random() < 0.6;
        }
        return false;

      default:
        // 其他锦囊牌，根据盟友关系简单判断
        if (!sourceIsAlly) {
          console.log(`  ${player.character.name} 考虑阻止敌人的${spellCard.name}`);
          return Math.random() < 0.3; // 30%概率阻止敌人
        }
        return false;
    }
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

      // 检查是否是延时锦囊牌（兵粮寸断、乐不思蜀、闪电）
      const isDelayedSpell = pendingResponse.request.cardName === '兵粮寸断' ||
        pendingResponse.request.cardName === '乐不思蜀' ||
        pendingResponse.request.cardName === '闪电';

      if (isDelayedSpell) {
        // 延时锦囊牌被无懈可击抵消后，将牌放入弃牌堆并继续处理下一个延时锦囊牌
        const targetPlayer = this.state.players.find(p => p.id === pendingResponse.request.targetPlayerId);
        if (targetPlayer) {
          // 移除延时锦囊牌
          if (pendingResponse.request.cardName === '兵粮寸断' && targetPlayer.delayedSpells.supplyShortage) {
            const card = targetPlayer.delayedSpells.supplyShortage;
            delete targetPlayer.delayedSpells.supplyShortage;
            this.state.discardPile.push(card);
            this.saveDiscardPileState(`${targetPlayer.character.name}的兵粮寸断被无懈可击`, [card]);
          } else if (pendingResponse.request.cardName === '乐不思蜀' && targetPlayer.delayedSpells.indulgence) {
            const card = targetPlayer.delayedSpells.indulgence;
            delete targetPlayer.delayedSpells.indulgence;
            this.state.discardPile.push(card);
            this.saveDiscardPileState(`${targetPlayer.character.name}的乐不思蜀被无懈可击`, [card]);
          } else if (pendingResponse.request.cardName === '闪电' && targetPlayer.delayedSpells.lightning) {
            const card = targetPlayer.delayedSpells.lightning;
            delete targetPlayer.delayedSpells.lightning;
            this.state.discardPile.push(card);
            this.saveDiscardPileState(`${targetPlayer.character.name}的闪电被无懈可击`, [card]);
          }
        }

        // 清除响应状态
        this.state.pendingResponse = undefined;

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

        // 继续处理下一个延时锦囊牌
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer.isAI) {
          this.processDelayedSpells(currentPlayer);
        }
      } else {
        // 普通锦囊牌，清除响应状态，返回出牌阶段
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
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer.isAI) {
          this.processTurn();
        }
      }

      return true;
    } else {
      // 玩家选择不响应，检查是否还有其他AI玩家可以打出无懈可击
      const pendingResponse = this.state.pendingResponse;
      if (!pendingResponse) return false;

      const sourcePlayerId = pendingResponse.request.sourcePlayerId;
      const sourcePlayer = this.state.players.find(p => p.id === sourcePlayerId);
      const spellCardName = pendingResponse.request.cardName;

      // 查找锦囊牌对象
      const spellCard = this.state.discardPile.find(c => c.name === spellCardName) ||
        sourcePlayer?.handCards.find(c => c.name === spellCardName);

      if (!sourcePlayer) {
        console.log(`无法找到锦囊牌使用者，直接执行效果`);
        return this.resolveSpellCardEffect();
      }

      // 检查是否还有其他AI玩家有无懈可击
      const otherPlayers = this.state.players.filter(p =>
        p.id !== sourcePlayer.id && !p.isDead && p.isAI && p.id !== playerId
      );
      const playersWithNullification = otherPlayers.filter(player =>
        player.handCards.some(c => c.name === SpellCardName.NULLIFICATION)
      );

      if (playersWithNullification.length > 0) {
        console.log(`人类玩家选择不响应，等待AI玩家决定是否使用无懈可击...`);
        // 延迟后让AI决定是否使用无懈可击
        setTimeout(() => {
          const currentPending = this.state.pendingResponse;
          if (!currentPending || currentPending.resolved) return;
          if (currentPending.request.responseType !== ResponseType.NULLIFY) return;

          for (const aiPlayer of playersWithNullification) {
            const nullificationCard = aiPlayer.handCards.find(
              c => c.name === SpellCardName.NULLIFICATION
            );
            if (!nullificationCard) continue;

            const shouldUse = this.shouldUseNullification(aiPlayer, sourcePlayer,
              spellCard || { name: spellCardName, type: CardType.SPELL, suit: '' as CardSuit, number: 0, id: '', description: '', color: CardColor.BLACK } as Card);

            if (shouldUse) {
              console.log(`AI ${aiPlayer.character.name} 打出【无懈可击】抵消【${spellCardName}】`);
              this.respondToNullification(aiPlayer.id, nullificationCard.id);
              return;
            }
          }

          // 没有AI打出无懈可击，执行锦囊牌效果
          console.log(`没有AI使用无懈可击，【${spellCardName}】生效`);

          // 检查是否是延时锦囊牌
          const isDelayedSpell = spellCardName === '兵粮寸断' ||
            spellCardName === '乐不思蜀' ||
            spellCardName === '闪电';

          if (isDelayedSpell) {
            // 延时锦囊牌，执行判定效果
            const spellEffect = currentPending.request.spellCardEffect;
            if (spellEffect) {
              spellEffect();
            }
            return;
          }

          this.resolveSpellCardEffect();
        }, 1000);
        return true;
      }

      // 没有其他AI玩家有无懈可击，直接执行锦囊牌效果
      console.log(`没有其他玩家有无懈可击，【${spellCardName}】生效`);

      // 检查是否是延时锦囊牌
      const isDelayedSpell = spellCardName === '兵粮寸断' ||
        spellCardName === '乐不思蜀' ||
        spellCardName === '闪电';

      if (isDelayedSpell) {
        // 延时锦囊牌，执行判定效果
        const spellEffect = pendingResponse.request.spellCardEffect;
        if (spellEffect) {
          spellEffect();
        }
        return true;
      }

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

    // 检查是否创建了新的pendingResponse（多目标锦囊牌、决斗或火攻的情况）
    // 如果是多目标锦囊牌，startMultiTargetResponse会创建新的pendingResponse
    // 如果是决斗，startDuel会创建新的pendingResponse（包含duelState）
    // 如果是火攻，executeSpellEffect会创建新的pendingResponse（包含fireAttackState）
    if (this.state.pendingResponse && (this.state.pendingResponse.multiTargetQueue || this.state.pendingResponse.duelState || this.state.pendingResponse.fireAttackState)) {
      console.log(`【${cardName}】需要继续响应流程`);
      // 不清除pendingResponse，不设置phase为PLAY，不触发监听器
      // 响应流程会自行处理
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
