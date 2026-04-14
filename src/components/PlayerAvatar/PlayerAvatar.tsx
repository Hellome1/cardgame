import React from 'react';
import { Player, Identity } from '../../types/game';
import './PlayerAvatar.css';

interface PlayerAvatarProps {
  player: Player;
  isCurrentTurn: boolean;
  isSelected: boolean;
  isHuman: boolean;
  showIdentity: boolean;
  isLord?: boolean;
  isSelectable?: boolean;
  isUnselectable?: boolean;  // 当需要选择目标但不可选时（如距离不够）
  onClick?: () => void;
  setRef?: (el: HTMLElement | null) => void;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  isCurrentTurn,
  isSelected,
  isHuman,
  showIdentity,
  isLord = false,
  isSelectable = false,
  isUnselectable = false,
  onClick,
  setRef,
}) => {
  const getIdentityText = (identity: Identity) => {
    switch (identity) {
      case Identity.LORD:
        return '主公';
      case Identity.LOYALIST:
        return '忠臣';
      case Identity.REBEL:
        return '反贼';
      case Identity.TRAITOR:
        return '内奸';
      default:
        return '未知';
    }
  };

  const getIdentityClass = (identity: Identity) => {
    switch (identity) {
      case Identity.LORD:
        return 'identity-lord';
      case Identity.LOYALIST:
        return 'identity-loyalist';
      case Identity.REBEL:
        return 'identity-rebel';
      case Identity.TRAITOR:
        return 'identity-traitor';
      default:
        return '';
    }
  };

  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < player.character.maxHp; i++) {
      hearts.push(
        <span key={i} className={`hp-heart ${i >= player.character.hp ? 'lost' : ''}`}>
          ♥
        </span>
      );
    }
    return hearts;
  };

  return (
    <div
      ref={setRef}
      className={`player-avatar${isCurrentTurn ? ' current-turn' : ''}${isSelected ? ' selected' : ''}${player.isDead ? ' dead' : ''}${isHuman ? ' human' : ''}${isSelectable ? ' selectable' : ''}${isUnselectable ? ' unselectable' : ''}`}
      onClick={onClick}
    >
      {/* 左上角 - 武将名称（纵向排列） */}
      <div className="player-name-vertical">
        {player.character.name}
      </div>

      {/* 中央区域 - 头像和手牌（在整个武将牌中居中） */}
      <div className="player-center-content">
        <div className={`avatar-image ${isLord ? 'lord-avatar' : ''}`}>
          {player.character.name[0]}
        </div>
        <div className="player-cards">手牌: {player.handCards.length}</div>
      </div>

      {/* 右侧边栏 - 身份和血条 */}
      <div className="player-sidebar">
        {showIdentity && (
          <div className={`player-identity-vertical ${getIdentityClass(player.identity)}`}>
            {getIdentityText(player.identity)}
          </div>
        )}
        <div className="player-hp-vertical">{renderHearts()}</div>
      </div>

      {/* 装备区 - 三排：武器、防具、马匹 */}
      <div className="player-equipment">
        <div className="equipment-slot">
          {player.equipment.weapon ? (
            <div className="equipment-item weapon" title={player.equipment.weapon.description}>
              <span className="equipment-icon">⚔️</span>
              <span className="equipment-name">{player.equipment.weapon.name}</span>
              <span className="equipment-range">[{player.equipment.weapon.range}]</span>
              <span className="equipment-suit">{player.equipment.weapon.suit}{player.equipment.weapon.number}</span>
            </div>
          ) : (
            <div className="equipment-item equipment-placeholder" />
          )}
        </div>
        <div className="equipment-slot">
          {player.equipment.armor ? (
            <div className="equipment-item armor" title={player.equipment.armor.description}>
              <span className="equipment-icon">🛡️</span>
              <span className="equipment-name">{player.equipment.armor.name}</span>
              <span className="equipment-suit">{player.equipment.armor.suit}{player.equipment.armor.number}</span>
            </div>
          ) : (
            <div className="equipment-item equipment-placeholder" />
          )}
        </div>
        <div className="equipment-slot horses-slot">
          {player.equipment.horsePlus ? (
            <div className="equipment-item horse horse-plus" title={player.equipment.horsePlus.description}>
              <span className="equipment-icon">🐴</span>
              <span className="equipment-name">+1马</span>
              <span className="equipment-suit">{player.equipment.horsePlus.suit}{player.equipment.horsePlus.number}</span>
            </div>
          ) : (
            <div className="equipment-item equipment-placeholder" />
          )}
          {player.equipment.horseMinus ? (
            <div className="equipment-item horse horse-minus" title={player.equipment.horseMinus.description}>
              <span className="equipment-icon">🐴</span>
              <span className="equipment-name">-1马</span>
              <span className="equipment-suit">{player.equipment.horseMinus.suit}{player.equipment.horseMinus.number}</span>
            </div>
          ) : (
            <div className="equipment-item equipment-placeholder" />
          )}
        </div>
      </div>
    </div>
  );
};
