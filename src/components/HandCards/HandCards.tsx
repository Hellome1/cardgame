import React, { useMemo, useRef, useEffect, useState } from 'react';
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
  selectedDyingCard: string | null;
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
  selectedDyingCard,
  discardInfo,
  pendingResponse,
  isCardPlayable,
  onCardClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const cardWidth = 120; // 单张牌宽度（与Card组件一致）
  const defaultGap = 10; // 默认间隙（不堆叠）

  // 动态获取容器宽度
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setContainerWidth(width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 计算每张牌的偏移量
  const cardPositions = useMemo(() => {
    const totalCards = cards.length;
    if (totalCards === 0) return [];

    if (totalCards === 1) {
      return [{ offset: 0, isStacked: false, zIndex: 0 }];
    }

    // 计算手牌使用默认间隙时的总宽度
    const totalWidthWithDefaultGap = totalCards * cardWidth + (totalCards - 1) * defaultGap;

    // 情况1：使用默认间隙不会溢出 - 保持原有间隙，不堆叠
    if (totalWidthWithDefaultGap <= containerWidth) {
      return cards.map((_, index) => ({
        offset: index * (cardWidth + defaultGap),
        isStacked: false,
        zIndex: index,
      }));
    }

    // 情况2：使用默认间隙会溢出 - 需要缩小间隙（产生堆叠效果）
    // 计算需要的间隙，使最后一张牌的右边缘恰好对齐容器右边缘
    // 总宽度 = n * cardWidth + (n-1) * gap = containerWidth
    // 所以 gap = (containerWidth - n * cardWidth) / (n - 1)
    const dynamicGap = (containerWidth - totalCards * cardWidth) / (totalCards - 1);

    // 限制最小间隙，避免卡牌过度重叠
    const minGap = -100; // 最大堆叠程度（负值表示重叠）
    const clampedGap = Math.max(dynamicGap, minGap);

    return cards.map((_, index) => ({
      offset: index * (cardWidth + clampedGap),
      isStacked: true, // 标记为堆叠状态
      zIndex: index,
    }));
  }, [cards, containerWidth]);

  const isPlayPhase = gamePhase === GamePhase.PLAY;
  const isDiscardPhase = gamePhase === GamePhase.DISCARD;
  const isResponsePhase = gamePhase === GamePhase.RESPONSE;
  const isDyingPhase = gamePhase === GamePhase.DYING;

  // 决斗阶段使用 duelState.currentTurnId 判断
  const isDuel = pendingResponse?.request.responseType === 'duel';
  const currentTurnId = isDuel && pendingResponse?.duelState
    ? pendingResponse.duelState.currentTurnId
    : pendingResponse?.request.targetPlayerId;
  const isResponseTarget = pendingResponse && currentTurnId === humanPlayer.id;

  return (
    <div className="hand-cards-container" ref={containerRef}>
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

        // 火攻响应阶段：只能选择与展示牌同花色的手牌
        const isFireAttackResponse = isResponsePhase &&
          pendingResponse?.request.responseType === 'fire_attack' &&
          pendingResponse.request.targetPlayerId === humanPlayer.id &&
          pendingResponse.fireAttackState &&
          card.suit === pendingResponse.fireAttackState.shownCard.suit;

        const isResponseCard = isDodgeResponse || isDuelResponse || isAttackResponse || isNullifyResponse || isFireAttackResponse;

        // 濒死阶段：只能选择桃或酒
        const isDyingCard = isDyingPhase &&
          (card.name === '桃' || card.name === '酒');

        // 出牌阶段：检查卡牌是否可用（攻击范围、使用次数等）
        const isPlayable = isCardPlayable(card);
        const isClickable = isHumanTurn && (isPlayable || (isDiscardPhase && discardInfo && discardInfo.cardsToDiscard > 0)) || isResponseCard || isDyingCard;

        // 弃牌阶段选中状态
        const isDiscardSelected = isDiscardPhase && selectedDiscardCards.includes(card.id);

        // 响应阶段选中状态
        const isResponseSelected = isResponsePhase && selectedResponseCard === card.id;

        // 濒死阶段选中状态
        const isDyingSelected = isDyingPhase && selectedDyingCard === card.id;

        const isSelected = (selectedCardId === card.id && isPlayPhase) || isDiscardSelected || isResponseSelected || isDyingSelected;

        return (
          <div
            key={card.id}
            className={`hand-card-wrapper ${position.isStacked ? 'stacked' : ''} ${isSelected ? 'selected' : ''}`}
            style={{
              left: position.offset,
              zIndex: position.zIndex,
            }}
            data-selected={isSelected}
          >
            <Card
              card={card}
              isSelected={isSelected}
              isDisabled={!isClickable}
              onClick={() => onCardClick(card.id)}
              showDescription={true}
            />
          </div>
        );
      })}
    </div>
  );
};
