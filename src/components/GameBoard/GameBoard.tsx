import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card } from '../Card/Card';
import { PlayerAvatar } from '../PlayerAvatar/PlayerAvatar';
import { HandCards } from '../HandCards/HandCards';
import { GamePhase, Identity, CardType, SpellCardName, BasicCardName, ResponseType, Card as GameCard } from '../../types/game';
import { DistanceCalculator } from '../../game/DistanceCalculator';
import './GameBoard.css';

// 模块级别的标志，确保只清空一次日志
// @ts-ignore - 保留以备后续使用
let hasAutoClearedLogs = false;

// 卡牌使用动画信息
interface CardAnimation {
  sourcePlayerId: string;
  targetPlayerId: string;
  cardName: string;
  timestamp: number;
}

// 出牌显示信息
interface PlayedCardInfo {
  id: string;
  card: GameCard;
  playerName: string;
  targetName?: string;
  timestamp: number;
}

// 将函数定义移到组件外部
const getPhaseText = (phase: GamePhase): string => {
  switch (phase) {
    case GamePhase.TURN_START:
      return '回合开始';
    case GamePhase.JUDGMENT:
      return '判定阶段';
    case GamePhase.DRAW:
      return '摸牌阶段';
    case GamePhase.PLAY:
      return '出牌阶段';
    case GamePhase.RESPONSE:
      return '响应阶段';
    case GamePhase.DISCARD:
      return '弃牌阶段';
    case GamePhase.TURN_END:
      return '回合结束';
    case GamePhase.GAME_OVER:
      return '游戏结束';
    default:
      return '';
  }
};

// 检查卡牌是否是有效的响应牌
const isValidResponseCard = (card: GameCard, responseType: ResponseType): boolean => {
  switch (responseType) {
    case ResponseType.DODGE:
      // 需要打出闪
      return card.name === BasicCardName.DODGE;
    case ResponseType.ATTACK:
    case ResponseType.DUEL:
      // 需要打出杀（南蛮入侵或决斗）
      return card.name === BasicCardName.ATTACK ||
        card.name === BasicCardName.THUNDER_ATTACK ||
        card.name === BasicCardName.FIRE_ATTACK_CARD;
    case ResponseType.NULLIFY:
      // 需要打出无懈可击
      return card.name === SpellCardName.NULLIFICATION;
    default:
      return false;
  }
};

const getWinnerText = (winner: Identity): string => {
  switch (winner) {
    case Identity.LORD:
      return '主公和忠臣胜利！';
    case Identity.REBEL:
      return '反贼胜利！';
    case Identity.TRAITOR:
      return '内奸胜利！';
    default:
      return '';
  }
};

export const GameBoard: React.FC = () => {
  const {
    gameState,
    isGameStarted,
    selectedCardId,
    selectedTargetIds,
    logs,
    attackCountThisTurn,
    timeLeft,
    maxTime,
    isTimerRunning,
    isPaused,
    initGame,
    startGame,
    selectCard,
    selectTarget,
    clearTarget,
    playCard,
    endTurn,
    discardCard,
    updateGameState,
    respondToAttack,
    startTimer,
    stopTimer,
    // @ts-ignore - 保留以备后续使用
    handleTimeout,
    pauseGame,
    resumeGame,
  } = useGameStore();

  // 用于强制刷新UI的状态
  const [, forceUpdate] = useState({});

  // 错误提示状态
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);

  // 卡牌使用动画状态
  const [cardAnimation, setCardAnimation] = useState<CardAnimation | null>(null);
  const [linePosition, setLinePosition] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);

  // 出牌显示区域状态 - 支持多张牌排列
  const [playedCards, setPlayedCards] = useState<PlayedCardInfo[]>([]);

  // 牌堆查看弹窗状态
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [deckSortBy, setDeckSortBy] = useState<'original' | 'type'>('original');

  // 弃牌堆查看弹窗状态
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [discardSortBy, setDiscardSortBy] = useState<'original' | 'type'>('original');

  // 弃牌阶段选择状态
  const [selectedDiscardCards, setSelectedDiscardCards] = useState<string[]>([]);

  // 响应阶段选择状态
  const [selectedResponseCard, setSelectedResponseCard] = useState<string | null>(null);

  // 缩放比例状态
  const [scale, setScale] = useState(1);

  // 玩家头像DOM引用
  const playerRefs = useRef<Map<string, HTMLElement>>(new Map());
  const gameContentRef = useRef<HTMLDivElement>(null);

  // 设置玩家头像ref的回调
  const setPlayerRef = (playerId: string) => (el: HTMLElement | null) => {
    if (el) {
      playerRefs.current.set(playerId, el);
    } else {
      playerRefs.current.delete(playerId);
    }
  };

  useEffect(() => {
    initGame(4);

    // 动态导入 Logger 以触发初始化
    // @ts-ignore - 动态导入 Logger
    import('../../utils/Logger').then(() => {
      console.log('[GameBoard] Logger 初始化完成');
    }).catch(e => {
      console.error('[GameBoard] Logger 初始化失败:', e);
    });
  }, []);

  // 计算并设置缩放比例
  useEffect(() => {
    const calculateScale = () => {
      // 设计时的标准尺寸 - 必须与CSS中的尺寸一致
      const designWidth = 1400;
      const designHeight = 900;

      // 获取视口大小
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 计算缩放比例，让游戏界面刚好充满可视区域
      const scaleX = viewportWidth / designWidth;
      const scaleY = viewportHeight / designHeight;
      // 取较小值确保内容完全显示在可视区域内
      const newScale = Math.min(scaleX, scaleY);

      setScale(newScale);
    };

    // 初始计算
    calculateScale();

    // 监听窗口大小变化
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // 计时器效果
  useEffect(() => {
    if (!isGameStarted || !gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isHumanTurn = !currentPlayer.isAI;
    const isResponsePhase = gameState.phase === GamePhase.RESPONSE;
    const isHumanResponse = isResponsePhase && gameState.pendingResponse?.request.targetPlayerId === humanPlayer.id;

    // 只在需要玩家操作的阶段启动计时器
    if ((isHumanTurn && (gameState.phase === GamePhase.PLAY || gameState.phase === GamePhase.DISCARD)) || isHumanResponse) {
      // 不同阶段不同时间限制
      let timeLimit = 15; // 出牌阶段15秒
      if (gameState.phase === GamePhase.DISCARD) {
        timeLimit = 15; // 弃牌阶段15秒
      } else if (isResponsePhase) {
        // 无懈可击响应8秒，其他响应10秒
        const isNullifyResponse = gameState.pendingResponse?.request.responseType === ResponseType.NULLIFY;
        timeLimit = isNullifyResponse ? 8 : 10;
      }

      startTimer(timeLimit);

      return () => {
        stopTimer();
      };
    } else {
      stopTimer();
    }
  }, [gameState?.phase, gameState?.currentPlayerIndex, gameState?.pendingResponse, isGameStarted]);

  // AI回合时定时刷新UI
  useEffect(() => {
    if (!gameState || !isGameStarted) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (currentPlayer.isAI) {
      // AI回合每500ms刷新一次UI
      const interval = setInterval(() => {
        updateGameState();
        forceUpdate({});
      }, 500);

      return () => clearInterval(interval);
    }
  }, [gameState?.currentPlayerIndex, isGameStarted]);

  // 监听游戏动作以触发动画 - 只在游戏开始时添加一次
  const hasAddedListener = useRef(false);

  // 当游戏未开始时，重置监听器标志
  useEffect(() => {
    if (!isGameStarted) {
      hasAddedListener.current = false;
    }
  }, [isGameStarted]);

  useEffect(() => {
    if (!isGameStarted || hasAddedListener.current) return;

    const engine = useGameStore.getState().engine;
    if (!engine) return;

    hasAddedListener.current = true;

    const handleAction = (action: any) => {
      // 只处理出牌动作且有目标的情况，且action中包含cardName
      // 注意：GameAction.PLAY_CARD 的值是 'play_card'
      // 排除响应动作（如打出闪），不触发动画
      if (action.action === 'play_card' && action.targetIds && action.targetIds.length > 0 && action.cardName && !action.isResponse) {
        // 触发动画
        setCardAnimation({
          sourcePlayerId: action.playerId,
          targetPlayerId: action.targetIds[0],
          cardName: action.cardName,
          timestamp: Date.now(),
        });
      }

      // 显示出牌信息（包括有目标和无目标的牌）
      if (action.action === 'play_card' && action.cardName && !action.isResponse) {
        const gameState = useGameStore.getState().gameState;
        if (gameState) {
          const player = gameState.players.find(p => p.id === action.playerId);
          const target = action.targetIds?.length > 0
            ? gameState.players.find(p => p.id === action.targetIds[0])
            : undefined;

          // 查找卡牌信息
          const playedCard = player?.handCards.find(c => c.id === action.cardId) ||
            gameState.discardPile[gameState.discardPile.length - 1];

          if (player && playedCard) {
            const newCard: PlayedCardInfo = {
              id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              card: playedCard,
              playerName: player.character.name,
              targetName: target?.character.name,
              timestamp: Date.now(),
            };

            // 添加新牌到列表开头
            setPlayedCards(prev => [newCard, ...prev].slice(0, 5)); // 最多显示5张牌

            // 3秒后移除这张牌
            setTimeout(() => {
              setPlayedCards(prev => prev.filter(c => c.id !== newCard.id));
            }, 3000);
          }
        }
      }
    };

    // 添加监听器
    engine.onAction(handleAction);
  }, [isGameStarted]);

  // 当cardAnimation变化时，计算位置并设置线条
  useEffect(() => {
    if (!cardAnimation) return;

    // 多次尝试获取refs，因为React可能需要几个渲染周期
    let retryCount = 0;
    const maxRetries = 10;

    const tryCalculatePosition = () => {
      const sourceEl = playerRefs.current.get(cardAnimation.sourcePlayerId);
      const targetEl = playerRefs.current.get(cardAnimation.targetPlayerId);

      if (sourceEl && targetEl) {
        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const boardEl = document.querySelector('.game-board') as HTMLElement;

        if (boardEl) {
          const boardRect = boardEl.getBoundingClientRect();

          setLinePosition({
            start: {
              x: sourceRect.left + sourceRect.width / 2 - boardRect.left,
              y: sourceRect.top + sourceRect.height / 2 - boardRect.top,
            },
            end: {
              x: targetRect.left + targetRect.width / 2 - boardRect.left,
              y: targetRect.top + targetRect.height / 2 - boardRect.top,
            },
          });
          return;
        }
      }

      // 如果找不到refs，延迟后重试
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryCalculatePosition, 100);
      }
    };

    // 等待一下再开始尝试（确保React完成渲染）
    setTimeout(tryCalculatePosition, 100);

    // 2秒后清除动画
    const clearTimer = setTimeout(() => {
      setCardAnimation(null);
      setLinePosition(null);
    }, 2500);

    return () => clearTimeout(clearTimer);
  }, [cardAnimation]);

  // 在开始界面自动清空日志
  useEffect(() => {
    if (!isGameStarted) {
      // 当回到开始界面时，重置标志并清空日志
      hasAutoClearedLogs = false;
      const autoClearLogs = async () => {
        try {
          // @ts-ignore - 动态导入 Logger
          const { logger } = await import('../../utils/Logger');
          if (logger && typeof logger.clearAllLogs === 'function') {
            await logger.clearAllLogs();
            console.log('游戏开始界面：日志已自动清空');
          }
        } catch (e) {
          console.error('自动清空日志失败:', e);
        }
      };
      autoClearLogs();
    }
  }, [isGameStarted]);

  if (!isGameStarted) {
    return (
      <div className="start-screen">
        <h1 className="start-title">三国卡牌</h1>
        <div className="start-buttons">
          <button className="start-btn" onClick={() => startGame(4)}>
            开始游戏
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const humanPlayer = gameState.players[0];
  const isHumanTurn = currentPlayer.id === humanPlayer.id;
  const opponents = gameState.players.filter((_, index) => index !== 0);

  // 找到主公
  const lordPlayer = gameState.players.find(p => p.identity === Identity.LORD);

  const handleCardClick = (cardId: string) => {
    // 响应阶段（选择响应牌）
    if (gameState.phase === GamePhase.RESPONSE) {
      const pendingResponse = gameState.pendingResponse;
      if (pendingResponse) {
        // 决斗阶段使用 duelState.currentTurnId 判断
        const isDuel = pendingResponse.request.responseType === ResponseType.DUEL;
        const currentTurnId = isDuel && pendingResponse.duelState
          ? pendingResponse.duelState.currentTurnId
          : pendingResponse.request.targetPlayerId;

        if (currentTurnId === humanPlayer.id) {
          const card = humanPlayer.handCards.find(c => c.id === cardId);
          if (!card) return;

          // 使用辅助函数检查卡牌是否是有效的响应牌
          const responseType = pendingResponse.request.responseType;
          if (responseType && isValidResponseCard(card, responseType)) {
            setSelectedResponseCard(prev => prev === cardId ? null : cardId);
          }
        }
      }
      return;
    }

    if (!isHumanTurn) return;

    // 出牌阶段
    if (gameState.phase === GamePhase.PLAY) {
      if (selectedCardId === cardId) {
        selectCard(null);
      } else {
        selectCard(cardId);
      }
    }
    // 弃牌阶段 - 选择要弃置的牌
    else if (gameState.phase === GamePhase.DISCARD) {
      if (discardInfo && discardInfo.cardsToDiscard > 0) {
        // 切换选择状态
        setSelectedDiscardCards(prev => {
          if (prev.includes(cardId)) {
            return prev.filter(id => id !== cardId);
          } else if (prev.length < discardInfo.cardsToDiscard) {
            return [...prev, cardId];
          }
          return prev;
        });
      }
    }
  };

  // 检查是否可以选择某个玩家作为目标
  const canSelectTarget = (targetPlayer: typeof humanPlayer): boolean => {
    if (!isHumanTurn || gameState.phase !== GamePhase.PLAY) return false;
    if (!selectedCardId) return false; // 没有选牌时不能选目标

    const selectedCard = humanPlayer.handCards.find(c => c.id === selectedCardId);
    if (!selectedCard) return false;

    // 装备牌只能对自己使用
    if (selectedCard.type === CardType.EQUIPMENT) {
      return false;
    }

    // 不能选择其他玩家作为目标（装备牌已经处理过了）
    if (targetPlayer.id === humanPlayer.id) return false;

    // 根据卡牌类型检查距离
    if (selectedCard.type === CardType.BASIC &&
      (selectedCard.name === BasicCardName.ATTACK ||
        selectedCard.name === BasicCardName.THUNDER_ATTACK ||
        selectedCard.name === BasicCardName.FIRE_ATTACK_CARD)) {
      // 杀（包括普通杀、雷杀、火杀）：检查攻击范围
      return DistanceCalculator.canAttack(humanPlayer, targetPlayer, gameState.players);
    }

    if (selectedCard.type === CardType.SPELL) {
      // 不需要选择目标的锦囊牌
      const noTargetSpells = [
        SpellCardName.DRAW_TWO,  // 无中生有
        SpellCardName.SAVAGE,    // 南蛮入侵
        SpellCardName.ARCHERY,   // 万箭齐发
        SpellCardName.PEACH_GARDEN, // 桃园结义
      ];
      if (noTargetSpells.includes(selectedCard.name as SpellCardName)) {
        return false; // 这些牌不需要选择目标
      }

      if (selectedCard.name === SpellCardName.STEAL) {
        // 顺手牵羊：距离限制为1
        const distance = DistanceCalculator.calculateDistance(humanPlayer, targetPlayer, gameState.players);
        return distance <= 1;
      }
      // 过河拆桥、决斗、火攻等需要选择目标，没有距离限制
      return true;
    }

    return true;
  };

  // 检查是否应该显示为不可选状态（灰色）- 用于视觉反馈
  const isTargetUnselectable = (targetPlayer: typeof humanPlayer): boolean => {
    if (!isHumanTurn || gameState.phase !== GamePhase.PLAY) return false;
    if (!selectedCardId) return false; // 没有选牌时不显示灰色
    if (targetPlayer.id === humanPlayer.id) return false; // 自己不显示灰色
    if (targetPlayer.isDead) return false; // 已死亡玩家不显示灰色

    const selectedCard = humanPlayer.handCards.find(c => c.id === selectedCardId);
    if (!selectedCard) return false;

    // 装备牌不需要选择其他玩家目标
    if (selectedCard.type === CardType.EQUIPMENT) {
      return false;
    }

    // 不需要选择目标的锦囊牌
    if (selectedCard.type === CardType.SPELL) {
      const noTargetSpells = [
        SpellCardName.DRAW_TWO,  // 无中生有
        SpellCardName.SAVAGE,    // 南蛮入侵
        SpellCardName.ARCHERY,   // 万箭齐发
        SpellCardName.PEACH_GARDEN, // 桃园结义
      ];
      if (noTargetSpells.includes(selectedCard.name as SpellCardName)) {
        return false;
      }
    }

    // 对于需要选择目标但不可选的卡牌，显示灰色
    return !canSelectTarget(targetPlayer);
  };

  const handlePlayerClick = (playerId: string) => {
    if (!isHumanTurn || gameState.phase !== GamePhase.PLAY) return;

    const selectedCard = humanPlayer.handCards.find(c => c.id === selectedCardId);

    // 装备牌只能对自己使用
    if (selectedCard?.type === CardType.EQUIPMENT) {
      if (playerId === humanPlayer.id) {
        // 点击自己，直接装备
        playCard();
      }
      return;
    }

    if (playerId === humanPlayer.id) return; // 非装备牌不能选择自己

    const targetPlayer = gameState.players.find(p => p.id === playerId);
    if (!targetPlayer) return;

    // 检查是否可以选择该目标
    if (!canSelectTarget(targetPlayer)) {
      if (selectedCard) {
        const distance = DistanceCalculator.calculateDistance(humanPlayer, targetPlayer, gameState.players);
        const attackRange = DistanceCalculator.getAttackRange(humanPlayer);

        // 清除之前的错误提示定时器
        if (errorTimeout) {
          clearTimeout(errorTimeout);
        }

        // 设置错误提示
        setErrorMessage(`${selectedCard.name} 无法选择该目标（距离: ${distance}, 攻击范围: ${attackRange}）`);

        // 3秒后清除错误提示
        const timeout = setTimeout(() => {
          setErrorMessage(null);
        }, 3000);
        setErrorTimeout(timeout);
      }
      return;
    }

    // 对于【杀】等单目标卡牌，切换目标时先清空之前的选择
    if (selectedCard?.name === BasicCardName.ATTACK) {
      // 如果点击的是已选中的目标，则取消选择
      if (selectedTargetIds.includes(playerId)) {
        selectTarget(playerId); // 取消选择
      } else {
        // 先清空所有选择，再选择新目标
        clearTarget();
        selectTarget(playerId);
      }
    } else {
      // 其他卡牌使用原来的toggle逻辑
      selectTarget(playerId);
    }
  };

  const handlePlayCard = () => {
    if (selectedCardId) {
      playCard(selectedCardId, selectedTargetIds);
    }
  };

  // 计算需要弃置的牌数
  const getDiscardInfo = () => {
    if (!isHumanTurn || gameState.phase !== GamePhase.DISCARD) return null;
    const maxCards = humanPlayer.character.hp;
    const cardsToDiscard = Math.max(0, humanPlayer.handCards.length - maxCards);
    return { maxCards, cardsToDiscard };
  };

  const discardInfo = getDiscardInfo();

  // 检查卡牌是否可用（包括攻击范围和使用次数限制）
  const isCardPlayable = (card: typeof humanPlayer.handCards[0]): boolean => {
    // 如果不是自己的回合或不在出牌阶段，卡牌不可用
    if (!isHumanTurn || gameState.phase !== GamePhase.PLAY) return false;

    // 检查是否是"杀"卡牌（包括普通杀、雷杀、火杀）
    const isAttackCard = card.type === CardType.BASIC &&
      (card.name === BasicCardName.ATTACK || card.name === BasicCardName.THUNDER_ATTACK || card.name === BasicCardName.FIRE_ATTACK_CARD);
    if (isAttackCard) {
      // 检查本回合是否已经使用过杀（没有诸葛连弩的情况下）
      const hasCrossbow = humanPlayer.equipment.weapon?.name === '诸葛连弩';
      if (!hasCrossbow && attackCountThisTurn >= 1) {
        return false; // 已经用过杀，不能再用了
      }

      // 检查是否有可攻击的目标（至少有一个敌人在攻击范围内）
      const canAttackAny = opponents.some(opponent =>
        !opponent.isDead && DistanceCalculator.canAttack(humanPlayer, opponent, gameState.players)
      );
      return canAttackAny;
    }

    // 检查顺手牵羊的距离限制
    if (card.type === CardType.SPELL && card.name === SpellCardName.STEAL) {
      // 检查是否至少有一个目标在顺手牵羊的距离范围内
      const canStealAny = opponents.some(opponent =>
        !opponent.isDead &&
        (opponent.handCards.length > 0 || Object.keys(opponent.equipment).length > 0) &&
        DistanceCalculator.calculateDistance(humanPlayer, opponent, gameState.players) <= 1
      );
      return canStealAny;
    }

    return true;
  };

  return (
    <div className="game-board">
      <div
        className="game-content"
        ref={gameContentRef}
        style={{
          width: '100vw',
          height: '100vh',
        }}
      >
        <div className="game-header">
          <div className="game-title">三国卡牌</div>
          <div className="game-info">
            <span>第 {gameState.round} 轮</span>
            <span className="game-phase">{getPhaseText(gameState.phase)}</span>
            <span className="current-player">当前回合: {currentPlayer.character.name}</span>
            <span
              className="deck-info clickable"
              onClick={() => setShowDeckModal(true)}
              title="点击查看牌堆"
            >
              牌堆: {gameState.deck.length} 张
            </span>
            <span
              className="discard-info clickable"
              onClick={() => setShowDiscardModal(true)}
              title="点击查看弃牌堆"
            >
              弃牌: {gameState.discardPile.length} 张
            </span>
          </div>
          {/* 计时器 */}
          {isTimerRunning && !isPaused && (
            <div className="timer-container">
              <div className="timer-bar" style={{ width: `${(timeLeft / maxTime) * 100}%` }} />
              <span className="timer-text">{timeLeft}s</span>
            </div>
          )}

          {/* 暂停/恢复按钮 */}
          <button
            className={`pause-btn ${isPaused ? 'paused' : ''}`}
            onClick={() => {
              if (isPaused) {
                resumeGame();
              } else {
                pauseGame();
              }
            }}
          >
            {isPaused ? '▶ 继续' : '⏸ 暂停'}
          </button>

        </div>

        {/* 暂停指示器 */}
        {isPaused && (
          <div className="pause-overlay">
            <div className="pause-content">
              <div className="pause-icon">⏸</div>
              <div className="pause-text">游戏已暂停</div>
              <button className="pause-resume-btn" onClick={resumeGame}>
                ▶ 继续游戏
              </button>
            </div>
          </div>
        )}

        {/* 牌堆查看弹窗 */}
        {showDeckModal && (
          <div className="deck-modal-overlay" onClick={() => setShowDeckModal(false)}>
            <div className="deck-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="deck-modal-header">
                <h3>牌堆内容 (共 {gameState.deck.length} 张)</h3>
                <div className="deck-modal-actions">
                  <button
                    className={`sort-btn ${deckSortBy === 'original' ? 'active' : ''}`}
                    onClick={() => setDeckSortBy('original')}
                  >
                    原始顺序
                  </button>
                  <button
                    className={`sort-btn ${deckSortBy === 'type' ? 'active' : ''}`}
                    onClick={() => setDeckSortBy('type')}
                  >
                    按类型排序
                  </button>
                  <button className="close-btn" onClick={() => setShowDeckModal(false)}>✕</button>
                </div>
              </div>
              <div className="deck-modal-body">
                {gameState.deck.length === 0 ? (
                  <p>牌堆为空</p>
                ) : (
                  <div className="deck-cards-grid">
                    {(() => {
                      // 根据排序方式准备数据（不影响原始牌堆顺序）
                      let displayCards = [...gameState.deck];
                      if (deckSortBy === 'type') {
                        const typeOrder = { 'basic': 0, 'spell': 1, 'equipment': 2 };
                        displayCards.sort((a, b) => {
                          const typeDiff = (typeOrder[a.type as keyof typeof typeOrder] || 0) - (typeOrder[b.type as keyof typeof typeOrder] || 0);
                          if (typeDiff !== 0) return typeDiff;
                          return a.name.localeCompare(b.name);
                        });
                      }
                      return displayCards.map((card, index) => (
                        <div key={`${card.id}-${index}`} className={`deck-card-visual ${card.type}`}>
                          <div className="card-header">
                            <span className="card-suit-small">{card.suit}</span>
                            <span className="card-number">{card.number}</span>
                          </div>
                          <div className="card-body">
                            <span className="card-name-visual">{card.name}</span>
                          </div>
                          <div className="card-footer">
                            <span className="card-type-badge">{card.type}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 弃牌堆查看弹窗 */}
        {showDiscardModal && (
          <div className="deck-modal-overlay" onClick={() => setShowDiscardModal(false)}>
            <div className="deck-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="deck-modal-header">
                <h3>弃牌堆内容 (共 {gameState.discardPile.length} 张)</h3>
                <div className="deck-modal-actions">
                  <button
                    className={`sort-btn ${discardSortBy === 'original' ? 'active' : ''}`}
                    onClick={() => setDiscardSortBy('original')}
                  >
                    原始顺序
                  </button>
                  <button
                    className={`sort-btn ${discardSortBy === 'type' ? 'active' : ''}`}
                    onClick={() => setDiscardSortBy('type')}
                  >
                    按类型排序
                  </button>
                  <button className="close-btn" onClick={() => setShowDiscardModal(false)}>✕</button>
                </div>
              </div>
              <div className="deck-modal-body">
                {gameState.discardPile.length === 0 ? (
                  <p>弃牌堆为空</p>
                ) : (
                  <div className="deck-cards-grid">
                    {(() => {
                      // 根据排序方式准备数据（不影响原始弃牌堆顺序）
                      let displayCards = [...gameState.discardPile];
                      if (discardSortBy === 'type') {
                        const typeOrder = { 'basic': 0, 'spell': 1, 'equipment': 2 };
                        displayCards.sort((a, b) => {
                          const typeDiff = (typeOrder[a.type as keyof typeof typeOrder] || 0) - (typeOrder[b.type as keyof typeof typeOrder] || 0);
                          if (typeDiff !== 0) return typeDiff;
                          return a.name.localeCompare(b.name);
                        });
                      }
                      return displayCards.map((card, index) => (
                        <div key={`${card.id}-${index}`} className={`deck-card-visual ${card.type}`}>
                          <div className="card-header">
                            <span className="card-suit-small">{card.suit}</span>
                            <span className="card-number">{card.number}</span>
                          </div>
                          <div className="card-body">
                            <span className="card-name-visual">{card.name}</span>
                          </div>
                          <div className="card-footer">
                            <span className="card-type-badge">{card.type}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 出牌显示区域 */}
        <div className="played-cards-area">
          {playedCards.map((item, index) => (
            <div
              key={item.id}
              className="played-card-item"
              style={{
                transform: `translateX(${index * 90}px)`,
                zIndex: playedCards.length - index,
              }}
            >
              <div className="played-card-wrapper">
                <Card
                  card={item.card}
                  isDisabled={true}
                  showDescription={false}
                />
                <div className="played-card-label">
                  <span className="played-card-player">{item.playerName}</span>
                  {item.targetName && (
                    <>
                      <span className="played-card-arrow">→</span>
                      <span className="played-card-target">{item.targetName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="game-main">
          {/* 对手区域 */}
          <div className="opponents-area">
            {opponents.map((player, index) => {
              // 判断是否是响应阶段的目标玩家
              const isResponseTarget = gameState.phase === GamePhase.RESPONSE &&
                gameState.pendingResponse?.request.targetPlayerId === player.id;
              // 响应阶段高亮目标玩家，否则高亮当前回合玩家
              const showHighlight = isResponseTarget ||
                (gameState.phase !== GamePhase.RESPONSE && gameState.currentPlayerIndex === index + 1);

              return (
                <PlayerAvatar
                  key={player.id}
                  player={player}
                  isCurrentTurn={showHighlight}
                  isSelected={selectedTargetIds.includes(player.id)}
                  isHuman={false}
                  showIdentity={true}
                  isLord={lordPlayer?.id === player.id}
                  isSelectable={canSelectTarget(player)}
                  isUnselectable={isTargetUnselectable(player)}
                  onClick={() => handlePlayerClick(player.id)}
                  setRef={setPlayerRef(player.id)}
                />
              );
            })}
          </div>

          {/* 错误提示面板 - 显示在对手区域下方 */}
          {errorMessage && (
            <div className="error-panel">
              <div className="error-content">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* 自己区域 */}
          <div className="self-area">
            <div className="player-avatar-section">
              <PlayerAvatar
                player={humanPlayer}
                isCurrentTurn={isHumanTurn || (gameState.phase === GamePhase.RESPONSE &&
                  gameState.pendingResponse?.request.targetPlayerId === humanPlayer.id)}
                isSelected={false}
                isHuman={true}
                showIdentity={true}
                isLord={lordPlayer?.id === humanPlayer.id}
                setRef={setPlayerRef(humanPlayer.id)}
              />
            </div>

            <div className="hand-cards-section">
              {/* 玩家操作区域 - 按钮和计时器 */}
              <div className="player-action-area">
                {/* 计时器 */}
                {isTimerRunning && !isPaused && (
                  <div className="timer-container">
                    <div className="timer-bar" style={{ width: `${(timeLeft / maxTime) * 100}%` }} />
                    <span className="timer-text">{timeLeft}s</span>
                  </div>
                )}

                {/* 出牌按钮 */}
                {isHumanTurn && gameState.phase === GamePhase.PLAY && (
                  <div className="action-buttons">
                    <button
                      className="action-btn btn-play"
                      onClick={handlePlayCard}
                      disabled={!selectedCardId}
                    >
                      出牌
                    </button>
                    <button
                      className="action-btn btn-end"
                      onClick={endTurn}
                    >
                      结束回合
                    </button>
                  </div>
                )}

                {/* 弃牌阶段提示 */}
                {discardInfo && discardInfo.cardsToDiscard > 0 && (
                  <div className="discard-panel">
                    <div className="discard-info">
                      需弃置 {discardInfo.cardsToDiscard} 张牌
                    </div>
                    <div className="discard-buttons">
                      <button
                        className="action-btn btn-confirm"
                        onClick={() => {
                          // 确认弃牌
                          selectedDiscardCards.forEach(cardId => {
                            discardCard(cardId);
                          });
                          setSelectedDiscardCards([]);
                        }}
                        disabled={selectedDiscardCards.length !== discardInfo.cardsToDiscard}
                      >
                        确定
                      </button>
                      <button
                        className="action-btn btn-cancel"
                        onClick={() => {
                          // 取消选择
                          setSelectedDiscardCards([]);
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 手牌区域 - 使用自适应堆叠算法 */}
              <HandCards
                cards={humanPlayer.handCards}
                gamePhase={gameState.phase}
                isHumanTurn={isHumanTurn}
                humanPlayer={humanPlayer}
                selectedCardId={selectedCardId}
                selectedDiscardCards={selectedDiscardCards}
                selectedResponseCard={selectedResponseCard}
                discardInfo={discardInfo}
                pendingResponse={gameState.pendingResponse}
                isCardPlayable={isCardPlayable}
                onCardClick={handleCardClick}
              />

              {isHumanTurn && gameState.phase === GamePhase.PLAY && (
                <div className="action-buttons">
                  <button
                    className="action-btn btn-play"
                    onClick={handlePlayCard}
                    disabled={!selectedCardId}
                  >
                    出牌
                  </button>
                  <button
                    className="action-btn btn-end"
                    onClick={endTurn}
                  >
                    结束回合
                  </button>
                </div>
              )}

              {/* 响应阶段提示（被杀或锦囊牌时） */}
              {gameState.phase === GamePhase.RESPONSE && gameState.pendingResponse && (
                <div className="response-panel">
                  {gameState.pendingResponse.request.responseType === ResponseType.NULLIFY ? (
                    // 无懈可击响应阶段 - 只有非锦囊牌使用者才显示响应界面
                    gameState.pendingResponse.request.sourcePlayerId !== humanPlayer.id ? (
                      <>
                        <div className="response-info">
                          <span className="response-attacker">
                            {gameState.players.find(p => p.id === gameState.pendingResponse?.request.sourcePlayerId)?.character.name}
                          </span>
                          使用了【{gameState.pendingResponse.request.cardName}】，是否打出【无懈可击】？
                        </div>
                        <div className="response-buttons">
                          <button
                            className="action-btn btn-confirm"
                            onClick={() => {
                              if (selectedResponseCard) {
                                respondToAttack(selectedResponseCard);
                                setSelectedResponseCard(null);
                              }
                            }}
                            disabled={!selectedResponseCard}
                          >
                            确定
                          </button>
                          <button
                            className="action-btn btn-cancel"
                            onClick={() => {
                              setSelectedResponseCard(null);
                              respondToAttack();
                            }}
                          >
                            取消
                          </button>
                        </div>
                      </>
                    ) : (
                      // 锦囊牌使用者等待其他玩家响应
                      <>
                        <div className="response-info">
                          等待其他玩家响应...
                        </div>
                      </>
                    )
                  ) : gameState.pendingResponse.request.responseType === ResponseType.DUEL ? (
                    // 决斗响应阶段（双方轮流出杀）
                    <>
                      {gameState.pendingResponse.duelState?.currentTurnId === humanPlayer.id ? (
                        // 轮到当前玩家出杀
                        <>
                          <div className="response-info">
                            <span className="response-attacker">
                              {gameState.players.find(p => p.id === gameState.pendingResponse?.duelState?.challengerId)?.character.name}
                            </span>
                            {gameState.pendingResponse.duelState?.round === 1 && gameState.pendingResponse.duelState?.targetId === humanPlayer.id
                              ? ' 向你发起【决斗】'
                              : ' 与你【决斗】中'}
                          </div>
                          <div className="response-hint">
                            请打出一张【杀】进行响应，否则受到1点伤害
                          </div>
                          <div className="response-buttons">
                            <button
                              className="action-btn btn-response"
                              onClick={() => {
                                // 查找手牌中的杀（包括普通杀、雷杀、火杀）
                                const attackCard = humanPlayer.handCards.find(
                                  c => c.name === BasicCardName.ATTACK ||
                                    c.name === BasicCardName.THUNDER_ATTACK ||
                                    c.name === BasicCardName.FIRE_ATTACK_CARD
                                );
                                if (attackCard) {
                                  respondToAttack(attackCard.id);
                                }
                              }}
                              disabled={!humanPlayer.handCards.some(
                                c => c.name === BasicCardName.ATTACK ||
                                  c.name === BasicCardName.THUNDER_ATTACK ||
                                  c.name === BasicCardName.FIRE_ATTACK_CARD
                              )}
                            >
                              打出杀
                            </button>
                            <button
                              className="action-btn btn-no-response"
                              onClick={() => respondToAttack()}
                            >
                              不响应（受到1点伤害）
                            </button>
                          </div>
                        </>
                      ) : (
                        // 等待对方出杀
                        <div className="response-waiting">
                          等待 {gameState.players.find(p => p.id === gameState.pendingResponse?.duelState?.currentTurnId)?.character.name} 响应【决斗】...
                        </div>
                      )}
                    </>
                  ) : gameState.pendingResponse.request.responseType === ResponseType.ATTACK ? (
                    // 南蛮入侵响应阶段（需要打出杀）
                    <>
                      {gameState.pendingResponse.request.targetPlayerId === humanPlayer.id ? (
                        // 当前玩家需要响应
                        <>
                          <div className="response-info">
                            <span className="response-attacker">
                              {gameState.players.find(p => p.id === gameState.pendingResponse?.request.sourcePlayerId)?.character.name}
                            </span>
                            使用了【南蛮入侵】
                          </div>
                          <div className="response-hint">
                            请打出一张【杀】进行响应，否则受到1点伤害
                          </div>
                          <div className="response-buttons">
                            <button
                              className="action-btn btn-response"
                              onClick={() => {
                                // 查找手牌中的杀（包括普通杀、雷杀、火杀）
                                const attackCard = humanPlayer.handCards.find(
                                  c => c.name === BasicCardName.ATTACK ||
                                    c.name === BasicCardName.THUNDER_ATTACK ||
                                    c.name === BasicCardName.FIRE_ATTACK_CARD
                                );
                                if (attackCard) {
                                  respondToAttack(attackCard.id);
                                }
                              }}
                              disabled={!humanPlayer.handCards.some(
                                c => c.name === BasicCardName.ATTACK ||
                                  c.name === BasicCardName.THUNDER_ATTACK ||
                                  c.name === BasicCardName.FIRE_ATTACK_CARD
                              )}
                            >
                              打出杀
                            </button>
                            <button
                              className="action-btn btn-no-response"
                              onClick={() => respondToAttack()}
                            >
                              不响应（受到1点伤害）
                            </button>
                          </div>
                        </>
                      ) : (
                        // 等待其他玩家响应
                        <div className="response-waiting">
                          等待 {gameState.players.find(p => p.id === gameState.pendingResponse?.request.targetPlayerId)?.character.name} 响应【南蛮入侵】...
                        </div>
                      )}
                    </>
                  ) : gameState.pendingResponse.request.responseType === ResponseType.DODGE &&
                    (gameState.pendingResponse.request.cardName === '万箭齐发' ||
                      gameState.pendingResponse.multiTargetQueue) ? (
                    // 万箭齐发响应阶段（需要打出闪）
                    <>
                      {gameState.pendingResponse.request.targetPlayerId === humanPlayer.id ? (
                        // 当前玩家需要响应
                        <>
                          <div className="response-info">
                            <span className="response-attacker">
                              {gameState.players.find(p => p.id === gameState.pendingResponse?.request.sourcePlayerId)?.character.name}
                            </span>
                            使用了【万箭齐发】
                          </div>
                          <div className="response-hint">
                            请打出一张【闪】进行响应，否则受到1点伤害
                          </div>
                          <div className="response-buttons">
                            <button
                              className="action-btn btn-response"
                              onClick={() => {
                                // 查找手牌中的闪
                                const dodgeCard = humanPlayer.handCards.find(
                                  c => c.name === BasicCardName.DODGE
                                );
                                if (dodgeCard) {
                                  respondToAttack(dodgeCard.id);
                                }
                              }}
                              disabled={!humanPlayer.handCards.some(c => c.name === BasicCardName.DODGE)}
                            >
                              打出闪
                            </button>
                            <button
                              className="action-btn btn-no-response"
                              onClick={() => respondToAttack()}
                            >
                              不响应（受到1点伤害）
                            </button>
                          </div>
                        </>
                      ) : (
                        // 等待其他玩家响应
                        <div className="response-waiting">
                          等待 {gameState.players.find(p => p.id === gameState.pendingResponse?.request.targetPlayerId)?.character.name} 响应【万箭齐发】...
                        </div>
                      )}
                    </>
                  ) : gameState.pendingResponse.request.targetPlayerId === humanPlayer.id ? (
                    // 普通响应阶段（闪）- 针对杀
                    gameState.pendingResponse.request.sourcePlayerId !== humanPlayer.id ? (
                      // 当前玩家是被攻击目标，需要响应
                      <>
                        <div className="response-info">
                          <span className="response-attacker">
                            {gameState.players.find(p => p.id === gameState.pendingResponse?.request.sourcePlayerId)?.character.name}
                          </span>
                          对
                          <span className="response-target">
                            {humanPlayer.character.name}
                          </span>
                          使用了【{gameState.pendingResponse.request.cardName}】，请打出【闪】
                        </div>
                        <div className="response-buttons">
                          <button
                            className="action-btn btn-confirm"
                            onClick={() => {
                              if (selectedResponseCard) {
                                respondToAttack(selectedResponseCard);
                                setSelectedResponseCard(null);
                              }
                            }}
                            disabled={!selectedResponseCard}
                          >
                            确定
                          </button>
                          <button
                            className="action-btn btn-cancel"
                            onClick={() => {
                              setSelectedResponseCard(null);
                              respondToAttack();
                            }}
                          >
                            取消
                          </button>
                        </div>
                      </>
                    ) : (
                      // 攻击者等待目标响应
                      <div className="response-waiting">
                        等待 {gameState.players.find(p => p.id === gameState.pendingResponse?.request.targetPlayerId)?.character.name} 响应...
                      </div>
                    )
                  ) : (
                    <div className="response-waiting">
                      等待 {gameState.players.find(p => p.id === gameState.pendingResponse?.request.targetPlayerId)?.character.name} 响应...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 游戏日志 */}
        <div className="game-log">
          <div className="log-title">游戏记录</div>
          <div className="log-content">
            {logs.map((log, index) => (
              <div key={index} className="log-entry">{log}</div>
            ))}
          </div>
        </div>

        {/* 游戏结束 */}
        {gameState.phase === GamePhase.GAME_OVER && gameState.winner && (
          <div className="game-over">
            <div className="game-over-title">游戏结束</div>
            <div className="game-over-winner">{getWinnerText(gameState.winner)}</div>
          </div>
        )}

        {/* 卡牌使用动画 */}
        {cardAnimation && linePosition && (
          <div className="card-animation-container">
            <svg className="card-animation-svg" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="50%" stopColor="#ff6b6b" />
                  <stop offset="100%" stopColor="#ffd700" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 发光线条 - 统一使用长距离样式，都有箭头，线条更细 */}
              {(() => {
                return (
                  <>
                    {/* 发光背景线 - 更细 */}
                    <line
                      x1={linePosition.start.x}
                      y1={linePosition.start.y}
                      x2={linePosition.end.x}
                      y2={linePosition.end.y}
                      stroke="#ff6b6b"
                      strokeWidth="6"
                      strokeLinecap="round"
                      opacity="0.3"
                      className="card-animation-line-glow-bg"
                    />
                    <line
                      x1={linePosition.start.x}
                      y1={linePosition.start.y}
                      x2={linePosition.end.x}
                      y2={linePosition.end.y}
                      stroke="url(#lineGradient)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      filter="url(#glow)"
                      className="card-animation-line"
                    />
                  </>
                );
              })()}

              {/* 箭头 - 计算角度指向目标，统一使用长距离样式 */}
              {(() => {
                const dx = linePosition.end.x - linePosition.start.x;
                const dy = linePosition.end.y - linePosition.start.y;
                const angle = Math.atan2(dy, dx);
                const arrowLength = 15;
                const arrowWidth = 8;

                // 箭头尖端在终点，向后延伸
                const tipX = linePosition.end.x;
                const tipY = linePosition.end.y;
                const baseX = tipX - arrowLength * Math.cos(angle);
                const baseY = tipY - arrowLength * Math.sin(angle);
                const leftX = baseX + arrowWidth * Math.sin(angle);
                const leftY = baseY - arrowWidth * Math.cos(angle);
                const rightX = baseX - arrowWidth * Math.sin(angle);
                const rightY = baseY + arrowWidth * Math.cos(angle);

                return (
                  <polygon
                    points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
                    fill="#ffd700"
                    filter="url(#glow)"
                    className="card-animation-arrow"
                  />
                );
              })()}
            </svg>

            {/* 卡牌名称标签 - 使用HTML而不是SVG text */}
            <div
              className="card-animation-label"
              style={{
                position: 'absolute',
                left: `${(linePosition.start.x + linePosition.end.x) / 2}px`,
                top: `${(linePosition.start.y + linePosition.end.y) / 2 - 20}px`,
                transform: 'translateX(-50%)',
              }}
            >
              【{cardAnimation.cardName}】
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
