import React, { useState, useMemo } from 'react';
import { Identity, CardType, CardSuit, Card, Character } from '../../types/game';
import { CharacterManager } from '../../game/CharacterManager';
import { CardManager } from '../../game/CardManager';
import './DebugSetup.css';

interface DebugSetupProps {
  onStartDebug: (config: DebugConfig) => void;
  onCancel: () => void;
}

export interface DebugConfig {
  players: {
    characterId: string;
    identity: Identity;
    initialHandCards: string[];  // 卡牌ID列表（用于显示）
    initialHandCardNames?: string[];  // 卡牌名称列表（用于实际发牌）
  }[];
}

// 模块级别的牌堆缓存，确保只创建一次
let cachedDeck: Card[] | null = null;

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

// 势力边框色
const kingdomBorderColors: Record<string, string> = {
  '魏': '#5c6bc0',
  '蜀': '#e57373',
  '吴': '#81c784',
  '群': '#ffb74d',
};

// 势力名称
const kingdomNames: Record<string, string> = {
  '魏': '魏国',
  '蜀': '蜀国',
  '吴': '吴国',
  '群': '群雄',
};

export const DebugSetup: React.FC<DebugSetupProps> = ({ onStartDebug, onCancel }) => {
  const characterManager = CharacterManager.getInstance();
  const cardManager = CardManager.getInstance();
  const allCharacters = characterManager.getAllCharacters();

  // 创建一次牌堆，供整个组件使用（静默模式，不记录日志）
  const fullDeck = useMemo(() => {
    if (!cachedDeck) {
      cachedDeck = cardManager.createStandardDeck(true);
      console.log('[DebugSetup] 创建牌堆缓存');
    } else {
      console.log('[DebugSetup] 使用缓存的牌堆');
    }
    return cachedDeck;
  }, []);

  // 按势力分类武将
  const charactersByKingdom = useMemo(() => {
    const grouped: Record<string, Character[]> = {
      '魏': [],
      '蜀': [],
      '吴': [],
      '群': [],
    };
    allCharacters.forEach(char => {
      if (grouped[char.kingdom]) {
        grouped[char.kingdom].push(char);
      }
    });
    return grouped;
  }, [allCharacters]);

  // 按类型分类牌堆
  const deckByCategory = useMemo(() => {
    const basicCards = fullDeck.filter(c => c.type === CardType.BASIC);
    const spellCards = fullDeck.filter(c => c.type === CardType.SPELL);
    const equipmentCards = fullDeck.filter(c => c.type === CardType.EQUIPMENT);
    return { basicCards, spellCards, equipmentCards };
  }, [fullDeck]);

  const [playerCount, setPlayerCount] = useState(2);
  
  // 使用 useMemo 计算初始玩家状态，确保使用同一个 fullDeck
  const initialPlayers = useMemo(() => {
    const peachCard = fullDeck.find(c => c.name === '桃');
    const fireAttackCard = fullDeck.find(c => c.name === '火攻');
    
    // 随机选择2张其他牌（排除桃和火攻）
    const otherCards = fullDeck
      .filter(c => c.name !== '桃' && c.name !== '火攻')
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    
    // 找到司马懿
    const simaYi = allCharacters.find(c => c.id === 'simayi');
    
    const selectedCardIds = [
      peachCard?.id || '',
      fireAttackCard?.id || '',
      ...otherCards.map(c => c.id),
    ].filter(id => id !== '');

    const selectedCardNames = [
      peachCard?.name || '',
      fireAttackCard?.name || '',
      ...otherCards.map(c => c.name),
    ].filter(name => name !== '');

    return [
      {
        characterId: 'huanggai', // 玩家1：黄盖
        identity: Identity.LORD, // 主公
        selectedCards: selectedCardIds,
        selectedCardNames: selectedCardNames,
      },
      {
        characterId: simaYi?.id || 'simayi', // 玩家2：司马懿
        identity: Identity.REBEL, // 反贼
        selectedCards: [],
        selectedCardNames: [],
      },
    ];
  }, [fullDeck, allCharacters]);

  const [players, setPlayers] = useState(initialPlayers);

  // 当前选中的玩家索引
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);
  
  // 当前选中的栏目：'character' 或 'cards'
  const [activeTab, setActiveTab] = useState<'character' | 'cards'>('character');

  const handleCharacterSelect = (characterId: string) => {
    const newPlayers = [...players];
    newPlayers[selectedPlayerIndex].characterId = characterId;
    setPlayers(newPlayers);
  };

  const handleIdentityChange = (identity: Identity) => {
    const newPlayers = [...players];
    newPlayers[selectedPlayerIndex].identity = identity;
    setPlayers(newPlayers);
  };

  const handleCardToggle = (cardId: string, cardName: string) => {
    const newPlayers = [...players];
    const player = newPlayers[selectedPlayerIndex];
    const cardIndex = player.selectedCards.indexOf(cardId);

    if (cardIndex > -1) {
      player.selectedCards.splice(cardIndex, 1);
      player.selectedCardNames?.splice(cardIndex, 1);
    } else {
      if (player.selectedCards.length < 8) {
        player.selectedCards.push(cardId);
        player.selectedCardNames?.push(cardName);
      } else {
        alert('每个玩家最多选择8张初始手牌');
        return;
      }
    }
    setPlayers(newPlayers);
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const newPlayers = Array(count)
      .fill(null)
      .map((_, i) => ({
        characterId: players[i]?.characterId || '',
        identity: players[i]?.identity || (i === 0 ? Identity.LORD : Identity.REBEL),
        selectedCards: players[i]?.selectedCards || [],
        selectedCardNames: players[i]?.selectedCardNames || [],
      }));
    setPlayers(newPlayers);
    if (selectedPlayerIndex >= count) {
      setSelectedPlayerIndex(0);
    }
  };

  const handleStart = () => {
    if (players.some((p) => !p.characterId)) {
      alert('请为所有玩家选择武将');
      return;
    }

    const config: DebugConfig = {
      players: players.map((p) => ({
        characterId: p.characterId,
        identity: p.identity,
        initialHandCards: p.selectedCards,
        initialHandCardNames: p.selectedCardNames,
      })),
    };

    onStartDebug(config);
  };

  // 快速分配4张随机牌
  const assignRandomCards = () => {
    const newPlayers = [...players];
    const player = newPlayers[selectedPlayerIndex];
    const randomCards = fullDeck
      .filter(c => !player.selectedCards.includes(c.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
    
    randomCards.forEach(card => {
      if (player.selectedCards.length < 8) {
        player.selectedCards.push(card.id);
      }
    });
    setPlayers(newPlayers);
  };

  // 清空当前玩家的手牌
  const clearPlayerCards = () => {
    const newPlayers = [...players];
    newPlayers[selectedPlayerIndex].selectedCards = [];
    setPlayers(newPlayers);
  };

  const currentPlayer = players[selectedPlayerIndex];
  
  // 获取当前玩家已选的手牌详情
  const selectedCardsDetails = useMemo(() => {
    return currentPlayer.selectedCards
      .map(cardId => fullDeck.find(c => c.id === cardId))
      .filter((card): card is Card => card !== undefined);
  }, [currentPlayer.selectedCards, fullDeck]);

  return (
    <div className="debug-setup-overlay">
      <div className="debug-setup-modal">
        <h2 className="debug-setup-title">🎮 调试模式设置</h2>

        <div className="debug-setup-content">
          {/* 左侧：玩家列表 */}
          <div className="debug-setup-left">
            <div className="player-count-selector">
              <label>玩家人数：</label>
              <select value={playerCount} onChange={(e) => handlePlayerCountChange(Number(e.target.value))}>
                <option value={2}>2人</option>
                <option value={3}>3人</option>
                <option value={4}>4人</option>
                <option value={5}>5人</option>
                <option value={6}>6人</option>
                <option value={7}>7人</option>
                <option value={8}>8人</option>
              </select>
            </div>

            <div className="players-list">
              {players.map((player, index) => {
                const character = allCharacters.find(c => c.id === player.characterId);
                const playerCards = player.selectedCards
                  .map(cardId => fullDeck.find(c => c.id === cardId))
                  .filter((card): card is Card => card !== undefined);
                
                return (
                  <div 
                    key={index} 
                    className={`player-item ${selectedPlayerIndex === index ? 'selected' : ''}`}
                    onClick={() => setSelectedPlayerIndex(index)}
                  >
                    <div className="player-item-header">
                      <span className="player-item-number">玩家 {index + 1}</span>
                      <select
                        className="player-identity-select"
                        value={player.identity}
                        onChange={(e) => {
                          const newPlayers = [...players];
                          newPlayers[index].identity = e.target.value as Identity;
                          setPlayers(newPlayers);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value={Identity.LORD}>主公</option>
                        <option value={Identity.LOYALIST}>忠臣</option>
                        <option value={Identity.REBEL}>反贼</option>
                        <option value={Identity.TRAITOR}>内奸</option>
                      </select>
                    </div>
                    
                    {/* 显示武将 */}
                    {character ? (
                      <div className="player-item-character">
                        <span 
                          className="character-kingdom" 
                          style={{ background: kingdomBorderColors[character.kingdom] }}
                        >
                          {character.kingdom}
                        </span>
                        <span className="character-name">{character.name}</span>
                      </div>
                    ) : (
                      <div className="player-item-hint">未选择武将</div>
                    )}
                    
                    {/* 显示手牌 */}
                    {playerCards.length > 0 ? (
                      <div className="player-item-cards-list">
                        {playerCards.slice(0, 4).map((card, i) => (
                          <span 
                            key={i} 
                            className="player-card-tag"
                            style={{ color: suitColors[card.suit] }}
                          >
                            {suitDisplay[card.suit]}{card.number} {card.name}
                          </span>
                        ))}
                        {playerCards.length > 4 && (
                          <span className="more-cards">+{playerCards.length - 4}</span>
                        )}
                      </div>
                    ) : (
                      <div className="player-item-cards-empty">无手牌</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右侧：配置区域 */}
          <div className="debug-setup-right">
            {/* 当前玩家信息 */}
            <div className="current-player-info">
              <span className="current-player-label">配置玩家 {selectedPlayerIndex + 1}</span>
              {currentPlayer.characterId && (
                <span className="current-player-character">
                  武将: {allCharacters.find(c => c.id === currentPlayer.characterId)?.name}
                </span>
              )}
            </div>

            {/* 已选手牌显示区域 - 固定显示 */}
            <div className="selected-cards-display">
              <div className="display-title">
                已选手牌 
                <span className="card-count">({selectedCardsDetails.length}/8)</span>
              </div>
              {selectedCardsDetails.length > 0 ? (
                <div className="display-cards">
                  {selectedCardsDetails.map((card) => (
                    <div 
                      key={card.id} 
                      className="display-card"
                      style={{ color: suitColors[card.suit] }}
                      onClick={() => handleCardToggle(card.id, card.name)}
                      title="点击移除"
                    >
                      <div className="display-card-header">
                        <span className="display-card-suit">{suitDisplay[card.suit]}</span>
                        <span className="display-card-number">{card.number}</span>
                      </div>
                      <div className="display-card-body">
                        <span className="display-card-name">{card.name}</span>
                      </div>
                      <span className="display-remove">×</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="display-empty">未选择手牌</div>
              )}
            </div>

            {/* 栏目切换 */}
            <div className="tabs-container">
              <div 
                className={`tab ${activeTab === 'character' ? 'active' : ''}`}
                onClick={() => setActiveTab('character')}
              >
                🎭 选择武将
              </div>
              <div 
                className={`tab ${activeTab === 'cards' ? 'active' : ''}`}
                onClick={() => setActiveTab('cards')}
              >
                🃏 选择手牌
              </div>
            </div>

            {/* 内容区域 */}
            <div className="tab-content">
              {activeTab === 'character' ? (
                /* 武将选择区 */
                <div className="character-selection-panel">
                  <div className="characters-by-kingdom">
                    {Object.entries(charactersByKingdom).map(([kingdom, characters]) => (
                      <div key={kingdom} className="kingdom-section">
                        <div 
                          className="kingdom-header"
                          style={{ borderLeftColor: kingdomBorderColors[kingdom] }}
                        >
                          <span className="kingdom-name" style={{ color: kingdomBorderColors[kingdom] }}>
                            {kingdomNames[kingdom]}
                          </span>
                          <span className="kingdom-count">{characters.length}人</span>
                        </div>
                        <div className="kingdom-characters">
                          {characters.map((character) => (
                            <CharacterCard
                              key={character.id}
                              character={character}
                              isSelected={currentPlayer.characterId === character.id}
                              onClick={() => handleCharacterSelect(character.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* 手牌选择区 */
                <div className="cards-selection-panel">
                  {/* 手牌选择 */}
                  <div className="cards-selection-area">
                    {/* 基本牌 */}
                    <div className="card-category">
                      <div className="category-header">
                        <span className="category-icon">⚔️</span>
                        <span className="category-name">基本牌</span>
                        <span className="category-count">{deckByCategory.basicCards.length}张</span>
                      </div>
                      <div className="cards-grid">
                        {deckByCategory.basicCards.map((card) => (
                          <CardItem
                            key={card.id}
                            card={card}
                            isSelected={currentPlayer.selectedCards.includes(card.id)}
                            onClick={() => handleCardToggle(card.id, card.name)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 锦囊牌 */}
                    <div className="card-category">
                      <div className="category-header">
                        <span className="category-icon">📜</span>
                        <span className="category-name">锦囊牌</span>
                        <span className="category-count">{deckByCategory.spellCards.length}张</span>
                      </div>
                      <div className="cards-grid">
                        {deckByCategory.spellCards.map((card) => (
                          <CardItem
                            key={card.id}
                            card={card}
                            isSelected={currentPlayer.selectedCards.includes(card.id)}
                            onClick={() => handleCardToggle(card.id, card.name)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 装备牌 */}
                    <div className="card-category">
                      <div className="category-header">
                        <span className="category-icon">🛡️</span>
                        <span className="category-name">装备牌</span>
                        <span className="category-count">{deckByCategory.equipmentCards.length}张</span>
                      </div>
                      <div className="cards-grid">
                        {deckByCategory.equipmentCards.map((card) => (
                          <CardItem
                            key={card.id}
                            card={card}
                            isSelected={currentPlayer.selectedCards.includes(card.id)}
                            onClick={() => handleCardToggle(card.id, card.name)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 快捷操作 */}
                  <div className="cards-actions">
                    <button className="action-btn" onClick={assignRandomCards}>
                      🎲 随机4张
                    </button>
                    <button className="action-btn clear" onClick={clearPlayerCards}>
                      🗑️ 清空手牌
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 底部导航 */}
            <div className="config-footer">
              <div className="player-nav">
                <button 
                  className="nav-btn" 
                  onClick={() => setSelectedPlayerIndex(Math.max(0, selectedPlayerIndex - 1))}
                  disabled={selectedPlayerIndex === 0}
                >
                  ← 上一个玩家
                </button>
                <span className="nav-info">
                  玩家 {selectedPlayerIndex + 1} / {playerCount}
                </span>
                <button 
                  className="nav-btn" 
                  onClick={() => setSelectedPlayerIndex(Math.min(playerCount - 1, selectedPlayerIndex + 1))}
                  disabled={selectedPlayerIndex === playerCount - 1}
                >
                  下一个玩家 →
                </button>
              </div>
              <button className="start-game-btn" onClick={handleStart}>
                🎮 开始游戏
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 武将牌组件
interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  onClick: () => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, isSelected, onClick }) => {
  return (
    <div
      className={`char-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ borderColor: kingdomBorderColors[character.kingdom] || kingdomBorderColors['群'] }}
      title={character.skills.map(s => s.name).join(' ')}
    >
      <div className="char-card-name">{character.name}</div>
      <div className="char-card-hp">{'♥'.repeat(character.maxHp)}</div>
      <div className="char-card-skills">
        {character.skills.slice(0, 2).map(skill => (
          <span key={skill.id} className={`skill-tag ${skill.isPassive ? 'passive' : 'active'}`}>
            {skill.name}
          </span>
        ))}
        {character.skills.length > 2 && <span className="more-skills">+{character.skills.length - 2}</span>}
      </div>
      {isSelected && <div className="selected-mark">✓</div>}
    </div>
  );
};

// 卡牌组件
interface CardItemProps {
  card: Card;
  isSelected: boolean;
  onClick: () => void;
}

const CardItem: React.FC<CardItemProps> = ({ card, isSelected, onClick }) => {
  return (
    <div
      className={`card-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ color: suitColors[card.suit] }}
    >
      <div className="card-item-top">
        <span className="card-item-suit">{suitDisplay[card.suit]}</span>
        <span className="card-item-number">{card.number}</span>
      </div>
      <div className="card-item-name">{card.name}</div>
      {isSelected && <div className="card-item-check">✓</div>}
    </div>
  );
};

// 获取身份标签
function getIdentityLabel(identity: Identity): string {
  switch (identity) {
    case Identity.LORD: return '主公';
    case Identity.LOYALIST: return '忠臣';
    case Identity.REBEL: return '反贼';
    case Identity.TRAITOR: return '内奸';
    default: return '未知';
  }
}

// 获取身份颜色
function getIdentityColor(identity: Identity): string {
  switch (identity) {
    case Identity.LORD: return '#ffd700';
    case Identity.LOYALIST: return '#4caf50';
    case Identity.REBEL: return '#f44336';
    case Identity.TRAITOR: return '#9c27b0';
    default: return '#aaa';
  }
}
