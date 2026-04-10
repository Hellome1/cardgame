import { create } from 'zustand';
import { GameState, GameAction } from '../types/game';
import { GameEngine } from '../game/GameEngine';

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
  
  // 动作
  initGame: (playerCount?: number) => void;
  startGame: () => void;
  selectCard: (cardId: string | null) => void;
  selectTarget: (playerId: string) => void;
  clearTarget: () => void;
  playCard: (cardId?: string, targetIds?: string[]) => void;
  endTurn: () => void;
  discardCard: (cardId: string) => void;
  updateGameState: () => void;
  addLog: (message: string) => void;
  respondToAttack: (cardId?: string) => void;  // 响应攻击（打出闪）
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  gameState: null,
  selectedCardId: null,
  selectedTargetIds: [],
  isGameStarted: false,
  logs: [],
  attackCountThisTurn: 0,

  initGame: (playerCount = 4) => {
    const engine = new GameEngine(playerCount);
    
    // 监听游戏状态变化
    engine.onAction((action) => {
      const state = get();
      const gameState = engine.getState();
      
      // 添加动作日志
      let logMessage = '';
      
      // 根据 action.playerId 获取执行动作的玩家
      const actingPlayer = gameState.players.find(p => p.id === action.playerId);
      
      if (!actingPlayer) return;
      
      switch (action.action) {
        case GameAction.PLAY_CARD: {
          // 使用action中传递的cardName（GameEngine.playCard已经传递过来了）
          const usedCardName = action.cardName || gameState.discardPile[gameState.discardPile.length - 1]?.name;
          
          // 检查是否是响应阶段完成的通知（没有usedCardName）
          if (!usedCardName && gameState.pendingResponse === undefined) {
            // 响应阶段已结束但没有卡牌，说明是不响应的情况
            const targetPlayer = gameState.players.find(p => p.id === action.playerId);
            const sourcePlayer = gameState.players.find(p => p.id === gameState.players[gameState.currentPlayerIndex]?.id);
            if (targetPlayer && sourcePlayer) {
              logMessage = `${targetPlayer.character.name} 没有响应，受到${sourcePlayer.character.name}的1点伤害`;
            }
          } else if (usedCardName) {
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
          break;
        }
        case GameAction.END_TURN:
          logMessage = `${actingPlayer.character.name} 结束回合`;
          break;
        case GameAction.DISCARD_CARD: {
          // 从弃牌堆找到刚弃置的牌
          const discardedCard = gameState.discardPile[gameState.discardPile.length - 1];
          if (discardedCard) {
            logMessage = `${actingPlayer.character.name} 弃置了【${discardedCard.name}】`;
          } else {
            logMessage = `${actingPlayer.character.name} 弃置了卡牌`;
          }
          break;
        }
      }
      
      if (logMessage) {
        set({ 
          gameState,
          logs: [logMessage, ...state.logs].slice(0, 50)
        });
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

  startGame: () => {
    const { engine, logs } = get();
    if (engine) {
      engine.startGame();
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
  },

  selectCard: (cardId: string | null) => {
    set({ selectedCardId: cardId });
  },

  selectTarget: (playerId: string) => {
    const { selectedTargetIds } = get();
    if (selectedTargetIds.includes(playerId)) {
      set({ 
        selectedTargetIds: selectedTargetIds.filter(id => id !== playerId) 
      });
    } else {
      set({ 
        selectedTargetIds: [...selectedTargetIds, playerId] 
      });
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
    
    const success = engine.executeAction({
      action: GameAction.PLAY_CARD,
      playerId: currentPlayer.id,
      cardId: finalCardId,
      targetIds: finalTargetIds && finalTargetIds.length > 0 ? finalTargetIds : undefined,
    });

    if (success) {
      // 如果使用成功且是杀，增加计数
      const newAttackCount = card?.name === '杀' ? attackCountThisTurn + 1 : attackCountThisTurn;
      
      set({ 
        selectedCardId: null,
        selectedTargetIds: [],
        gameState: engine.getState(),
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
    const { engine, gameState, logs } = get();
    if (!engine || !gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // 先找到卡牌名称
    const card = currentPlayer.handCards.find(c => c.id === cardId);
    const cardName = card?.name || '卡牌';
    
    const success = engine.executeAction({
      action: GameAction.DISCARD_CARD,
      playerId: currentPlayer.id,
      cardId,
    });

    if (success) {
      // 添加弃牌日志
      const logMessage = `${currentPlayer.character.name} 弃置了【${cardName}】`;
      
      set({ 
        gameState: engine.getState(),
        logs: [logMessage, ...logs].slice(0, 50)
      });
    }
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

    const targetPlayer = gameState.players.find(p => p.id === pendingResponse.request.targetPlayerId);
    if (!targetPlayer) return;

    const success = engine.respondToAttack(targetPlayer.id, cardId);

    if (success) {
      let logMessage = '';
      if (cardId) {
        logMessage = `${targetPlayer.character.name} 打出了【闪】，抵消了【杀】`;
      } else {
        logMessage = `${targetPlayer.character.name} 受到【杀】的1点伤害`;
      }

      set({
        gameState: engine.getState(),
        logs: [logMessage, ...logs].slice(0, 50),
        selectedCardId: null,
        selectedTargetIds: [],
      });
    }
  },
}));
