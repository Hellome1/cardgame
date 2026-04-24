import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card } from '../Card/Card';
import { PlayerAvatar } from '../PlayerAvatar/PlayerAvatar';
import { HandCards } from '../HandCards/HandCards';
import { DebugSetup, DebugConfig } from '../DebugSetup/DebugSetup';
import { GamePhase, Identity, CardType, CardSuit, CardColor, SpellCardName, BasicCardName, ResponseType, Card as GameCard, PendingResponse } from '../../types/game';
import { DistanceCalculator } from '../../game/DistanceCalculator';
import './GameBoard.css';

// 模块级别的标志，确保只清空一次日志
// @ts-ignore - 保留以备后续使用
let hasAutoClearedLogs = false;

// 卡牌使用动画信息
interface CardAnimation {
  sourcePlayerId: string;
  targetPlayerIds: string[];  // 支持多目标
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
  isFireAttackShown?: boolean; // 是否为火攻展示牌
  isStolenCard?: boolean; // 是否为被偷的牌（用于反馈等技能动画）
}

// 花色显示
const suitDisplay: Record<CardSuit, string> = {
  [CardSuit.SPADE]: '♠',
  [CardSuit.HEART]: '♥',
  [CardSuit.CLUB]: '♣',
  [CardSuit.DIAMOND]: '♦',
};

// 花色颜色
const suitColors: Record<CardSuit, string> = {
  [CardSuit.SPADE]: '#000',
  [CardSuit.HEART]: '#d32f2f',
  [CardSuit.CLUB]: '#000',
  [CardSuit.DIAMOND]: '#d32f2f',
};

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
    case GamePhase.DYING:
      return '濒死阶段';
    case GamePhase.GAME_OVER:
      return '游戏结束';
    default:
      return '';
  }
};

// 检查卡牌是否是有效的响应牌
const isValidResponseCard = (card: GameCard, responseType: ResponseType, pendingResponse?: PendingResponse): boolean => {
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
    case ResponseType.FIRE_ATTACK:
      // 火攻响应：需要弃置与展示牌同花色的手牌
      if (!pendingResponse?.fireAttackState) return false;
      return card.suit === pendingResponse.fireAttackState.shownCard.suit;
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

// 渲染闪避响应（万箭齐发/普通杀）的公共组件
interface DodgeResponseProps {
  isWanJian: boolean;
  isTarget: boolean;
  attackerName: string;
  targetName: string;
  cardName: string;
  hasDodge: boolean;
  selectedResponseCard: string | null;
  onRespond: (cardId?: string) => void;
  onSelectResponseCard: (cardId: string | null) => void;
}

const DodgeResponse: React.FC<DodgeResponseProps> = ({
  isWanJian,
  isTarget,
  attackerName,
  targetName,
  cardName,
  hasDodge,
  selectedResponseCard,
  onRespond,
  onSelectResponseCard,
}) => {
  if (!isTarget) {
    return (
      <div className="response-notice-text">
        等待 {targetName} 响应{isWanJian ? '【万箭齐发】' : ''}...
      </div>
    );
  }

  return (
    <>
      <div className="response-notice-text">
        <span className="response-attacker">{attackerName}</span>
        {isWanJian ? (
          '使用了【万箭齐发】'
        ) : (
          <>
            对<span className="response-target">{targetName}</span>
            使用了【{cardName}】，请打出【闪】
          </>
        )}
      </div>
      {isWanJian && (
        <div className="response-notice-hint">
          请打出一张【闪】进行响应，否则受到1点伤害
        </div>
      )}
      <div className="response-notice-buttons">
        <button
          className="action-btn btn-confirm"
          onClick={() => {
            if (isWanJian) {
              // 万箭齐发：自动选择闪
              onRespond();
            } else {
              // 普通杀：使用选中的闪
              if (selectedResponseCard) {
                onRespond(selectedResponseCard);
                onSelectResponseCard(null);
              }
            }
          }}
          disabled={!hasDodge || (!isWanJian && !selectedResponseCard)}
        >
          {isWanJian ? '打出闪' : '确定'}
        </button>
        <button
          className="action-btn btn-cancel"
          onClick={() => {
            onSelectResponseCard(null);
            onRespond();
          }}
        >
          不响应
        </button>
      </div>
    </>
  );
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
    handleDyingResponse,
    giveUpDying,
    endGame,
    resetGame,
  } = useGameStore();

  // 用于强制刷新UI的状态
  const [, forceUpdate] = useState({});

  // 错误提示状态
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);

  // 卡牌使用动画状态
  const [cardAnimation, setCardAnimation] = useState<CardAnimation | null>(null);
  const [linePositions, setLinePositions] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } }[]>([]);

  // 出牌显示区域状态 - 支持多张牌排列
  const [playedCards, setPlayedCards] = useState<PlayedCardInfo[]>([]);

  // 手牌消失动画状态（用于反馈等技能）
  const [disappearingCards, setDisappearingCards] = useState<PlayedCardInfo[]>([]);

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

  // 濒死阶段选择状态
  const [selectedDyingCard, setSelectedDyingCard] = useState<string | null>(null);

  // 技能提示状态
  const [skillNotice, setSkillNotice] = useState<{ message: string; timestamp: number } | null>(null);

  // 判定动画状态
  const [judgeAnimation, setJudgeAnimation] = useState<{
    judgeType: string;
    judgeTypeName: string;
    judgeCard: GameCard;
    isEffective: boolean;
    playerId: string;
    timestamp: number;
  } | null>(null);

  // 调试模式状态
  const [showDebugSetup, setShowDebugSetup] = useState(false);

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

  // 计时器效果
  useEffect(() => {
    if (!isGameStarted || !gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isHumanTurn = !currentPlayer.isAI;
    const isResponsePhase = gameState.phase === GamePhase.RESPONSE;
    const isHumanResponse = isResponsePhase && gameState.pendingResponse?.request.targetPlayerId === humanPlayer.id;
    const isDyingPhase = gameState.phase === GamePhase.DYING;
    const isHumanDying = isDyingPhase && gameState.dyingState?.playerId === humanPlayer.id;

    // 只在需要玩家操作的阶段启动计时器
    if ((isHumanTurn && (gameState.phase === GamePhase.PLAY || gameState.phase === GamePhase.DISCARD)) || isHumanResponse || isHumanDying) {
      // 不同阶段不同时间限制
      let timeLimit = 15; // 出牌阶段15秒
      if (gameState.phase === GamePhase.DISCARD) {
        timeLimit = 15; // 弃牌阶段15秒
      } else if (isResponsePhase) {
        // 无懈可击响应8秒，其他响应10秒
        const isNullifyResponse = gameState.pendingResponse?.request.responseType === ResponseType.NULLIFY;
        timeLimit = isNullifyResponse ? 8 : 10;
      } else if (isDyingPhase) {
        // 濒死阶段10秒
        timeLimit = 10;
      }

      startTimer(timeLimit);

      return () => {
        stopTimer();
      };
    } else {
      stopTimer();
    }
  }, [gameState?.phase, gameState?.currentPlayerIndex, gameState?.pendingResponse, gameState?.dyingState, isGameStarted]);

  // 濒死阶段计时器超时处理
  useEffect(() => {
    if (!isGameStarted || !gameState) return;

    // 如果处于濒死阶段且计时器超时
    if (gameState.phase === GamePhase.DYING && gameState.dyingState && timeLeft === 0 && isTimerRunning) {
      const isHumanDying = gameState.dyingState.playerId === humanPlayer.id;
      if (isHumanDying) {
        console.log('濒死阶段超时，玩家未选择桃或酒自救');
        // 清空选择，相当于取消
        setSelectedDyingCard(null);
        selectCard(null);
      }
    }
  }, [timeLeft, isTimerRunning, gameState?.phase, gameState?.dyingState, isGameStarted]);

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
        // 触发动画 - 支持多目标（如南蛮入侵、万箭齐发）
        setCardAnimation({
          sourcePlayerId: action.playerId,
          targetPlayerIds: action.targetIds,  // 传递所有目标
          cardName: action.cardName,
          timestamp: Date.now(),
        });
      }

      // 显示出牌信息（包括有目标和无目标的牌，以及决斗响应）
      // 决斗时打出的杀也需要显示
      const isDuelResponse = action.isResponse && action.logMessage?.includes('决斗');
      if (action.action === 'play_card' && action.cardName && (!action.isResponse || isDuelResponse)) {
        const gameState = useGameStore.getState().gameState;
        if (gameState) {
          const player = gameState.players.find(p => p.id === action.playerId);
          const target = action.targetIds?.length > 0
            ? gameState.players.find(p => p.id === action.targetIds[0])
            : undefined;

          // 查找卡牌信息
          // 对于决斗响应，卡牌已经在弃牌堆中（因为引擎先移除卡牌再触发监听器）
          let playedCard = player?.handCards.find(c => c.id === action.cardId);
          if (!playedCard && action.cardId) {
            // 从弃牌堆中查找（按时间倒序，找最近的一张）
            playedCard = gameState.discardPile
              .slice()
              .reverse()
              .find(c => c.id === action.cardId);
          }

          // 决斗响应的特殊处理：如果找不到卡牌，创建一个临时卡牌对象
          if (!playedCard && isDuelResponse && action.cardName) {
            playedCard = {
              id: action.cardId || `duel_card_${Date.now()}`,
              name: action.cardName,
              type: 'basic' as CardType,
              suit: CardSuit.SPADE,
              number: 1,
              color: CardColor.BLACK,
              description: '决斗中打出的杀',
            } as GameCard;
          }

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

      // 处理技能动作（如司马懿的反馈）
      if (action.action === 'use_skill' && action.logMessage) {
        // 在中间提示区显示技能效果
        setSkillNotice({ message: action.logMessage, timestamp: Date.now() });

        // 3秒后清除提示
        setTimeout(() => {
          setSkillNotice(prev => {
            // 只清除当前显示的提示，如果已经被新的提示替换则不清除
            if (prev && prev.message === action.logMessage) {
              return null;
            }
            return prev;
          });
        }, 3000);
      }

      // 处理技能获得手牌（如反馈）
      if (action.action === 'skill_steal_card' && action.stolenCard && action.stolenFromPlayerId) {
        const gameState = useGameStore.getState().gameState;
        if (gameState) {
          const fromPlayer = gameState.players.find(p => p.id === action.stolenFromPlayerId);
          const toPlayer = gameState.players.find(p => p.id === action.playerId);

          if (fromPlayer && toPlayer) {
            // 创建被偷的牌的信息，用于动画显示
            const stolenCardInfo: PlayedCardInfo = {
              id: `stolen_${Date.now()}`,
              card: action.stolenCard,
              playerName: `${fromPlayer.character.name}→${toPlayer.character.name}`,
              timestamp: Date.now(),
              isStolenCard: true, // 标记为被偷的牌
            };

            // 添加到手牌消失动画列表
            setDisappearingCards(prev => [...prev, stolenCardInfo]);

            // 2秒后移除动画
            setTimeout(() => {
              setDisappearingCards(prev => prev.filter(c => c.id !== stolenCardInfo.id));
            }, 2000);
          }
        }
      }

      // 处理火攻展示牌
      if (action.action === 'play_card' && action.cardName === '火攻' && action.fireAttackShownCard) {
        const gameState = useGameStore.getState().gameState;
        if (gameState) {
          const target = gameState.players.find(p => p.id === action.targetIds?.[0]);
          if (target) {
            const shownCardInfo: PlayedCardInfo = {
              id: `fire_attack_shown_${Date.now()}`,
              card: action.fireAttackShownCard,
              playerName: `${target.character.name}展示`,
              timestamp: Date.now(),
              isFireAttackShown: true, // 标记为火攻展示牌
            };
            // 添加展示牌到列表开头
            setPlayedCards(prev => [shownCardInfo, ...prev].slice(0, 5));
            // 5秒后移除（火攻展示牌显示更久）
            setTimeout(() => {
              setPlayedCards(prev => prev.filter(c => c.id !== shownCardInfo.id));
            }, 5000);
          }
        }
      }

      // 处理判定动画（兵粮寸断、乐不思蜀、闪电）
      if (action.action === 'judge' && action.judgeCard) {
        const judgeTypeNames: Record<string, string> = {
          'supply_shortage': '兵粮寸断',
          'indulgence': '乐不思蜀',
          'lightning': '闪电',
        };
        const judgeTypeName = judgeTypeNames[action.judgeType || ''] || '判定';

        // 设置判定动画状态
        const currentTimestamp = Date.now();
        setJudgeAnimation({
          judgeType: action.judgeType || '',
          judgeTypeName,
          judgeCard: action.judgeCard,
          isEffective: action.isEffective || false,
          playerId: action.playerId,
          timestamp: currentTimestamp,
        });

        // 3秒后清除判定动画
        setTimeout(() => {
          setJudgeAnimation(prev => {
            if (prev && prev.timestamp === currentTimestamp) {
              return null;
            }
            return prev;
          });
        }, 3000);
      }
    };

    // 添加监听器
    const unsubscribe = engine.onAction(handleAction);

    // 返回清理函数
    return () => {
      unsubscribe();
    };
  }, [isGameStarted]);

  // 当cardAnimation变化时，计算位置并设置线条
  useEffect(() => {
    if (!cardAnimation) return;

    // 多次尝试获取refs，因为React可能需要几个渲染周期
    let retryCount = 0;
    const maxRetries = 10;

    const tryCalculatePosition = () => {
      const sourceEl = playerRefs.current.get(cardAnimation.sourcePlayerId);
      const boardEl = document.querySelector('.game-board') as HTMLElement;

      if (sourceEl && boardEl) {
        const sourceRect = sourceEl.getBoundingClientRect();
        const boardRect = boardEl.getBoundingClientRect();
        const sourceX = sourceRect.left + sourceRect.width / 2 - boardRect.left;
        const sourceY = sourceRect.top + sourceRect.height / 2 - boardRect.top;

        // 计算所有目标的连线位置
        const positions: { start: { x: number, y: number }, end: { x: number, y: number } }[] = [];

        for (const targetId of cardAnimation.targetPlayerIds) {
          const targetEl = playerRefs.current.get(targetId);
          if (targetEl) {
            const targetRect = targetEl.getBoundingClientRect();
            positions.push({
              start: { x: sourceX, y: sourceY },
              end: {
                x: targetRect.left + targetRect.width / 2 - boardRect.left,
                y: targetRect.top + targetRect.height / 2 - boardRect.top,
              },
            });
          }
        }

        if (positions.length > 0) {
          setLinePositions(positions);
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
      setLinePositions([]);
    }, 2500);

    return () => clearTimeout(clearTimer);
  }, [cardAnimation]);

  // 在开始界面自动清空日志并检查/删除非当日日志
  useEffect(() => {
    if (!isGameStarted) {
      // 当回到开始界面时，重置标志并清空日志
      hasAutoClearedLogs = false;
      const autoClearLogs = async () => {
        try {
          // @ts-ignore - 动态导入 Logger
          const { logger } = await import('../../utils/Logger');
          if (logger) {
            // 1. 先获取日志文件列表
            const logFilesResult = await logger.getLogFiles();
            if (logFilesResult.success) {
              console.log(`游戏开始界面：发现 ${logFilesResult.count || 0} 个日志文件`, logFilesResult.files);
            }

            // 2. 清理非当日日志
            if (typeof logger.cleanupOldLogs === 'function') {
              const cleanupResult = await logger.cleanupOldLogs();
              if (cleanupResult.success) {
                console.log(`游戏开始界面：${cleanupResult.message}`);
                if (cleanupResult.count && cleanupResult.count > 0) {
                  console.log('已删除的非当日日志文件:', cleanupResult.deleted);
                }
              } else {
                console.error('清理非当日日志失败:', cleanupResult.error);
              }
            }

            // 3. 清空当前日志内容
            if (typeof logger.clearAllLogs === 'function') {
              await logger.clearAllLogs();
              console.log('游戏开始界面：当前日志已清空');
            }
          }
        } catch (e) {
          console.error('自动清空日志失败:', e);
        }
      };
      autoClearLogs();
    }
  }, [isGameStarted]);

  // 处理调试模式开始
  const handleDebugStart = (config: DebugConfig) => {
    setShowDebugSetup(false);
    let engine = useGameStore.getState().engine;

    // 如果 engine 为 null（游戏结束后），需要先初始化
    if (!engine) {
      console.log('引擎为null，先初始化游戏');
      initGame(4, true);
      engine = useGameStore.getState().engine;
    }

    if (engine) {
      engine.startDebugGame(config);
      // 获取游戏状态并更新 store
      const gameState = engine.getState();
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      useGameStore.setState({
        isGameStarted: true,
        gameState,
        logs: [`游戏开始！${currentPlayer.character.name} 的回合`],
        attackCountThisTurn: 0,
      });
    } else {
      console.error('无法初始化游戏引擎');
    }
  };

  // 游戏未开始时显示主界面或调试界面
  if (!isGameStarted) {
    // 如果应该显示调试界面，直接显示调试界面
    if (showDebugSetup) {
      return (
        <DebugSetup
          onStartDebug={handleDebugStart}
          onCancel={() => setShowDebugSetup(false)}
        />
      );
    }

    return (
      <div className="start-screen">
        <h1 className="start-title">三国卡牌</h1>
        <div className="start-buttons">
          <button className="start-btn" onClick={() => startGame(4)}>
            开始游戏
          </button>
          <button className="debug-btn" onClick={() => setShowDebugSetup(true)}>
            调试模式
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
    // 濒死阶段（选择桃或酒）
    if (gameState.phase === GamePhase.DYING && gameState.dyingState) {
      if (gameState.dyingState.playerId === humanPlayer.id) {
        const card = humanPlayer.handCards.find(c => c.id === cardId);
        if (!card) return;

        // 只能选择桃或酒
        if (card.name === BasicCardName.PEACH || card.name === BasicCardName.WINE) {
          setSelectedDyingCard(prev => prev === cardId ? null : cardId);
        }
      }
      return;
    }

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
          if (responseType && isValidResponseCard(card, responseType, pendingResponse)) {
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

      if (selectedCard.name === SpellCardName.STEAL ||
        selectedCard.name === SpellCardName.SUPPLY_SHORTAGE ||
        selectedCard.name === SpellCardName.INDULGENCE) {
        // 顺手牵羊、兵粮寸断、乐不思蜀：距离限制为1
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

  // 处理点击游戏板其他区域放下手牌
  const handleBoardClick = (e: React.MouseEvent) => {
    // 检查点击目标是否是游戏板本身或者是game-content（即不是手牌、按钮等交互元素）
    const target = e.target as HTMLElement;
    const isHandCard = target.closest('.hand-card-wrapper') !== null;
    const isCard = target.closest('.card') !== null;
    const isButton = target.closest('button') !== null;
    const isPlayerAvatar = target.closest('.player-avatar') !== null;
    const isSkillItem = target.closest('.skill-item-left') !== null;
    const isModal = target.closest('.deck-modal-overlay') !== null;

    // 如果点击的是手牌、按钮、玩家头像、技能或弹窗，不处理
    if (isHandCard || isCard || isButton || isPlayerAvatar || isSkillItem || isModal) {
      return;
    }

    // 如果在出牌阶段且有选中的手牌，取消选择
    if (gameState.phase === GamePhase.PLAY && selectedCardId) {
      selectCard(null);
    }
  };

  return (
    <div className="game-board" onClick={handleBoardClick}>
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
          {playedCards.filter(item => !item.isFireAttackShown).map((item, index) => (
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

        {/* 火攻展示牌（单独渲染在屏幕中央） */}
        {playedCards.filter(item => item.isFireAttackShown).map((item) => (
          <div
            key={item.id}
            className="played-card-item fire-attack-shown"
          >
            <div className="played-card-wrapper fire-attack-wrapper">
              <Card
                card={item.card}
                isDisabled={true}
                showDescription={false}
              />
              <div className="played-card-label fire-attack-label">
                <span className="played-card-player">{item.playerName}</span>
              </div>
            </div>
          </div>
        ))}

        {/* 手牌消失动画区域（用于反馈等技能） */}
        <div className="disappearing-cards-area">
          {disappearingCards.map((item) => (
            <div
              key={item.id}
              className="disappearing-card-item"
              style={{
                left: '50%',
                marginLeft: '-60px',
              }}
            >
              <div className="disappearing-card-wrapper">
                <Card
                  card={item.card}
                  isDisabled={true}
                  showDescription={false}
                />
                <div className="disappearing-card-label">
                  <span className="disappearing-card-text">{item.playerName}</span>
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

          {/* 技能提示面板 - 显示技能效果（如司马懿反馈） */}
          {skillNotice && (
            <div className="skill-notice-panel">
              <div className="skill-notice-content">
                <span className="skill-notice-icon">✨</span>
                <span className="skill-notice-text">{skillNotice.message}</span>
              </div>
            </div>
          )}

          {/* 判定动画面板 - 显示延时锦囊判定 */}
          {judgeAnimation && (
            <div className="judge-animation-panel">
              <div className="judge-animation-content">
                <div className="judge-type">{judgeAnimation.judgeTypeName}</div>
                <div className="judge-card-display" style={{ color: suitColors[judgeAnimation.judgeCard.suit] }}>
                  <span className="judge-card-suit">{suitDisplay[judgeAnimation.judgeCard.suit]}</span>
                  <span className="judge-card-number">{judgeAnimation.judgeCard.number}</span>
                  <span className="judge-card-name">{judgeAnimation.judgeCard.name}</span>
                </div>
                <div className={`judge-result ${judgeAnimation.isEffective ? 'effective' : 'ineffective'}`}>
                  {judgeAnimation.isEffective ? '✓ 判定生效' : '✗ 判定未生效'}
                </div>
                <div className="judge-hint">
                  {judgeAnimation.judgeType === 'supply_shortage' && (
                    judgeAnimation.isEffective ? '跳过摸牌阶段' : '梅花判定，兵粮寸断失效'
                  )}
                  {judgeAnimation.judgeType === 'indulgence' && (
                    judgeAnimation.isEffective ? '跳过出牌阶段' : '红桃判定，乐不思蜀失效'
                  )}
                  {judgeAnimation.judgeType === 'lightning' && (
                    judgeAnimation.isEffective ? '受到3点雷电伤害' : '闪电转移给下家'
                  )}
                </div>
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
                gamePhase={gameState.phase}
              />
            </div>

            <div className="hand-cards-section">
              {/* 玩家操作区域 - 按钮和计时器 */}
              <div className="player-action-area">
                {/* 计时器 */}
                {isTimerRunning && !isPaused && (
                  <div className="timer-container">
                    <div className="timer-bar-wrapper">
                      <div className="timer-bar" style={{ width: `${(timeLeft / maxTime) * 100}%` }} />
                    </div>
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

                {/* 响应阶段提示（南蛮入侵） - 放在玩家提示区 */}
                {gameState.phase === GamePhase.RESPONSE && gameState.pendingResponse?.request.responseType === ResponseType.ATTACK && !humanPlayer.isDead && (
                  <div className="response-notice">
                    {gameState.pendingResponse.request.targetPlayerId === humanPlayer.id ? (
                      // 当前玩家需要响应
                      <>
                        <div className="response-notice-text">
                          <span className="response-attacker">
                            {gameState.players.find(p => p.id === gameState.pendingResponse?.request.sourcePlayerId)?.character.name}
                          </span>
                          使用了【南蛮入侵】
                        </div>
                        <div className="response-notice-hint">
                          请打出一张【杀】进行响应，否则受到1点伤害
                        </div>
                        <div className="response-notice-buttons">
                          <button
                            className="action-btn btn-confirm"
                            onClick={() => {
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
                            className="action-btn btn-cancel"
                            onClick={() => respondToAttack()}
                          >
                            不响应
                          </button>
                        </div>
                      </>
                    ) : (
                      // 等待其他玩家响应
                      <div className="response-notice-text">
                        等待 {gameState.players.find(p => p.id === gameState.pendingResponse?.request.targetPlayerId)?.character.name} 响应【南蛮入侵】...
                      </div>
                    )}
                  </div>
                )}

                {/* 响应阶段提示（万箭齐发/普通杀） - 放在玩家提示区 */}
                {gameState.phase === GamePhase.RESPONSE && gameState.pendingResponse?.request.responseType === ResponseType.DODGE && !humanPlayer.isDead && (
                  <div className="response-notice">
                    <DodgeResponse
                      isWanJian={gameState.pendingResponse.request.cardName === '万箭齐发'}
                      isTarget={gameState.pendingResponse.request.targetPlayerId === humanPlayer.id}
                      attackerName={gameState.players.find(p => p.id === gameState.pendingResponse?.request.sourcePlayerId)?.character.name || ''}
                      targetName={gameState.players.find(p => p.id === gameState.pendingResponse?.request.targetPlayerId)?.character.name || ''}
                      cardName={gameState.pendingResponse.request.cardName}
                      hasDodge={humanPlayer.handCards.some(c => c.name === BasicCardName.DODGE)}
                      selectedResponseCard={selectedResponseCard}
                      onRespond={respondToAttack}
                      onSelectResponseCard={setSelectedResponseCard}
                    />
                  </div>
                )}

                {/* 响应阶段提示（决斗） - 放在玩家提示区 */}
                {gameState.phase === GamePhase.RESPONSE && gameState.pendingResponse?.request.responseType === ResponseType.DUEL && !humanPlayer.isDead && (
                  <div className="response-notice">
                    {(() => {
                      const pendingResponse = gameState.pendingResponse;
                      const isDuel = pendingResponse?.request.responseType === ResponseType.DUEL;
                      const currentTurnId = isDuel && pendingResponse?.duelState
                        ? pendingResponse.duelState.currentTurnId
                        : pendingResponse?.request.targetPlayerId;
                      const isCurrentPlayerTurn = currentTurnId === humanPlayer.id;
                      const duelState = pendingResponse?.duelState;
                      const challenger = gameState.players.find(p => p.id === duelState?.challengerId);
                      const target = gameState.players.find(p => p.id === duelState?.targetId);
                      const opponent = humanPlayer.id === challenger?.id ? target : challenger;

                      return isCurrentPlayerTurn ? (
                        // 当前玩家需要出杀响应决斗
                        <>
                          <div className="response-notice-text">
                            【决斗】中，请打出一张【杀】
                          </div>
                          <div className="response-notice-hint">
                            否则受到1点伤害
                          </div>
                          <div className="response-notice-buttons">
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
                        // 等待对方响应
                        <div className="response-notice-text">
                          等待 {opponent?.character.name} 响应【决斗】...
                        </div>
                      );
                    })()}
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

              {/* 濒死阶段提示 - 体力降至0时需要使用桃或酒自救 */}
              {gameState.phase === GamePhase.DYING && gameState.dyingState && (
                <div className="dying-simple-panel">
                  {gameState.dyingState.playerId === humanPlayer.id ? (
                    // 当前玩家濒死，需要自救
                    <>
                      <div className="dying-simple-text">
                        已进入濒死状态，需要一个【桃】或【酒】来自救
                      </div>
                      <div className="dying-simple-buttons">
                        <button
                          className="dying-btn dying-btn-confirm"
                          onClick={() => {
                            if (selectedDyingCard) {
                              const card = humanPlayer.handCards.find(c => c.id === selectedDyingCard);
                              if (card) {
                                if (card.name === BasicCardName.PEACH) {
                                  handleDyingResponse('peach');
                                } else if (card.name === BasicCardName.WINE) {
                                  handleDyingResponse('wine');
                                }
                                setSelectedDyingCard(null);
                              }
                            }
                          }}
                          disabled={!selectedDyingCard}
                        >
                          确定
                        </button>
                        <button
                          className="dying-btn dying-btn-cancel"
                          onClick={() => {
                            // 放弃自救，角色死亡
                            giveUpDying();
                            setSelectedDyingCard(null);
                            selectCard(null);
                          }}
                        >
                          取消
                        </button>
                      </div>
                    </>
                  ) : (
                    // 等待其他玩家濒死自救
                    <div className="dying-simple-text">
                      等待 {gameState.players.find(p => p.id === gameState.dyingState?.playerId)?.character.name} 进行濒死自救...
                    </div>
                  )}
                </div>
              )}

              {/* 手牌区域 - 使用自适应堆叠算法 */}
              <HandCards
                cards={humanPlayer.handCards}
                gamePhase={gameState.phase}
                isHumanTurn={isHumanTurn}
                humanPlayer={humanPlayer}
                selectedCardId={selectedCardId}
                selectedDiscardCards={selectedDiscardCards}
                selectedResponseCard={selectedResponseCard}
                selectedDyingCard={selectedDyingCard}
                discardInfo={discardInfo}
                pendingResponse={gameState.pendingResponse}
                isCardPlayable={isCardPlayable}
                onCardClick={handleCardClick}
              />
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
            <div className="game-over-menu">
              <button
                className="game-over-btn game-over-btn-primary"
                onClick={() => endGame()}
              >
                回到主界面
              </button>
              <button
                className="game-over-btn game-over-btn-secondary"
                onClick={() => {
                  endGame();
                  setShowDebugSetup(true);
                }}
              >
                调试模式重新开始
              </button>
            </div>
          </div>
        )}

        {/* 卡牌使用动画 */}
        {cardAnimation && linePositions.length > 0 && (
          <div className="card-animation-container">
            <svg className="card-animation-svg" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="50%" stopColor="#ff6b6b" />
                  <stop offset="100%" stopColor="#ffd700" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 多条发光线条 - 支持多目标（如南蛮入侵、万箭齐发） */}
              {linePositions.map((pos, index) => (
                <g key={index}>
                  {/* 发光背景线 - 更细 */}
                  <line
                    x1={pos.start.x}
                    y1={pos.start.y}
                    x2={pos.end.x}
                    y2={pos.end.y}
                    stroke="#ff6b6b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.3"
                    className="card-animation-line-glow-bg"
                  />
                  <line
                    x1={pos.start.x}
                    y1={pos.start.y}
                    x2={pos.end.x}
                    y2={pos.end.y}
                    stroke="url(#lineGradient)"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    filter="url(#glow)"
                    className="card-animation-line"
                  />

                  {/* 箭头 - 计算角度指向目标 */}
                  {(() => {
                    const dx = pos.end.x - pos.start.x;
                    const dy = pos.end.y - pos.start.y;
                    const angle = Math.atan2(dy, dx);
                    const arrowLength = 12;
                    const arrowWidth = 6;

                    // 箭头尖端在终点，向后延伸
                    const tipX = pos.end.x;
                    const tipY = pos.end.y;
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
                </g>
              ))}
            </svg>

            {/* 卡牌名称标签 - 显示在第一条线的中间位置 */}
            {linePositions.length > 0 && (
              <div
                className="card-animation-label"
                style={{
                  position: 'absolute',
                  left: `${(linePositions[0].start.x + linePositions[0].end.x) / 2}px`,
                  top: `${(linePositions[0].start.y + linePositions[0].end.y) / 2 - 20}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                【{cardAnimation.cardName}】
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
