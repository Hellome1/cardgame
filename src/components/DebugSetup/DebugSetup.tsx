import React, { useState } from 'react';
import { Identity, CardType, CardSuit, EquipmentType } from '../../types/game';
import { CharacterManager } from '../../game/CharacterManager';
import './DebugSetup.css';

interface DebugSetupProps {
  onStartDebug: (config: DebugConfig) => void;
  onCancel: () => void;
}

export interface DebugConfig {
  players: {
    characterId: string;
    identity: Identity;
    initialHandCards: string[]; // 卡牌ID列表
  }[];
}

// 可选的初始手牌
const availableInitialCards = [
  // 基本牌
  { id: 'attack_1', name: '杀', type: CardType.BASIC, suit: CardSuit.SPADE, number: '7' },
  { id: 'dodge_1', name: '闪', type: CardType.BASIC, suit: CardSuit.DIAMOND, number: '2' },
  { id: 'peach_1', name: '桃', type: CardType.BASIC, suit: CardSuit.HEART, number: '3' },
  // 锦囊牌
  { id: 'fire_attack_1', name: '火攻', type: CardType.SPELL, suit: CardSuit.HEART, number: '2' },
  { id: 'nullification_1', name: '无懈可击', type: CardType.SPELL, suit: CardSuit.SPADE, number: 'J' },
  { id: 'duel_1', name: '决斗', type: CardType.SPELL, suit: CardSuit.DIAMOND, number: 'A' },
  { id: 'barbarian_1', name: '南蛮入侵', type: CardType.SPELL, suit: CardSuit.SPADE, number: '7' },
  { id: 'archers_1', name: '万箭齐发', type: CardType.SPELL, suit: CardSuit.HEART, number: 'A' },
  { id: 'indulgence_1', name: '乐不思蜀', type: CardType.SPELL, suit: CardSuit.SPADE, number: '6' },
  { id: 'lightning_1', name: '闪电', type: CardType.SPELL, suit: CardSuit.SPADE, number: 'A' },
  // 装备牌
  { id: 'weapon_1', name: '诸葛连弩', type: CardType.EQUIPMENT, equipmentType: EquipmentType.WEAPON, suit: CardSuit.DIAMOND, number: 'A' },
  { id: 'armor_1', name: '八卦阵', type: CardType.EQUIPMENT, equipmentType: EquipmentType.ARMOR, suit: CardSuit.SPADE, number: '2' },
  { id: 'horse_plus_1', name: '绝影', type: CardType.EQUIPMENT, equipmentType: EquipmentType.HORSE_PLUS, suit: CardSuit.SPADE, number: '5' },
  { id: 'horse_minus_1', name: '赤兔', type: CardType.EQUIPMENT, equipmentType: EquipmentType.HORSE_MINUS, suit: CardSuit.HEART, number: '5' },
];

export const DebugSetup: React.FC<DebugSetupProps> = ({ onStartDebug, onCancel }) => {
  const characterManager = CharacterManager.getInstance();
  const allCharacters = characterManager.getAllCharacters();

  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState<
    { characterId: string; identity: Identity; selectedCards: string[] }[]
  >(
    Array(4)
      .fill(null)
      .map((_, i) => ({
        characterId: '',
        identity: i === 0 ? Identity.LORD : Identity.REBEL,
        selectedCards: [],
      }))
  );

  const handleCharacterChange = (index: number, characterId: string) => {
    const newPlayers = [...players];
    newPlayers[index].characterId = characterId;
    setPlayers(newPlayers);
  };

  const handleIdentityChange = (index: number, identity: Identity) => {
    const newPlayers = [...players];
    newPlayers[index].identity = identity;
    setPlayers(newPlayers);
  };

  const handleCardToggle = (index: number, cardId: string) => {
    const newPlayers = [...players];
    const player = newPlayers[index];
    const cardIndex = player.selectedCards.indexOf(cardId);

    if (cardIndex > -1) {
      // 取消选择
      player.selectedCards.splice(cardIndex, 1);
    } else {
      // 选择（最多4张）
      if (player.selectedCards.length < 4) {
        player.selectedCards.push(cardId);
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
      }));
    setPlayers(newPlayers);
  };

  const handleStart = () => {
    // 验证所有玩家都选择了武将
    if (players.some((p) => !p.characterId)) {
      alert('请为所有玩家选择武将');
      return;
    }

    const config: DebugConfig = {
      players: players.map((p) => ({
        characterId: p.characterId,
        identity: p.identity,
        initialHandCards: p.selectedCards,
      })),
    };

    onStartDebug(config);
  };

  return (
    <div className="debug-setup-overlay">
      <div className="debug-setup-modal">
        <h2 className="debug-setup-title">调试模式设置</h2>

        <div className="player-count-selector">
          <label>玩家人数：</label>
          <select value={playerCount} onChange={(e) => handlePlayerCountChange(Number(e.target.value))}>
            <option value={2}>2人</option>
            <option value={3}>3人</option>
            <option value={4}>4人</option>
            <option value={5}>5人</option>
            <option value={6}>6人</option>
          </select>
        </div>

        <div className="players-config">
          {players.map((player, index) => (
            <div key={index} className="player-config">
              <h3>玩家 {index + 1}</h3>

              <div className="config-row">
                <label>武将：</label>
                <select
                  value={player.characterId}
                  onChange={(e) => handleCharacterChange(index, e.target.value)}
                >
                  <option value="">请选择武将</option>
                  {allCharacters.map((char) => (
                    <option key={char.id} value={char.id}>
                      {char.name} ({char.kingdom})
                    </option>
                  ))}
                </select>
              </div>

              <div className="config-row">
                <label>身份：</label>
                <select
                  value={player.identity}
                  onChange={(e) => handleIdentityChange(index, e.target.value as Identity)}
                >
                  <option value={Identity.LORD}>主公</option>
                  <option value={Identity.LOYALIST}>忠臣</option>
                  <option value={Identity.REBEL}>反贼</option>
                  <option value={Identity.TRAITOR}>内奸</option>
                </select>
              </div>

              <div className="initial-cards-section">
                <label>初始手牌（最多4张）：</label>
                <div className="cards-grid">
                  {availableInitialCards.map((card) => (
                    <div
                      key={card.id}
                      className={`card-option ${player.selectedCards.includes(card.id) ? 'selected' : ''}`}
                      onClick={() => handleCardToggle(index, card.id)}
                    >
                      <span className="card-name">{card.name}</span>
                      <span className="card-suit">{card.suit}{card.number}</span>
                    </div>
                  ))}
                </div>
                <div className="selected-count">
                  已选择: {player.selectedCards.length}/4
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="debug-setup-buttons">
          <button className="cancel-btn" onClick={onCancel}>
            取消
          </button>
          <button className="start-btn" onClick={handleStart}>
            开始调试
          </button>
        </div>
      </div>
    </div>
  );
};
