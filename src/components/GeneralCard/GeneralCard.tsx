import React, { useState } from 'react';
import { Player, Identity, SpellCardName, GamePhase, Card as CardType } from '../../types/game';
import { Card } from '../Card/Card';
import './GeneralCard.css';

interface GeneralCardProps {
  player: Player;
  isCurrentTurn: boolean;
  isSelected: boolean;
  isHuman: boolean;
  showIdentity: boolean;
  isLord?: boolean;
  isSelectable?: boolean;
  isUnselectable?: boolean;
  onClick?: () => void;
  setRef?: (el: HTMLElement | null) => void;
  onSkillUse?: (skillId: string) => void;
  gamePhase?: GamePhase;
  // 手牌打出区
  playedCards?: CardType[];
  // AI手牌区
  showAIHandCards?: boolean;
  // AI展示牌区（火攻展示、使用的牌等）
  shownCards?: CardType[];
}

export const GeneralCard: React.FC<GeneralCardProps> = ({
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
  onSkillUse,
  gamePhase,
  playedCards = [],
  showAIHandCards = true,
  shownCards = [],
}) => {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [showSkillDetail, setShowSkillDetail] = useState(false);
  const [isHandCardsExpanded, setIsHandCardsExpanded] = useState(false);

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

  // 获取判定区图标
  const getDelayedSpellIcon = (spellName: string): string => {
    switch (spellName) {
      case SpellCardName.INDULGENCE:
        return '🎭';
      case SpellCardName.SUPPLY_SHORTAGE:
        return '🍞';
      case SpellCardName.LIGHTNING:
        return '⚡';
      default:
        return '📜';
    }
  };

  // 获取判定区描述
  const getDelayedSpellDesc = (spellName: string): string => {
    switch (spellName) {
      case SpellCardName.INDULGENCE:
        return '乐不思蜀：判定阶段，若结果不为红桃，跳过出牌阶段';
      case SpellCardName.SUPPLY_SHORTAGE:
        return '兵粮寸断：判定阶段，若结果不为梅花，跳过摸牌阶段';
      case SpellCardName.LIGHTNING:
        return '闪电：判定阶段，若结果为黑桃2-9，受到3点雷电伤害';
      default:
        return '';
    }
  };

  // 处理技能点击
  const handleSkillClick = (skillId: string, e: React.MouseEvent, isPassive: boolean) => {
    e.stopPropagation();
    if (!isPassive) {
      if (gamePhase === GamePhase.PLAY) {
        if (onSkillUse) {
          onSkillUse(skillId);
        }
      } else {
        console.log('只能在出牌阶段使用主动技能');
      }
    }
  };

  // 处理技能描述显示
  const handleSkillHover = (skillId: string | null) => {
    setSelectedSkill(skillId);
  };

  // 处理双击武将牌显示技能详情
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSkillDetail(true);
  };

  // 关闭技能详情弹窗
  const handleCloseSkillDetail = () => {
    setShowSkillDetail(false);
  };

  // 渲染手牌打出区 - 只显示最近打出的一张牌
  const renderPlayedCardsArea = () => {
    if (playedCards.length === 0) return null;

    // 只显示第一张（最近打出的）
    const card = playedCards[0];

    return (
      <div className={`played-cards-zone ${isHuman ? 'human-played' : 'ai-played'}`}>
        <div
          key={`${card.id}_0`}
          className="played-card-mini"
        >
          <Card
            card={card}
            isDisabled={true}
            showDescription={false}
          />
        </div>
      </div>
    );
  };

  // 渲染AI手牌区
  const renderAIHandCards = () => {
    if (isHuman || !showAIHandCards) return null;

    const handCardCount = player.handCards.length;

    return (
      <div className="ai-hand-cards-zone">
        <div
          className="ai-hand-cards-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setIsHandCardsExpanded(!isHandCardsExpanded);
          }}
        >
          <span className="ai-hand-cards-count">{handCardCount}</span>
          <span className="ai-hand-cards-icon">{isHandCardsExpanded ? '▼' : '▶'}</span>
        </div>
        <div className={`ai-hand-cards-content ${isHandCardsExpanded ? 'expanded' : ''}`}>
          {isHandCardsExpanded ? (
            // 展开状态 - 显示牌背
            <div className="ai-hand-cards-back">
              {Array.from({ length: Math.min(handCardCount, 10) }).map((_, index) => (
                <div
                  key={index}
                  className="ai-card-back"
                  style={{
                    transform: `translateX(${index * 8}px)`,
                    zIndex: handCardCount - index,
                  }}
                />
              ))}
              {handCardCount > 10 && (
                <span className="ai-hand-cards-more">+{handCardCount - 10}</span>
              )}
            </div>
          ) : (
            // 折叠状态 - 只显示数量
            <div className="ai-hand-cards-folded">
              <div className="ai-card-back folded" />
              <span className="ai-hand-cards-folded-count">×{handCardCount}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染AI展示牌区（火攻展示、使用的牌等）
  const renderAIShownCards = () => {
    if (isHuman || shownCards.length === 0) return null;

    return (
      <div className="ai-shown-cards-zone">
        {shownCards.map((card, index) => (
          <div
            key={`${card.id}_${index}`}
            className="ai-shown-card-mini"
            style={{
              transform: `translateX(${index * 30}px)`,
              zIndex: shownCards.length - index,
            }}
          >
            <Card
              card={card}
              isDisabled={true}
              showDescription={false}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`general-card-container ${isHuman ? 'human-player' : 'ai-player'}`}>
      <div className="general-card-wrapper">
        {/* 手牌打出区 - 人类玩家在手牌上方，AI在武将牌下方 */}
        {renderPlayedCardsArea()}

        {/* AI手牌区 - 放在武将牌右下角外侧 */}
        {renderAIHandCards()}

        {/* AI展示牌区 - 放在武将牌下方（火攻展示、使用的牌等） */}
        {renderAIShownCards()}

        {/* 技能区 - 武将牌左边外面，下边对齐 */}
        <div className="player-skills-left">
          {player.character.skills.map((skill) => (
            <div
              key={skill.id}
              className={`skill-item-left ${skill.isPassive ? 'passive' : 'active'}`}
              onClick={(e) => handleSkillClick(skill.id, e, skill.isPassive)}
              onMouseEnter={() => handleSkillHover(skill.id)}
              onMouseLeave={() => handleSkillHover(null)}
            >
              <span className="skill-name-left">{skill.name}</span>
              {/* 技能详细描述弹窗 */}
              {selectedSkill === skill.id && (
                <div className="skill-tooltip-left">
                  <div className="skill-tooltip-title">{skill.name}</div>
                  <div className="skill-tooltip-desc">{skill.description}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          ref={setRef}
          className={`general-card${isCurrentTurn ? ' current-turn' : ''}${isSelected ? ' selected' : ''}${player.isDead ? ' dead' : ''}${isHuman ? ' human' : ''}${isSelectable ? ' selectable' : ''}${isUnselectable ? ' unselectable' : ''}`}
          onClick={onClick}
          onDoubleClick={handleDoubleClick}
        >
          {/* 判定区 - 上方小图标 */}
          <div className="delayed-spells-area">
            {player.delayedSpells.indulgence && (
              <div
                className="delayed-spell-icon indulgence"
                title={getDelayedSpellDesc(SpellCardName.INDULGENCE)}
              >
                {getDelayedSpellIcon(SpellCardName.INDULGENCE)}
              </div>
            )}
            {player.delayedSpells.supplyShortage && (
              <div
                className="delayed-spell-icon supply-shortage"
                title={getDelayedSpellDesc(SpellCardName.SUPPLY_SHORTAGE)}
              >
                {getDelayedSpellIcon(SpellCardName.SUPPLY_SHORTAGE)}
              </div>
            )}
            {player.delayedSpells.lightning && (
              <div
                className="delayed-spell-icon lightning"
                title={getDelayedSpellDesc(SpellCardName.LIGHTNING)}
              >
                {getDelayedSpellIcon(SpellCardName.LIGHTNING)}
              </div>
            )}
          </div>

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
      </div>

      {/* 技能详情弹窗 - 双击武将牌显示 */}
      {showSkillDetail && (
        <div className="skill-detail-modal-overlay" onClick={handleCloseSkillDetail}>
          <div className="skill-detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="skill-detail-header">
              <h3 className="skill-detail-character-name">{player.character.name}</h3>
              <button className="skill-detail-close-btn" onClick={handleCloseSkillDetail}>✕</button>
            </div>
            <div className="skill-detail-body">
              <div className="skill-detail-section">
                <h4 className="skill-detail-section-title">武将技能</h4>
                {player.character.skills.length > 0 ? (
                  <div className="skill-detail-list">
                    {player.character.skills.map((skill) => (
                      <div key={skill.id} className={`skill-detail-item ${skill.isPassive ? 'passive' : 'active'}`}>
                        <div className="skill-detail-name">
                          {skill.name}
                          <span className="skill-detail-type">{skill.isPassive ? '【被动】' : '【主动】'}</span>
                        </div>
                        <div className="skill-detail-description">{skill.description}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="skill-detail-empty">该武将没有技能</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
