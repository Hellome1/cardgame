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
      className={`player-avatar ${isCurrentTurn ? 'current-turn' : ''} ${isSelected ? 'selected' : ''} ${player.isDead ? 'dead' : ''} ${isHuman ? 'human' : ''} ${isSelectable ? 'selectable' : ''}`}
      onClick={onClick}
    >
      <div className={`avatar-image ${isLord ? 'lord-avatar' : ''}`}>
        {player.character.name[0]}
        {isLord && <span className="lord-crown">👑</span>}
      </div>
      <div className="player-name">
        {player.character.name}
        {isLord && <span className="lord-badge">主公</span>}
      </div>
      {showIdentity && (
        <div className={`player-identity ${getIdentityClass(player.identity)}`}>
          {getIdentityText(player.identity)}
        </div>
      )}
      <div className="player-hp">{renderHearts()}</div>
      <div className="player-cards">手牌: {player.handCards.length}</div>
      
      {/* 装备区 */}
      <div className="player-equipment">
        {player.equipment.weapon && (
          <div className="equipment-item weapon" title={player.equipment.weapon.description}>
            ⚔️ {player.equipment.weapon.suit}{player.equipment.weapon.number} {player.equipment.weapon.name} (距离{player.equipment.weapon.range})
          </div>
        )}
        {player.equipment.armor && (
          <div className="equipment-item armor" title={player.equipment.armor.description}>
            🛡️ {player.equipment.armor.suit}{player.equipment.armor.number} {player.equipment.armor.name}
          </div>
        )}
        {/* 加一马和减一马放在一排 */}
        {(player.equipment.horsePlus || player.equipment.horseMinus) && (
          <div className="equipment-row horses-row">
            {player.equipment.horsePlus && (
              <div className="equipment-item horse horse-plus" title={player.equipment.horsePlus.description}>
                🐴 {player.equipment.horsePlus.suit}{player.equipment.horsePlus.number} +1马 ({player.equipment.horsePlus.name})
              </div>
            )}
            {player.equipment.horseMinus && (
              <div className="equipment-item horse horse-minus" title={player.equipment.horseMinus.description}>
                🐴 {player.equipment.horseMinus.suit}{player.equipment.horseMinus.number} -1马 ({player.equipment.horseMinus.name})
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
