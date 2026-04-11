import { Player, Card, CardType, BasicCardName, SpellCardName, GamePhase, GameAction, Identity } from '../types/game';
import { GameEngine } from './GameEngine';
import { DistanceCalculator } from './DistanceCalculator';

export class AIPlayer {
  private engine: GameEngine;
  private attackCountThisTurn: number = 0;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }
  
  // 重置本回合杀计数
  resetAttackCount(): void {
    this.attackCountThisTurn = 0;
  }

  // AI 执行回合
  async playTurn(player: Player): Promise<void> {
    // 重置本回合杀计数
    this.attackCountThisTurn = 0;
    
    // 等待一段时间模拟思考（增加延迟）
    await this.delay(1500);
    
    // 出牌阶段
    await this.playCards(player);
    
    // 等待一下（增加延迟）
    await this.delay(800);
    
    // 注意：结束出牌阶段由 GameEngine 处理
    console.log(`AI ${player.character.name} 回合执行完毕`);
  }

  // AI 出牌逻辑
  private async playCards(player: Player): Promise<void> {
    const maxAttackPerTurn = 1; // 每回合只能使用1张杀（有诸葛连弩除外）
    
    // 持续出牌直到没有可出的牌
    let playedCount = 0;
    const maxCardsPerTurn = 10; // 防止无限循环
    
    console.log(`AI ${player.character.name} 开始出牌，当前手牌: ${player.handCards.length}`);
    
    while (playedCount < maxCardsPerTurn) {
      // 每次循环重新获取最新状态
      const gameState = this.engine.getState();
      const currentPlayer = gameState.players.find(p => p.id === player.id);
      
      if (!currentPlayer || currentPlayer.isDead) break;
      
      // 检查是否处于响应阶段，如果是则等待响应完成
      if (gameState.phase === GamePhase.RESPONSE && gameState.pendingResponse) {
        console.log(`AI ${currentPlayer.character.name} 检测到响应阶段，等待响应完成...`);
        // 等待响应完成（最多等待5秒）
        let waitCount = 0;
        let currentState = gameState;
        while (currentState.phase === GamePhase.RESPONSE && waitCount < 50) {
          await this.delay(100);
          currentState = this.engine.getState();
          waitCount++;
        }
        console.log(`AI ${currentPlayer.character.name} 响应阶段结束，继续出牌`);
        // 响应完成后重新获取状态
        continue;
      }
      
      const opponents = gameState.players.filter(p => p.id !== player.id && !p.isDead);
      
      console.log(`AI ${currentPlayer.character.name} 第 ${playedCount + 1} 次尝试出牌，手牌: ${currentPlayer.handCards.length}, 敌人: ${opponents.length}`);
      
      // 获取当前可出的牌
      const playableCards = currentPlayer.handCards.filter(card => this.canPlayCard(card, currentPlayer));
      
      console.log(`AI ${currentPlayer.character.name} 可出牌: ${playableCards.length} 张`);
      
      if (playableCards.length === 0) {
        console.log(`AI ${currentPlayer.character.name} 没有可出的牌`);
        break;
      }
      
      // 找到第一张可以出的牌
      let cardToPlay: Card | null = null;
      let targetIds: string[] | undefined;
      
      for (const card of playableCards) {
        // 根据卡牌类型决定目标
        let currentTargetIds: string[] | undefined;
        let canPlay = true;
        
        switch (card.type) {
          case CardType.BASIC:
            if (card.name === BasicCardName.ATTACK) {
              // 检查是否还能使用杀（有诸葛连弩除外）
              const hasCrossbow = currentPlayer.equipment.weapon?.name === '诸葛连弩';
              if (!hasCrossbow && this.attackCountThisTurn >= maxAttackPerTurn) {
                canPlay = false;
                break;
              }
              
              // 选择血量最少且在攻击范围内的敌人
              const target = this.selectWeakestEnemy(opponents, currentPlayer, gameState.players);
              if (target) {
                currentTargetIds = [target.id];
              } else {
                canPlay = false;
              }
            } else if (card.name === BasicCardName.PEACH) {
              // 自己血量不满时使用
              if (currentPlayer.character.hp >= currentPlayer.character.maxHp) {
                canPlay = false;
              }
            }
            break;
            
          case CardType.SPELL:
            currentTargetIds = this.selectTargetForSpell(card, currentPlayer, opponents, gameState.players);
            // 如果需要目标但没有目标，不能出
            if (this.needsTarget(card) && (!currentTargetIds || currentTargetIds.length === 0)) {
              canPlay = false;
            }
            break;
            
          case CardType.EQUIPMENT:
            // 装备牌不需要目标
            break;
        }
        
        if (canPlay) {
          cardToPlay = card;
          targetIds = currentTargetIds;
          break;
        }
      }
      
      // 没有找到可出的牌
      if (!cardToPlay) break;
      
      // 执行出牌
      console.log(`AI ${currentPlayer.character.name} 准备出 ${cardToPlay.name}`);
      
      const success = this.engine.executeAction({
        action: GameAction.PLAY_CARD,
        playerId: currentPlayer.id,
        cardId: cardToPlay.id,
        targetIds,
      });
      
      if (success) {
        playedCount++;
        if (cardToPlay.name === '杀') {
          this.attackCountThisTurn++;
        }
        await this.delay(1200); // 出牌间隔（增加延迟）
      } else {
        // 出牌失败，避免死循环
        break;
      }
    }
    
    console.log(`AI ${player.character.name} 出牌结束，共出了 ${playedCount} 张牌`);
  }

  // AI 弃牌逻辑
  private async discardCards(player: Player): Promise<void> {
    const maxCards = player.character.hp;
    const cardsToDiscard = player.handCards.length - maxCards;
    
    if (cardsToDiscard <= 0) return;
    
    // 优先弃置基本牌，保留锦囊和装备
    const sortedCards = [...player.handCards].sort((a, b) => {
      const priority = { [CardType.BASIC]: 0, [CardType.SPELL]: 1, [CardType.EQUIPMENT]: 2 };
      return priority[a.type] - priority[b.type];
    });
    
    const cardsToRemove = sortedCards.slice(0, cardsToDiscard);
    
    for (const card of cardsToRemove) {
      this.engine.executeAction({
        action: GameAction.DISCARD_CARD,
        playerId: player.id,
        cardId: card.id,
      });
      await this.delay(300);
    }
  }

  // 判断卡牌是否可以打出
  private canPlayCard(card: Card, player: Player): boolean {
    // 闪不能直接打出
    if (card.name === BasicCardName.DODGE) return false;
    
    // 检查装备牌是否重复
    if (card.type === CardType.EQUIPMENT && card.equipmentType) {
      const existingEquipment = player.equipment[card.equipmentType];
      if (existingEquipment && existingEquipment.name === card.name) {
        // 已经装备了相同的装备，不能再装备
        return false;
      }
    }
    
    return true;
  }

  // 判断卡牌是否需要目标
  private needsTarget(card: Card): boolean {
    if (card.type === CardType.EQUIPMENT) return false;
    if (card.name === BasicCardName.PEACH) return false;
    if (card.name === SpellCardName.PEACH_GARDEN) return false;
    if (card.name === SpellCardName.ARCHERY) return false;
    if (card.name === SpellCardName.SAVAGE) return false;
    if (card.name === SpellCardName.DRAW_TWO) return false;
    return true;
  }

  // 判断是否为敌对势力
  private isEnemy(playerIdentity: Identity, targetIdentity: Identity): boolean {
    // 主公和忠臣是同一阵营
    const playerTeam = (playerIdentity === Identity.LORD || playerIdentity === Identity.LOYALIST);
    const targetTeam = (targetIdentity === Identity.LORD || targetIdentity === Identity.LOYALIST);
    
    // 如果同阵营，不是敌人
    if (playerTeam && targetTeam) return false;
    
    // 反贼和内奸对主公/忠臣都是敌人
    // 主公/忠臣对反贼和内奸都是敌人
    return true;
  }

  // 选择最弱的敌人（血量最少，且在攻击范围内）
  private selectWeakestEnemy(opponents: Player[], player: Player, allPlayers: Player[]): Player | null {
    // 过滤出敌对势力且在攻击范围内的敌人
    const enemies = opponents.filter(p => {
      // 是敌对势力
      const isEnemy = this.isEnemy(player.identity, p.identity);
      // 在攻击范围内
      const inRange = DistanceCalculator.canAttack(player, p, allPlayers);
      return isEnemy && inRange;
    });
    
    if (enemies.length === 0) {
      console.log(`${player.character.name} 没有找到在攻击范围内的敌人`);
      return null;
    }
    
    // 按血量排序，选择最弱的
    return enemies.sort((a, b) => a.character.hp - b.character.hp)[0];
  }

  // 为锦囊牌选择目标
  private selectTargetForSpell(card: Card, player: Player, opponents: Player[], allPlayers: Player[]): string[] | undefined {
    switch (card.name) {
      case SpellCardName.DUEL:
      case SpellCardName.FIRE_ATTACK:
        // 选择血量最少的敌人（只选敌对势力且在攻击范围内）
        const weakEnemy = this.selectWeakestEnemy(opponents, player, allPlayers);
        return weakEnemy ? [weakEnemy.id] : undefined;
        
      case SpellCardName.STEAL:
        // 顺手牵羊：选择手牌最多的敌人（距离限制为1）
        const stealTargets = opponents.filter(p => {
          const isEnemy = this.isEnemy(player.identity, p.identity);
          const distance = DistanceCalculator.calculateDistance(player, p, allPlayers);
          return isEnemy && distance <= 1;
        });
        const stealTarget = stealTargets.sort((a, b) => b.handCards.length - a.handCards.length)[0];
        return stealTarget && stealTarget.handCards.length > 0 ? [stealTarget.id] : undefined;
        
      case SpellCardName.DISMANTLE:
        // 过河拆桥：选择手牌最多的敌人（无距离限制）
        const dismantleTargets = opponents.filter(p => {
          return this.isEnemy(player.identity, p.identity);
        });
        const dismantleTarget = dismantleTargets.sort((a, b) => b.handCards.length - a.handCards.length)[0];
        return dismantleTarget && dismantleTarget.handCards.length > 0 ? [dismantleTarget.id] : undefined;
        
      case SpellCardName.PEACH_GARDEN:
      case SpellCardName.ARCHERY:
      case SpellCardName.SAVAGE:
      case SpellCardName.DRAW_TWO:
        // 这些不需要目标
        return undefined;
        
      default:
        return undefined;
    }
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
