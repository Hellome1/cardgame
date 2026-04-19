import React from 'react';
import { Card as CardType, CardType as CardTypeEnum, CardColor } from '../../types/game';
import './Card.css';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  showDescription?: boolean;
}

export const Card: React.FC<CardProps> = ({
  card,
  isSelected = false,
  isDisabled = false,
  onClick,
  showDescription = false,
}) => {
  const getCardTypeClass = () => {
    // 根据卡牌名称返回特殊样式
    if (card.name === '雷杀') {
      return 'card-type-thunder';
    }
    if (card.name === '火杀') {
      return 'card-type-fire';
    }
    if (card.name === '无懈可击') {
      return 'card-type-nullification';
    }
    switch (card.type) {
      case CardTypeEnum.BASIC:
        return 'card-type-basic';
      case CardTypeEnum.SPELL:
        return 'card-type-spell';
      case CardTypeEnum.EQUIPMENT:
        return 'card-type-equipment';
      default:
        return '';
    }
  };

  const getSuitClass = () => {
    return card.color === CardColor.RED ? 'red' : 'black';
  };

  const getTypeLabel = () => {
    switch (card.type) {
      case CardTypeEnum.BASIC:
        return '基本';
      case CardTypeEnum.SPELL:
        return '锦囊';
      case CardTypeEnum.EQUIPMENT:
        return '装备';
      default:
        return '';
    }
  };

  return (
    <div
      className={`card ${getCardTypeClass()} ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={!isDisabled ? onClick : undefined}
    >
      <div className="card-header">
        <div className="card-suit-section">
          <span className={`card-suit ${getSuitClass()}`}>{card.suit}</span>
          <span className="card-suit-name">{card.name}</span>
        </div>
        <span className="card-number">{card.number}</span>
      </div>
      <div className="card-body">
        <span className="card-name">{card.name}</span>
      </div>
      {showDescription && (
        <div className="card-footer">
          {getTypeLabel()}
        </div>
      )}
    </div>
  );
};
