import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card } from '../Card/Card';
import { PlayerAvatar } from '../PlayerAvatar/PlayerAvatar';
import { GamePhase, Identity, CardType, SpellCardName, BasicCardName } from '../../types/game';
import { DistanceCalculator } from '../../game/DistanceCalculator';
import './GameBoard.css';

// 卡牌使用动画信息
interface CardAnimation {
  sourcePlayerId: string;
  targetPlayerId: string;
  cardName: string;
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
  } = useGameStore();

  // 用于强制刷新UI的状态
  const [, forceUpdate] = useState({});
  
  // 错误提示状态
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // 卡牌使用动画状态
  const [cardAnimation, setCardAnimation] = useState<CardAnimation | null>(null);
  const [linePosition, setLinePosition] = useState<{start: {x: number, y: number}, end: {x: number, y: number}} | null>(null);
  
  // 玩家头像DOM引用
  const playerRefs = useRef<Map<string, HTMLElement>>(new Map());
  
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
  }, []);

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
  
  useEffect(() => {
    if (!isGameStarted || hasAddedListener.current) return;
    
    const engine = useGameStore.getState().engine;
    if (!engine) return;
    
    hasAddedListener.current = true;
    
    const handleAction = (action: any) => {
      // 只处理出牌动作且有目标的情况，且action中包含cardName
      if (action.action === 'PLAY_CARD' && action.targetIds && action.targetIds.length > 0 && action.cardName) {
        // 触发动画
        setCardAnimation({
          sourcePlayerId: action.playerId,
          targetPlayerId: action.targetIds[0],
          cardName: action.cardName,
          timestamp: Date.now(),
        });
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

  if (!isGameStarted) {
    return (
      <div className="start-screen">
        <h1 className="start-title">三国卡牌</h1>
        <button className="start-btn" onClick={startGame}>
          开始游戏
        </button>
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
    // 响应阶段（被杀时打出闪）
    if (gameState.phase === GamePhase.RESPONSE) {
      const pendingResponse = gameState.pendingResponse;
      if (pendingResponse && pendingResponse.request.targetPlayerId === humanPlayer.id) {
        // 检查点击的是不是闪
        const card = humanPlayer.handCards.find(c => c.id === cardId);
        if (card && card.name === BasicCardName.DODGE) {
          respondToAttack(cardId);
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
    // 弃牌阶段
    else if (gameState.phase === GamePhase.DISCARD) {
      if (discardInfo && discardInfo.cardsToDiscard > 0) {
        discardCard(cardId);
      }
    }
  };

  // 检查是否可以选择某个玩家作为目标
  const canSelectTarget = (targetPlayer: typeof humanPlayer): boolean => {
    if (!isHumanTurn || gameState.phase !== GamePhase.PLAY) return false;
    if (targetPlayer.id === humanPlayer.id) return false; // 不能选择自己
    if (!selectedCardId) return false; // 没有选牌时不能选目标
    
    const selectedCard = humanPlayer.handCards.find(c => c.id === selectedCardId);
    if (!selectedCard) return false;
    
    // 根据卡牌类型检查距离
    if (selectedCard.type === CardType.BASIC && selectedCard.name === BasicCardName.ATTACK) {
      // 杀：检查攻击范围
      return DistanceCalculator.canAttack(humanPlayer, targetPlayer, gameState.players);
    }
    
    if (selectedCard.type === CardType.SPELL) {
      if (selectedCard.name === SpellCardName.STEAL) {
        // 顺手牵羊：距离限制为1
        const distance = DistanceCalculator.calculateDistance(humanPlayer, targetPlayer, gameState.players);
        return distance <= 1;
      }
      // 过河拆桥、决斗、火攻等没有距离限制
      return true;
    }
    
    return true;
  };

  const handlePlayerClick = (playerId: string) => {
    if (!isHumanTurn || gameState.phase !== GamePhase.PLAY) return;
    if (playerId === humanPlayer.id) return; // 不能选择自己
    
    const targetPlayer = gameState.players.find(p => p.id === playerId);
    if (!targetPlayer) return;
    
    // 检查是否可以选择该目标
    if (!canSelectTarget(targetPlayer)) {
      const selectedCard = humanPlayer.handCards.find(c => c.id === selectedCardId);
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
    
    // 获取当前选中的卡牌
    const selectedCard = humanPlayer.handCards.find(c => c.id === selectedCardId);
    
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

    // 检查是否是"杀"卡牌
    if (card.type === CardType.BASIC && card.name === BasicCardName.ATTACK) {
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
      <div className="game-header">
        <div className="game-title">三国卡牌</div>
        <div className="game-info">
          <span>第 {gameState.round} 轮</span>
          <span className="game-phase">{getPhaseText(gameState.phase)}</span>
          <span className="current-player">当前回合: {currentPlayer.character.name}</span>
          <span>牌堆: {gameState.deck.length} 张</span>
          <span>弃牌: {gameState.discardPile.length} 张</span>
        </div>
      </div>

      <div className="game-main">
      {/* 对手区域 */}
        <div className="opponents-area">
          {opponents.map((player, index) => (
            <PlayerAvatar
              key={player.id}
              player={player}
              isCurrentTurn={gameState.currentPlayerIndex === index + 1}
              isSelected={selectedTargetIds.includes(player.id)}
              isHuman={false}
              showIdentity={player.isDead || gameState.phase === GamePhase.GAME_OVER}
              isLord={lordPlayer?.id === player.id}
              isSelectable={canSelectTarget(player)}
              onClick={() => handlePlayerClick(player.id)}
              setRef={setPlayerRef(player.id)}
            />
          ))}
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
          <PlayerAvatar
            player={humanPlayer}
            isCurrentTurn={isHumanTurn}
            isSelected={false}
            isHuman={true}
            showIdentity={true}
            isLord={lordPlayer?.id === humanPlayer.id}
            setRef={setPlayerRef(humanPlayer.id)}
          />
          
          <div className="hand-cards">
            {humanPlayer.handCards.map(card => {
              // 判断卡牌是否可点击
              const isPlayPhase = gameState.phase === GamePhase.PLAY;
              const isDiscardPhase = gameState.phase === GamePhase.DISCARD;
              const isResponsePhase = gameState.phase === GamePhase.RESPONSE;
              
              // 响应阶段：只有闪可以点击
              const isResponseCard = isResponsePhase && card.name === BasicCardName.DODGE;
              
              // 出牌阶段：检查卡牌是否可用（攻击范围、使用次数等）
              const isPlayable = isCardPlayable(card);
              const isClickable = isHumanTurn && (isPlayable || (isDiscardPhase && discardInfo && discardInfo.cardsToDiscard > 0)) || isResponseCard;
              
              return (
                <Card
                  key={card.id}
                  card={card}
                  isSelected={selectedCardId === card.id && isPlayPhase}
                  isDisabled={!isClickable}
                  onClick={() => handleCardClick(card.id)}
                  showDescription={true}
                />
              );
            })}
          </div>

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

          {/* 响应阶段提示（被杀时） */}
          {gameState.phase === GamePhase.RESPONSE && gameState.pendingResponse && (
            <div className="response-panel">
              {gameState.pendingResponse.request.targetPlayerId === humanPlayer.id ? (
                <>
                  <div className="response-info">
                    <span className="response-attacker">
                      {gameState.players.find(p => p.id === gameState.pendingResponse?.request.sourcePlayerId)?.character.name}
                    </span>
                    对你使用了【杀】
                  </div>
                  <div className="response-hint">
                    点击【闪】进行响应，或直接点击"不响应"受到伤害
                  </div>
                  <button
                    className="action-btn btn-no-response"
                    onClick={() => respondToAttack()}
                  >
                    不响应（受到1点伤害）
                  </button>
                </>
              ) : (
                <div className="response-waiting">
                  等待 {gameState.players.find(p => p.id === gameState.pendingResponse?.request.targetPlayerId)?.character.name} 响应...
                </div>
              )}
            </div>
          )}

          {/* 弃牌阶段提示 */}
          {discardInfo && discardInfo.cardsToDiscard > 0 && (
            <div className="discard-panel">
              <div className="discard-info">
                弃牌阶段：需要弃置 <span className="discard-count">{discardInfo.cardsToDiscard}</span> 张牌
                （手牌上限为体力值 {discardInfo.maxCards}）
              </div>
              <div className="discard-hint">点击手牌选择要弃置的牌</div>
            </div>
          )}
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
          <button className="start-btn" onClick={() => window.location.reload()}>
            再来一局
          </button>
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
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* 发光线条 */}
            <line
              x1={linePosition.start.x}
              y1={linePosition.start.y}
              x2={linePosition.end.x}
              y2={linePosition.end.y}
              stroke="url(#lineGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#glow)"
              className="card-animation-line"
            />
            
            {/* 箭头 */}
            <polygon
              points={`
                ${linePosition.end.x},${linePosition.end.y}
                ${linePosition.end.x - 15},${linePosition.end.y - 8}
                ${linePosition.end.x - 15},${linePosition.end.y + 8}
              `}
              fill="#ffd700"
              filter="url(#glow)"
              className="card-animation-arrow"
            />
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
  );
};
