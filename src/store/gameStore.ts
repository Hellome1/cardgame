import { create } from 'zustand';
import { GameState, GameAction, GamePhase, ResponseType, SpellCardName, CardType, BasicCardName } from '../types/game';
import { GameEngine } from '../game/GameEngine';

// 模块级别的标志，确保 initGame 只执行一次
let hasInitialized = false;

// 重置初始化标志的函数（用于重新开始游戏）
export function resetGameInitialization() {
  hasInitialized = false;
}

interface GameStore {
  // 游戏引擎
  engine: GameEngine | null;

  // 游戏状态
  gameState: GameState | null;

  // 选中的卡牌
  selectedCardId: string | null;

  // 选中的目标
  selectedTargetIds: string[];

  // 游戏是否开始
  isGameStarted: boolean;

  // 游戏日志
  logs: string[];

  // 本回合已使用的杀数量
  attackCountThisTurn: number;

  // 计时器状态
  timeLeft: number; // 剩余时间（秒）
  maxTime: number;  // 最大时间（秒）
  isTimerRunning: boolean;

  // 暂停状态
  isPaused: boolean;  // 游戏是否暂停

  // 动作
  initGame: (playerCount?: number, force?: boolean) => void;
  resetGame: (playerCount?: number) => void;
  startGame: (playerCount?: number) => void;
  selectCard: (cardId: string | null) => void;
  selectTarget: (playerId: string) => void;
  clearTarget: () => void;
  playCard: (cardId?: string, targetIds?: string[]) => void;
  endTurn: () => void;
  refreshTimer: () => void;  // 刷新计时器
  discardCard: (cardId: string) => void;
  updateGameState: () => void;
  addLog: (message: string) => void;
  respondToAttack: (cardId?: string) => void;  // 响应攻击（打出闪）
  startTimer: (seconds: number) => void;  // 开始计时
  stopTimer: () => void;  // 停止计时
  handleTimeout: () => void;  // 处理超时
  pauseGame: () => void;  // 暂停游戏
  resumeGame: () => void;  // 恢复游戏
  handleDyingResponse: (cardType: 'peach' | 'wine') => boolean;  // 处理濒死阶段响应
  giveUpDying: () => boolean;  // 玩家放弃自救（死亡）
  endGame: (showDebug?: boolean) => void;  // 结束游戏，返回主菜单，可选是否直接显示调试界面
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  gameState: null,
  selectedCardId: null,
  selectedTargetIds: [],
  isGameStarted: false,
  logs: [],
  attackCountThisTurn: 0,
  timeLeft: 0,
  maxTime: 0,
  isTimerRunning: false,
  isPaused: false,

  initGame: (playerCount = 4, force = false) => {
    // 防止重复初始化（除非强制重新初始化）
    if (hasInitialized && !force) {
      console.log('游戏已经初始化，跳过重复初始化');
      return;
    }
    hasInitialized = true;

    const engine = new GameEngine(playerCount);

    // 监听游戏状态变化
    engine.onAction((action) => {
      const state = get();
      const gameState = engine.getState();

      // 添加动作日志
      let logMessage = '';

      // 根据 action.playerId 获取执行动作的玩家
      const actingPlayer = gameState.players.find(p => p.id === action.playerId);

      if (!actingPlayer) {
        set({ gameState });
        return;
      }

      switch (action.action) {
        case GameAction.PLAY_CARD: {
          // 如果是锦囊牌效果执行后的结果通知，跳过默认日志生成
          // 因为详细日志已经在效果执行时发送了
          if (action.isEffectResult) {
            // 使用提供的日志消息，但不生成额外的默认日志
            if (action.logMessage) {
              logMessage = action.logMessage;
            }
          } else if (action.logMessage) {
            // 如果有预定义的日志消息（如响应结果），直接使用
            logMessage = action.logMessage;
          } else {
            // 使用action中传递的cardName
            const usedCardName = action.cardName;

            // 响应动作（如打出闪）不记录为"使用"
            if (usedCardName && !action.isResponse) {
              const targetNames = action.targetIds?.map(id => {
                const target = gameState.players.find(p => p.id === id);
                return target?.character.name;
              }).filter(Boolean).join('、') || '';

              if (targetNames) {
                logMessage = `${actingPlayer.character.name} 对 ${targetNames} 使用了【${usedCardName}】`;
              } else {
                logMessage = `${actingPlayer.character.name} 使用了【${usedCardName}】`;
              }
            }
          }
          break;
        }
        case GameAction.END_TURN:
          logMessage = `${actingPlayer.character.name} 结束回合`;
          break;
        case GameAction.DISCARD_CARD: {
          // 如果有传递cardName（AI弃牌），使用传递的cardName
          if (action.cardName) {
            logMessage = `${actingPlayer.character.name} 弃置了【${action.cardName}】`;
          } else {
            // 从弃牌堆找到刚弃置的牌（人类玩家弃牌）
            const discardedCard = gameState.discardPile[gameState.discardPile.length - 1];
            if (discardedCard) {
              logMessage = `${actingPlayer.character.name} 弃置了【${discardedCard.name}】`;
            } else {
              logMessage = `${actingPlayer.character.name} 弃置了卡牌`;
            }
          }
          break;
        }
      }

      if (logMessage) {
        const newLogs = [logMessage, ...state.logs].slice(0, 50);
        set({
          gameState,
          logs: newLogs
        });
        // 触发文件日志保存事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('game-log', { detail: logMessage }));
        }
      } else {
        set({ gameState });
      }

      // 每次动作后都检查游戏是否结束，确保状态同步
      const latestState = engine.getState();
      if (latestState.phase === 'game_over') {
        console.log('游戏已结束，更新store状态');
        set({ gameState: latestState });
      }
    });

    set({
      engine,
      gameState: engine.getState(),
      isGameStarted: false,
      selectedCardId: null,
      selectedTargetIds: [],
      logs: [],
      attackCountThisTurn: 0,
    });
  },

  resetGame: (playerCount = 4) => {
    // 重置初始化标志
    resetGameInitialization();
    // 停止计时器
    get().stopTimer();
    // 重新初始化游戏
    get().initGame(playerCount, true);
  },

  startGame: (playerCount = 4) => {
    console.log(`store.startGame 被调用，playerCount: ${playerCount}`);
    const { engine, logs } = get();
    if (engine) {
      console.log(`调用 engine.startGame(${playerCount})`);
      engine.startGame(playerCount);
      const gameState = engine.getState();
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];

      set({
        isGameStarted: true,
        gameState,
        logs: [`游戏开始！${currentPlayer.character.name} 的回合`, ...logs].slice(0, 50),
        attackCountThisTurn: 0,
      });
    }
  },

  addLog: (message: string) => {
    const { logs } = get();
    set({ logs: [message, ...logs].slice(0, 50) });
    // 触发文件日志保存事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game-log', { detail: message }));
    }
  },

  selectCard: (cardId: string | null) => {
    const { gameState, selectedCardId, selectedTargetIds } = get();
    if (gameState) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (cardId) {
        const selectedCard = currentPlayer.handCards.find(c => c.id === cardId);
        if (selectedCard) {
          console.log(`玩家 ${currentPlayer.character.name} 选择了手牌: 【${selectedCard.name}】[${selectedCard.suit}${selectedCard.number}]`);
        }
        // 如果切换了手牌（选择了不同的牌），清空之前选择的目标
        if (selectedCardId && selectedCardId !== cardId && selectedTargetIds.length > 0) {
          console.log('切换手牌，清空之前选择的目标');
          set({ selectedTargetIds: [] });
        }
      } else if (selectedCardId) {
        // 取消选择时记录
        const prevCard = currentPlayer.handCards.find(c => c.id === selectedCardId);
        if (prevCard) {
          console.log(`玩家 ${currentPlayer.character.name} 取消选择了手牌: 【${prevCard.name}】`);
        }
      }
    }
    set({ selectedCardId: cardId });
  },

  selectTarget: (playerId: string) => {
    const { selectedTargetIds, gameState } = get();
    if (gameState) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const targetPlayer = gameState.players.find(p => p.id === playerId);
      if (targetPlayer) {
        if (selectedTargetIds.includes(playerId)) {
          console.log(`玩家 ${currentPlayer.character.name} 取消选择了目标武将: ${targetPlayer.character.name}`);
          set({
            selectedTargetIds: selectedTargetIds.filter(id => id !== playerId)
          });
        } else {
          console.log(`玩家 ${currentPlayer.character.name} 选择了目标武将: ${targetPlayer.character.name}`);
          set({
            selectedTargetIds: [...selectedTargetIds, playerId]
          });
        }
      }
    }
  },

  clearTarget: () => {
    set({ selectedTargetIds: [] });
  },

  playCard: (cardId?: string, targetIds?: string[]) => {
    const { engine, selectedCardId: storeCardId, selectedTargetIds: storeTargetIds, gameState, attackCountThisTurn } = get();
    if (!engine || !gameState) return;

    const finalCardId = cardId || storeCardId;
    let finalTargetIds = targetIds || storeTargetIds;

    if (!finalCardId) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // 检查是否是杀，且是否超过使用限制
    const card = currentPlayer.handCards.find(c => c.id === finalCardId);
    if (card?.name === '杀') {
      // 检查是否有诸葛连弩
      const equippedWeapon = currentPlayer.equipment.weapon;
      const hasCrossbow = equippedWeapon?.name === '诸葛连弩';
      console.log(`检查杀的使用: 已装备武器=${equippedWeapon?.name || '无'}, 有连弩=${hasCrossbow}, 已使用杀=${attackCountThisTurn}`);
      if (!hasCrossbow && attackCountThisTurn >= 1) {
        console.log('本回合已经使用过杀，无法再使用');
        return;
      }

      // 杀只能指定一个目标，如果选了多个，只使用最后一个
      if (finalTargetIds && finalTargetIds.length > 1) {
        finalTargetIds = [finalTargetIds[finalTargetIds.length - 1]];
      }
    }

    // 注意：日志由 engine.onAction 统一处理，避免重复记录
    const success = engine.executeAction({
      action: GameAction.PLAY_CARD,
      playerId: currentPlayer.id,
      cardId: finalCardId,
      targetIds: finalTargetIds && finalTargetIds.length > 0 ? finalTargetIds : undefined,
    });

    if (success) {
      // 如果使用成功且是杀（包括普通杀、雷杀、火杀），增加计数
      const isAttack = card && card.type === CardType.BASIC &&
        (card.name === BasicCardName.ATTACK || card.name === BasicCardName.THUNDER_ATTACK || card.name === BasicCardName.FIRE_ATTACK_CARD);
      const newAttackCount = isAttack ? attackCountThisTurn + 1 : attackCountThisTurn;

      // 检查是否是锦囊牌（需要等待无懈可击响应）
      if (card && card.type === CardType.SPELL && card.name !== SpellCardName.NULLIFICATION) {
        // 锦囊牌需要等待无懈可击响应，启动8秒计时器
        get().stopTimer();
        get().startTimer(8);
      } else {
        // 其他牌刷新计时器
        get().refreshTimer();
      }

      set({
        selectedCardId: null,
        selectedTargetIds: [],
        // 注意：gameState 由 engine.onAction 回调更新，避免重复更新
        attackCountThisTurn: newAttackCount,
      });
    }
  },

  endTurn: () => {
    const { engine, gameState } = get();
    if (!engine || !gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    const success = engine.executeAction({
      action: GameAction.END_TURN,
      playerId: currentPlayer.id,
    });

    if (success) {
      set({
        selectedCardId: null,
        selectedTargetIds: [],
        gameState: engine.getState(),
        attackCountThisTurn: 0, // 结束回合时重置杀计数
      });
    }
  },

  discardCard: (cardId: string) => {
    const { engine, gameState } = get();
    if (!engine || !gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // 注意：日志由 engine.onAction 统一处理，避免重复记录
    engine.executeAction({
      action: GameAction.DISCARD_CARD,
      playerId: currentPlayer.id,
      cardId,
    });
    // 注意：gameState 由 engine.onAction 回调更新，避免重复更新
  },

  updateGameState: () => {
    const { engine } = get();
    if (engine) {
      set({ gameState: engine.getState() });
    }
  },

  respondToAttack: (cardId?: string) => {
    const { engine, gameState, logs } = get();
    if (!engine || !gameState) return;

    const pendingResponse = engine.getPendingResponse();
    if (!pendingResponse) return;

    // 获取当前需要响应的玩家
    let targetPlayerId = pendingResponse.request.targetPlayerId;

    // 对于决斗，使用 duelState.currentTurnId 确定当前该出牌的玩家
    if (pendingResponse.request.responseType === ResponseType.DUEL && pendingResponse.duelState) {
      targetPlayerId = pendingResponse.duelState.currentTurnId;
    }

    // 对于火攻，使用 fireAttackState.sourceId 确定火攻使用者
    if (pendingResponse.request.responseType === ResponseType.FIRE_ATTACK && pendingResponse.fireAttackState) {
      targetPlayerId = pendingResponse.fireAttackState.sourceId;
    }

    const targetPlayer = gameState.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer) return;

    // 对于无懈可击响应，任何玩家都可以响应，获取当前人类玩家
    let respondingPlayer = targetPlayer;
    if (pendingResponse.request.responseType === ResponseType.NULLIFY) {
      // 找到人类玩家（假设第一个玩家是人类）
      const humanPlayer = gameState.players.find(p => !p.isAI);
      if (humanPlayer) {
        respondingPlayer = humanPlayer;
      }
    }

    let success = false;
    let logMessage = '';

    // 根据响应类型处理不同的响应逻辑
    if (pendingResponse.request.responseType === ResponseType.NULLIFY) {
      // 无懈可击响应 - 任何玩家都可以打出无懈可击
      success = engine.respondToNullification(respondingPlayer.id, cardId);
      if (success) {
        if (cardId) {
          logMessage = `${respondingPlayer.character.name} 打出【无懈可击】，抵消了【${pendingResponse.request.cardName}】`;
        } else {
          logMessage = `【${pendingResponse.request.cardName}】生效`;
        }
      }
    } else if (pendingResponse.request.responseType === ResponseType.DUEL) {
      // 决斗响应 - 双方轮流出杀
      success = engine.respondToDuel(targetPlayer.id, cardId);
      if (success) {
        if (cardId) {
          // 打出了杀，继续决斗，不添加结束日志
          const playedCard = targetPlayer.handCards.find(c => c.id === cardId);
          logMessage = `${targetPlayer.character.name} 打出【${playedCard?.name || '杀'}】响应决斗`;
        } else {
          // 没出杀，受到伤害
          logMessage = `${targetPlayer.character.name} 没有打出【杀】，受到【决斗】的1点伤害`;
        }
      }
    } else if (pendingResponse.request.responseType === ResponseType.ATTACK) {
      // 南蛮入侵响应（需要打出杀）
      success = engine.respondToAttack(targetPlayer.id, cardId);
      if (success) {
        if (cardId) {
          logMessage = `${targetPlayer.character.name} 打出了【杀】，抵消了【南蛮入侵】`;
        } else {
          logMessage = `${targetPlayer.character.name} 没有打出【杀】，受到【南蛮入侵】的1点伤害`;
        }
      }
    } else if (pendingResponse.request.responseType === ResponseType.DODGE) {
      // 检查是否是万箭齐发或多目标响应
      const isArchery = pendingResponse.request.cardName === '万箭齐发' || pendingResponse.multiTargetQueue;
      success = engine.respondToAttack(targetPlayer.id, cardId);
      if (success) {
        if (cardId) {
          logMessage = `${targetPlayer.character.name} 打出了【闪】，抵消了【${isArchery ? '万箭齐发' : pendingResponse.request.cardName}】`;
        } else {
          logMessage = `${targetPlayer.character.name} 没有打出【闪】，受到【${isArchery ? '万箭齐发' : pendingResponse.request.cardName}】的${pendingResponse.request.damage}点伤害`;
        }
      }
    } else if (pendingResponse.request.responseType === ResponseType.FIRE_ATTACK) {
      // 火攻响应 - 弃置同花色牌造成火焰伤害
      success = engine.respondToFireAttack(targetPlayer.id, cardId);
      if (success) {
        if (cardId) {
          const playedCard = targetPlayer.handCards.find(c => c.id === cardId);
          logMessage = `${targetPlayer.character.name} 弃置了【${playedCard?.name || '牌'}】，对 ${gameState.players.find(p => p.id === pendingResponse.fireAttackState?.targetId)?.character.name} 造成1点火焰伤害`;
        } else {
          logMessage = `${targetPlayer.character.name} 选择不弃牌，火攻结束`;
        }
      }
    } else {
      // 普通响应（闪）
      success = engine.respondToAttack(targetPlayer.id, cardId);
      if (success) {
        if (cardId) {
          logMessage = `${targetPlayer.character.name} 打出了【闪】，抵消了【${pendingResponse.request.cardName}】`;
        } else {
          logMessage = `${targetPlayer.character.name} 受到【${pendingResponse.request.cardName}】的${pendingResponse.request.damage}点伤害`;
        }
      }
    }

    if (success) {
      set({
        gameState: engine.getState(),
        logs: [logMessage, ...logs].slice(0, 50),
        selectedCardId: null,
        selectedTargetIds: [],
        isTimerRunning: false,
      });
    }
  },

  startTimer: (seconds: number) => {
    // 先停止之前的计时器
    get().stopTimer();

    set({
      timeLeft: seconds,
      maxTime: seconds,
      isTimerRunning: true,
    });

    // 每秒减少时间
    const timer = setInterval(() => {
      const { timeLeft, isTimerRunning } = get();
      if (!isTimerRunning || timeLeft <= 0) {
        clearInterval(timer);
        return;
      }
      set({ timeLeft: timeLeft - 1 });
    }, 1000);

    // 设置超时处理
    const timeoutId = setTimeout(() => {
      const { isTimerRunning } = get();
      if (isTimerRunning) {
        get().handleTimeout();
      }
    }, seconds * 1000);

    // 存储 timer 和 timeoutId 以便清除
    (get() as any).timerId = timer;
    (get() as any).timeoutId = timeoutId;
  },

  stopTimer: () => {
    const { timerId, timeoutId } = get() as any;
    if (timerId) {
      clearInterval(timerId);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    set({ isTimerRunning: false });
  },

  handleTimeout: () => {
    const { gameState, engine } = get();
    if (!gameState || !engine) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // 根据当前阶段处理超时
    switch (gameState.phase) {
      case 'play':
        // 出牌阶段超时，自动结束回合
        console.log('出牌阶段超时，自动结束回合');
        get().endTurn();
        break;
      case 'discard':
        // 弃牌阶段超时，自动随机弃牌
        console.log('弃牌阶段超时，自动随机弃牌');
        const maxCards = currentPlayer.character.hp;
        const cardsToDiscard = currentPlayer.handCards.length - maxCards;
        if (cardsToDiscard > 0) {
          // 随机选择要弃置的牌
          const handCards = [...currentPlayer.handCards];
          const cardsToRemove: string[] = [];
          for (let i = 0; i < cardsToDiscard; i++) {
            if (handCards.length > 0) {
              const randomIndex = Math.floor(Math.random() * handCards.length);
              const card = handCards.splice(randomIndex, 1)[0];
              if (card) {
                cardsToRemove.push(card.id);
              }
            }
          }
          // 执行弃牌
          cardsToRemove.forEach(cardId => {
            get().discardCard(cardId);
          });
        }
        break;
      case 'response':
        // 响应阶段超时，视为放弃操作（不响应）
        // 检查是否还在响应阶段（可能已经被处理了）
        const currentState = get().gameState;
        if (currentState?.phase === 'response' && currentState?.pendingResponse) {
          console.log('响应阶段超时，视为放弃操作');
          get().respondToAttack();
        } else {
          console.log('响应阶段已结束，无需处理超时');
        }
        break;
    }

    set({ isTimerRunning: false });
  },

  // 刷新计时器（出牌后重置时间）
  refreshTimer: () => {
    const { isTimerRunning, maxTime, isPaused } = get();
    // 只有在计时器运行且游戏未暂停时才刷新
    if (isTimerRunning && !isPaused) {
      // 停止当前计时器
      get().stopTimer();
      // 重新启动计时器（重置为最大时间）
      get().startTimer(maxTime);
      console.log('计时器已刷新，重置为', maxTime, '秒');
    }
  },

  // 暂停游戏
  pauseGame: () => {
    const { isPaused, engine } = get();
    if (!isPaused) {
      console.log('游戏已暂停');
      set({ isPaused: true });
      // 暂停时停止计时器
      get().stopTimer();
      // 通知游戏引擎暂停
      if (engine) {
        engine.setPaused(true);
      }
    }
  },

  // 恢复游戏
  resumeGame: () => {
    const { isPaused, gameState, engine } = get();
    if (isPaused) {
      console.log('游戏已恢复');
      set({ isPaused: false });
      // 通知游戏引擎恢复
      if (engine) {
        engine.setPaused(false);
      }
      // 恢复时如果是玩家回合，重新启动计时器
      if (gameState) {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const isHumanTurn = !currentPlayer.isAI;
        const isResponsePhase = gameState.phase === GamePhase.RESPONSE;
        const isHumanResponse = isResponsePhase && gameState.pendingResponse?.request.targetPlayerId === gameState.players[0].id;

        if ((isHumanTurn && (gameState.phase === 'play' || gameState.phase === 'discard')) || isHumanResponse) {
          let timeLimit = 15;
          if (gameState.phase === 'discard') {
            timeLimit = 15;
          } else if (isResponsePhase) {
            timeLimit = 10;
          }
          get().startTimer(timeLimit);
        }
      }
    }
  },

  // 处理濒死阶段响应（使用桃或酒）
  handleDyingResponse: (cardType: 'peach' | 'wine') => {
    const { engine, gameState, logs } = get();
    if (!engine || !gameState || !gameState.dyingState) return false;

    const dyingPlayerId = gameState.dyingState.playerId;
    const result = engine.handleDyingResponse(dyingPlayerId, cardType);

    if (result) {
      // 更新游戏状态
      const newGameState = engine.getState();
      const clonedState = JSON.parse(JSON.stringify(newGameState));

      const dyingPlayer = clonedState.players.find((p: { id: string }) => p.id === dyingPlayerId);
      const cardName = cardType === 'peach' ? '桃' : '酒';

      set({
        gameState: clonedState,
        logs: [`${dyingPlayer.character.name} 使用【${cardName}】自救，回复1点体力`, ...logs].slice(0, 50),
      });

      return true;
    }

    return false;
  },

  // 玩家放弃自救（死亡）
  giveUpDying: () => {
    const { engine, gameState, logs } = get();
    if (!engine || !gameState || !gameState.dyingState) return false;

    const dyingPlayerId = gameState.dyingState.playerId;
    const result = engine.giveUpDying(dyingPlayerId);

    if (result) {
      // 更新游戏状态
      const newGameState = engine.getState();
      const clonedState = JSON.parse(JSON.stringify(newGameState));

      const dyingPlayer = clonedState.players.find((p: { id: string }) => p.id === dyingPlayerId);

      set({
        gameState: clonedState,
        logs: [`${dyingPlayer.character.name} 放弃自救，角色死亡`, ...logs].slice(0, 50),
      });

      return true;
    }

    return false;
  },

  // 结束游戏，返回主菜单
  endGame: (showDebug = false) => {
    const { stopTimer } = get();
    // 停止计时器
    stopTimer();
    // 重置游戏状态
    set({
      isGameStarted: false,
      gameState: null,
      engine: null,
      selectedCardId: null,
      selectedTargetIds: [],
      logs: [],
      attackCountThisTurn: 0,
    });
    // 重置初始化标志
    resetGameInitialization();
  },
}));
