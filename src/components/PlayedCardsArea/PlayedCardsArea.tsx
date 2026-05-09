import React from 'react';
import { Card } from '../Card/Card';
import { Card as GameCard } from '../../types/game';
import './PlayedCardsArea.css';

// 出牌显示信息
export interface PlayedCardInfo {
  id: string;
  card: GameCard;
  playerName: string;
  targetName?: string;
  timestamp: number;
  isFireAttackShown?: boolean; // 是否为火攻展示牌
  isStolenCard?: boolean; // 是否为被偷的牌（用于反馈等技能动画）
}

interface PlayedCardsAreaProps {
  playedCards: PlayedCardInfo[];
  maxDisplayCount?: number; // 最多显示的牌数，默认5张
  cardSpacing?: number; // 卡片间距（像素），默认90
}

/**
 * 出牌显示区域组件
 * 用于显示玩家出牌信息，支持普通出牌和火攻展示牌
 */
export const PlayedCardsArea: React.FC<PlayedCardsAreaProps> = ({
  playedCards,
  maxDisplayCount = 5,
  cardSpacing = 90,
}) => {
  // 过滤出普通出牌（非火攻展示牌）
  const normalCards = playedCards.filter(item => !item.isFireAttackShown);
  
  // 过滤出火攻展示牌
  const fireAttackCards = playedCards.filter(item => item.isFireAttackShown);

  return (
    <>
      {/* 普通出牌显示区域 */}
      <div className="played-cards-area">
        {normalCards.slice(0, maxDisplayCount).map((item, index) => (
          <div
            key={item.id}
            className="played-card-item"
            style={{
              transform: `translateX(${index * cardSpacing}px)`,
              zIndex: normalCards.length - index,
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
      {fireAttackCards.map((item) => (
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
    </>
  );
};

export default PlayedCardsArea;
