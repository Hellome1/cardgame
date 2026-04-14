import React, { useMemo } from 'react';
import { Card as CardType, GamePhase, Player, PendingResponse } from '../../types/game';
import { Card } from '../Card/Card';
import './HandCards.css';

interface HandCardsProps {
  cards: CardType[];
  gamePhase: GamePhase;
  isHumanTurn: boolean;
  humanPlayer: Player;
  selectedCardId: string | null;
  selectedDiscardCards: string[];
  selectedResponseCard: string | null;
  discardInfo: { maxCards: number; cardsToDiscard: number } | null;
  pendingResponse: PendingResponse | undefined;
  isCardPlayable: (card: CardType) => boolean;
  onCardClick: (cardId: string) => void;
}

// 检查卡牌是否是有效的响应牌
const isValidResponseCard = (card: CardType, responseType: string): boolean => {
  switch (responseType) {
    case 'dodge':
      return card.name === '闪';
    case 'attack':
    case 'duel':
      return card.name === '杀' || card.name === '雷杀' || card.name === '火杀';
    case 'nullify':
      return card.name === '无懈可击';
    default:
      return false;
  }
};

export const HandCards: React.FC<HandCardsProps> = ({
  cards,
  gamePhase,
  isHumanTurn,
  humanPlayer,
  selectedCardId,
  selectedDiscardCards,
  selectedResponseCard,
  discardInfo,
  pendingResponse,
  isCardPlayable,
  onCardClick,
}) => {
  const containerWidth = 800; // 手牌区域宽度
  const cardWidth = 120; // 单张牌宽度
  const defaultGap = 5; // 默认正数间隙

  // 计算每张牌的偏移量 - 每次手牌变化都会重新计算
  const cardPositions = useMemo(() => {
    const totalCards = cards.length;
    if (totalCards === 0) return [];

    if (totalCards === 1) {
      return [{ offset: 0, isStacked: false, zIndex: 0 }];
    }

    // 先计算使用默认间隙时的总宽度
    const totalWidthWithDefaultGap = totalCards * cardWidth + (totalCards - 1) * defaultGap;

    // 如果使用默认间隙能放下，使用默认间隙
    if (totalWidthWithDefaultGap <= containerWidth) {
      return cards.map((_, index) => ({
        offset: index * (cardWidth + defaultGap),
        isStacked: false,
        zIndex: index,
      }));
    }

    // 放不下，重新计算间隙（间隙可以为负数，即重叠）
    // 让所有牌刚好能放入容器
    // containerWidth = totalCards * cardWidth + (totalCards - 1) * gap
    // gap = (containerWidth - totalCards * cardWidth) / (totalCards - 1)
    const dynamicGap = (containerWidth - totalCards * cardWidth) / (totalCards - 1);

    return cards.map((_, index) => ({
      offset: index * (cardWidth + dynamicGap),
      isStacked: true,
      zIndex: index,
    }));
  }, [cards]); // 依赖 cards，每次手牌变化都会重新计算

  const isPlayPhase = gamePhase === GamePhase.PLAY;
  const isDiscardPhase = gamePhase === GamePhase.DISCARD;
  const isResponsePhase = gamePhase === GamePhase.RESPONSE;

  // 决斗阶段使用 duelState.currentTurnId 判断
  const isDuel = pendingResponse?.request.responseType === 'duel';
  const currentTurnId = isDuel && pendingResponse?.duelState
    ? pendingResponse.duelState.currentTurnId
    : pendingResponse?.request.targetPlayerId;
  const isResponseTarget = pendingResponse && currentTurnId === humanPlayer.id;

  return (
    <div className="hand-cards-container" style={{ width: containerWidth }}>
      {cards.map((card, index) => {
        const position = cardPositions[index];
        if (!position) return null;

        // 判断卡牌是否可点击
        // 普通响应（闪）- 针对杀
        const isDodgeResponse = isResponsePhase &&
          pendingResponse?.request.responseType === 'dodge' &&
          isValidResponseCard(card, 'dodge') &&
          isResponseTarget &&
          pendingResponse.request.sourcePlayerId !== humanPlayer.id;

        // 决斗响应（杀）- 双方都可以出杀
        const isDuelResponse = isResponsePhase &&
          pendingResponse?.request.responseType === 'duel' &&
          isValidResponseCard(card, 'duel') &&
          isResponseTarget;

        // 南蛮入侵响应（杀）
        const isAttackResponse = isResponsePhase &&
          pendingResponse?.request.responseType === 'attack' &&
          isValidResponseCard(card, 'attack') &&
          isResponseTarget;

        // 无懈可击响应
        const isNullifyResponse = isResponsePhase &&
          pendingResponse?.request.responseType === 'nullify' &&
          isValidResponseCard(card, 'nullify') &&
          pendingResponse.request.sourcePlayerId !== humanPlayer.id;

        const isResponseCard = isDodgeResponse || isDuelResponse || isAttackResponse || isNullifyResponse;

        // 出牌阶段：检查卡牌是否可用（攻击范围、使用次数等）
        const isPlayable = isCardPlayable(card);
        const isClickable = isHumanTurn && (isPlayable || (isDiscardPhase && discardInfo && discardInfo.cardsToDiscard > 0)) || isResponseCard;

        // 弃牌阶段选中状态
        const isDiscardSelected = isDiscardPhase && selectedDiscardCards.includes(card.id);

        // 响应阶段选中状态
        const isResponseSelected = isResponsePhase && selectedResponseCard === card.id;

        const isSelected = (selectedCardId === card.id && isPlayPhase) || isDiscardSelected || isResponseSelected;

        return (
          <div
            key={card.id}
            className={`hand-card-wrapper ${position.isStacked ? 'stacked' : ''} ${isSelected ? 'selected' : ''}`}
            style={{
              left: position.offset,
              zIndex: isSelected ? 100 : position.zIndex,
            }}
          >
            <Card
              card={card}
              isSelected={isSelected}
              isDisabled={!isClickable}
              onClick={() => onCardClick(card.id)}
              showDescription={true}
            />
            {/* 堆叠时显示小号牌名 */}
            {position.isStacked && (
              <div className="stacked-card-name">
                {card.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
