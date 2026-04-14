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
        {isLord && <span className="lord-badge">主</span>}
      </div>

      {/* 右上角 - 身份（纵向排列） */}
      {showIdentity && (
        <div className={`player-identity-vertical ${getIdentityClass(player.identity)}`}>
          {getIdentityText(player.identity)}
        </div>
      )}

      {/* 中央 - 头像 */}
      <div className={`avatar-image ${isLord ? 'lord-avatar' : ''}`}>
        {player.character.name[0]}
        {isLord && <span className="lord-crown">👑</span>}
      </div>

      {/* 手牌数量 */}
      <div className="player-cards">手牌: {player.handCards.length}</div>

      {/* 右下角 - 体力（纵向排列） */}
      <div className="player-hp-vertical">{renderHearts()}</div>

      {/* 装备区 - 三排：武器、防具、马匹 */}
      <div className="player-equipment">
        {/* 第一排：武器 */}
        <div className="equipment-slot">
          {player.equipment.weapon ? (
            <div className="equipment-item weapon" title={player.equipment.weapon.description}>
              ⚔️ {player.equipment.weapon.name}
            </div>
          ) : (
            <div className="equipment-item equipment-placeholder" />
          )}
        </div>
        {/* 第二排：防具 */}
        <div className="equipment-slot">
          {player.equipment.armor ? (
            <div className="equipment-item armor" title={player.equipment.armor.description}>
              🛡️ {player.equipment.armor.name}
            </div>
          ) : (
            <div className="equipment-item equipment-placeholder" />
          )}
        </div>
        {/* 第三排：马匹（+1马和-1马在同一排） */}
        <div className="equipment-slot horses-slot">
          {player.equipment.horsePlus ? (
            <div className="equipment-item horse horse-plus" title={player.equipment.horsePlus.description}>
              🐴+1
            </div>
          ) : (
            <div className="equipment-item equipment-placeholder" />
          )}
          {player.equipment.horseMinus ? (
            <div className="equipment-item horse horse-minus" title={player.equipment.horseMinus.description}>
              🐴-1
            </div>
          ) : (
            <div className="equipment-item equipment-placeholder" />
          )}
        </div>
      </div>
    </div>
  );
};
