import { Player, Card, CardType, BasicCardName, SpellCardName, GamePhase, GameAction, Identity } from '../types/game';
import { GameEngine } from './GameEngine';
import { DistanceCalculator } from './DistanceCalculator';

// 怀疑度系统 - AI对其他玩家的怀疑程度
interface SuspicionLevel {
  playerId: string;
  level: number; // 0-100，越高越怀疑是敌人
  lastUpdate: number; // 上次更新的回合数
}

export class AIPlayer {
  private engine: GameEngine;
  private attackCountThisTurn: number = 0;
  private suspicionMap: Map<string, SuspicionLevel[]> = new Map(); // playerId -> 对其他玩家的怀疑度

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  // 获取或初始化AI的怀疑度列表
  private getSuspicionList(aiPlayerId: string): SuspicionLevel[] {
    if (!this.suspicionMap.has(aiPlayerId)) {
      this.suspicionMap.set(aiPlayerId, []);
    }
    return this.suspicionMap.get(aiPlayerId)!;
  }

  // 更新怀疑度 - 当有人对AI使用牌或攻击时调用
  updateSuspicion(aiPlayerId: string, targetPlayerId: string, amount: number, currentRound: number): void {
    const suspicionList = this.getSuspicionList(aiPlayerId);
    let suspicion = suspicionList.find(s => s.playerId === targetPlayerId);

    if (!suspicion) {
      suspicion = { playerId: targetPlayerId, level: 0, lastUpdate: currentRound };
      suspicionList.push(suspicion);
    }

    suspicion.level = Math.min(100, suspicion.level + amount);
    suspicion.lastUpdate = currentRound;

    console.log(`[怀疑度] ${aiPlayerId} 对 ${targetPlayerId} 的怀疑度增加 ${amount}，当前: ${suspicion.level}`);
  }

  // 获取对某个玩家的怀疑度
  getSuspicionLevel(aiPlayerId: string, targetPlayerId: string): number {
    const suspicionList = this.getSuspicionList(aiPlayerId);
    const suspicion = suspicionList.find(s => s.playerId === targetPlayerId);
    return suspicion ? suspicion.level : 0;
  }

  // 判断是否为敌人（基于怀疑度和已知身份）
  private isEnemyBySuspicion(aiPlayer: Player, targetPlayer: Player, allPlayers: Player[]): boolean {
    // 主公身份是明置的，所有玩家都知道谁是主公
    const isTargetLord = targetPlayer.identity === Identity.LORD;

    // 根据AI自己的身份判断敌人
    switch (aiPlayer.identity) {
      case Identity.LORD:
        // 主公：除了忠臣外，其他都是敌人（但忠臣身份不明，需要通过怀疑度判断）
        // 如果怀疑度很高，认为是敌人
        if (this.getSuspicionLevel(aiPlayer.id, targetPlayer.id) >= 50) {
          return true;
        }
        // 怀疑度中等时，保守起见，认为可能是敌人
        if (this.getSuspicionLevel(aiPlayer.id, targetPlayer.id) >= 20) {
          return true;
        }
        // 游戏初期（怀疑度为0），主公默认攻击非主公玩家（因为场上只有一个忠臣，其他都是敌人）
        if (this.getSuspicionLevel(aiPlayer.id, targetPlayer.id) === 0 && !isTargetLord) {
          return true;
        }
        // 怀疑度低，暂时不攻击
        return false;

      case Identity.LOYALIST:
        // 忠臣：优先攻击非主公玩家（因为场上只有一个忠臣，其他非主公都是敌人）
        if (isTargetLord) {
          return false; // 不攻击主公
        }
        // 非主公玩家都是潜在的敌人（反贼或内奸）
        return true;

      case Identity.REBEL:
        // 反贼：优先攻击主公
        if (isTargetLord) {
          return true; // 主公是首要目标
        }
        // 对于非主公玩家，根据怀疑度判断
        if (this.getSuspicionLevel(aiPlayer.id, targetPlayer.id) >= 30) {
          return true;
        }
        // 游戏初期（怀疑度为0），默认攻击非主公玩家
        if (this.getSuspicionLevel(aiPlayer.id, targetPlayer.id) === 0 && !isTargetLord) {
          return true;
        }
        return false;

      case Identity.TRAITOR:
        // 内奸：优先攻击忠臣，然后反贼，最后主公
        // 内奸的胜利条件是最后只剩自己和主公
        // 策略原因：如果先杀反贼，会形成主公+忠臣 vs 内奸的二打一局面
        const alivePlayers = allPlayers.filter(p => !p.isDead);
        const aliveRebels = alivePlayers.filter(p => p.identity === Identity.REBEL);
        const aliveLoyalists = alivePlayers.filter(p => p.identity === Identity.LOYALIST);

        // 优先攻击忠臣（防止反贼死后形成二打一）
        if (aliveLoyalists.length > 0) {
          if (targetPlayer.identity === Identity.LOYALIST) {
            return true;
          }
          // 有忠臣活着时，不攻击主公和反贼
          return false;
        }

        // 没有忠臣了，攻击反贼
        if (aliveRebels.length > 0) {
          if (targetPlayer.identity === Identity.REBEL) {
            return true;
          }
          // 有反贼活着时，不攻击主公
          return false;
        }

        // 只剩主公和内奸了，攻击主公
        if (isTargetLord) {
          return true;
        }

        return false;

      default:
        return false;
    }
  }

  // 记录所有玩家的身份到日志（用于调试）
  logAllIdentities(players: Player[]): void {
    console.log('========== 玩家身份记录 ==========');
    players.forEach(p => {
      const identityName = {
        [Identity.LORD]: '主公',
        [Identity.LOYALIST]: '忠臣',
        [Identity.REBEL]: '反贼',
        [Identity.TRAITOR]: '内奸'
      }[p.identity];
      console.log(`${p.character.name}: ${identityName} (${p.identity})`);
    });
    console.log('==================================');
  }

  // 重置本回合杀计数
  resetAttackCount(): void {
    this.attackCountThisTurn = 0;
  }

  // AI 执行回合
  async playTurn(player: Player): Promise<void> {
    // 重置本回合杀计数
    this.attackCountThisTurn = 0;

    // 记录身份到日志
    const gameState = this.engine.getState();
    this.logAllIdentities(gameState.players);

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
      // 检查游戏是否暂停
      if (this.engine.isGamePaused()) {
        await this.delay(500);
        continue;
      }

      // 每次循环重新获取最新状态
      const gameState = this.engine.getState();

      // 检查游戏是否已经结束
      if (gameState.phase === GamePhase.GAME_OVER) {
        console.log(`AI ${player.character.name} 检测到游戏已结束，停止出牌`);
        break;
      }

      const currentPlayer = gameState.players.find(p => p.id === player.id);

      if (!currentPlayer || currentPlayer.isDead) break;

      // 检查是否仍然是当前玩家的回合
      const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentTurnPlayer.id !== player.id) {
        console.log(`AI ${currentPlayer.character.name} 检测到回合已切换到 ${currentTurnPlayer.character.name}，停止出牌`);
        break;
      }

      // 检查是否处于响应阶段，如果是则等待响应完成
      if (gameState.phase === GamePhase.RESPONSE && gameState.pendingResponse) {
        console.log(`AI ${currentPlayer.character.name} 检测到响应阶段，等待响应完成...`);
        // 等待响应完成（最多等待5秒）
        let waitCount = 0;
        let currentState = gameState;
        while (currentState.phase === GamePhase.RESPONSE && waitCount < 50) {
          // 检查游戏是否暂停
          if (this.engine.isGamePaused()) {
            await this.delay(500);
            continue;
          }
          // 检查是否仍然是当前玩家的回合
          const checkState = this.engine.getState();
          const checkTurnPlayer = checkState.players[checkState.currentPlayerIndex];
          if (checkTurnPlayer.id !== player.id) {
            console.log(`AI ${currentPlayer.character.name} 检测到回合已切换，停止等待响应`);
            return;
          }
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
            if (card.name === BasicCardName.ATTACK ||
              card.name === BasicCardName.THUNDER_ATTACK ||
              card.name === BasicCardName.FIRE_ATTACK_CARD) {
              // 检查是否还能使用杀（有诸葛连弩除外）- 雷杀和火杀也计入杀的次数限制
              const hasCrossbow = currentPlayer.equipment.weapon?.name === '诸葛连弩';
              if (!hasCrossbow && this.attackCountThisTurn >= maxAttackPerTurn) {
                canPlay = false;
                break;
              }

              // 选择血量最少且在攻击范围内的敌人（基于怀疑度）
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
        // 检查是否是杀（包括普通杀、雷杀、火杀）
        if (cardToPlay.name === BasicCardName.ATTACK ||
          cardToPlay.name === BasicCardName.THUNDER_ATTACK ||
          cardToPlay.name === BasicCardName.FIRE_ATTACK_CARD) {
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
  // @ts-ignore - 保留以备后续使用
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
    if (card.name === SpellCardName.NULLIFICATION) return false; // 无懈可击不需要目标
    return true;
  }

  // 选择最弱的敌人（血量最少，且在攻击范围内）- 基于怀疑度
  private selectWeakestEnemy(opponents: Player[], player: Player, allPlayers: Player[]): Player | null {
    // 过滤出被怀疑是敌人且在攻击范围内的目标
    const enemies = opponents.filter(p => {
      // 基于怀疑度判断是否是敌人
      const isEnemy = this.isEnemyBySuspicion(player, p, allPlayers);
      // 在攻击范围内
      const inRange = DistanceCalculator.canAttack(player, p, allPlayers);
      return isEnemy && inRange;
    });

    if (enemies.length === 0) {
      console.log(`${player.character.name} 没有找到在攻击范围内的可疑敌人`);
      return null;
    }

    // 按血量排序，选择最弱的
    return enemies.sort((a, b) => a.character.hp - b.character.hp)[0];
  }

  // 选择最弱的敌人（不考虑攻击范围，用于决斗、火攻等无距离限制的锦囊）- 基于怀疑度
  private selectWeakestEnemyWithoutRange(opponents: Player[], player: Player, allPlayers: Player[]): Player | null {
    // 过滤出被怀疑是敌人的目标（不考虑攻击范围）
    const enemies = opponents.filter(p => {
      // 基于怀疑度判断是否是敌人
      return this.isEnemyBySuspicion(player, p, allPlayers);
    });

    if (enemies.length === 0) {
      console.log(`${player.character.name} 没有找到可疑敌人（无距离限制）`);
      return null;
    }

    // 按血量排序，选择最弱的
    return enemies.sort((a, b) => a.character.hp - b.character.hp)[0];
  }

  // 为锦囊牌选择目标 - 基于怀疑度
  private selectTargetForSpell(card: Card, player: Player, opponents: Player[], allPlayers: Player[]): string[] | undefined {
    switch (card.name) {
      case SpellCardName.DUEL:
      case SpellCardName.FIRE_ATTACK:
        // 选择血量最少的敌人（基于怀疑度，决斗和火攻没有距离限制）
        const weakEnemy = this.selectWeakestEnemyWithoutRange(opponents, player, allPlayers);
        return weakEnemy ? [weakEnemy.id] : undefined;

      case SpellCardName.STEAL:
        // 顺手牵羊：选择手牌最多的敌人（距离限制为1，基于怀疑度）
        const stealTargets = opponents.filter(p => {
          const isEnemy = this.isEnemyBySuspicion(player, p, allPlayers);
          const distance = DistanceCalculator.calculateDistance(player, p, allPlayers);
          return isEnemy && distance <= 1;
        });
        const stealTarget = stealTargets.sort((a, b) => b.handCards.length - a.handCards.length)[0];
        return stealTarget && stealTarget.handCards.length > 0 ? [stealTarget.id] : undefined;

      case SpellCardName.DISMANTLE:
        // 过河拆桥：选择手牌最多的敌人（无距离限制，基于怀疑度）
        const dismantleTargets = opponents.filter(p => {
          return this.isEnemyBySuspicion(player, p, allPlayers);
        });
        const dismantleTarget = dismantleTargets.sort((a, b) => b.handCards.length - a.handCards.length)[0];
        return dismantleTarget && dismantleTarget.handCards.length > 0 ? [dismantleTarget.id] : undefined;

      case SpellCardName.PEACH_GARDEN:
      case SpellCardName.ARCHERY:
      case SpellCardName.SAVAGE:
      case SpellCardName.DRAW_TWO:
      case SpellCardName.NULLIFICATION:
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
