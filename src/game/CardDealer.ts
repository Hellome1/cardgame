import { Card, Player } from '../types/game';

/**
 * 发牌系统
 * 负责管理所有与发牌相关的逻辑
 * 
 * 注意：发牌系统直接操作传入的牌堆引用，确保牌堆状态同步
 */
export class CardDealer {
  private deck: Card[];

  /**
   * @param deck 牌堆数组的引用，发牌系统会直接修改这个数组
   */
  constructor(deck: Card[]) {
    this.deck = deck; // 直接使用引用，不复制
  }

  /**
   * 按照牌堆顺序给玩家发指定数量的牌
   * @param player 目标玩家
   * @param count 发牌数量
   * @returns 发出的牌
   */
  dealCards(player: Player, count: number): Card[] {
    if (count <= 0) return [];
    
    const actualCount = Math.min(count, this.deck.length);
    const dealtCards = this.deck.splice(0, actualCount);
    player.handCards.push(...dealtCards);
    
    console.log(`[发牌系统] 给 ${player.character.name} 发了 ${dealtCards.length} 张牌: ${dealtCards.map(c => `【${c.name}】[${c.suit}${c.number}]`).join('、')}`);
    
    // 记录发牌详情到控制台
    console.log(`[发牌系统] 发牌详情:`);
    dealtCards.forEach((card, index) => {
      console.log(`  ${index + 1}. ${card.name} [${card.suit}${card.number}] (${card.type}) - ID: ${card.id}`);
    });
    console.log(`[发牌系统] 牌堆剩余 ${this.deck.length} 张牌`);
    
    return dealtCards;
  }

  /**
   * 从牌堆中定向查找特定卡牌
   * @param name 卡牌名称
   * @param suit 花色（可选）
   * @param number 点数（可选）
   * @returns 找到的卡牌，如果没有则返回undefined
   */
  findCardInDeck(name: string, suit?: string, number?: string | number): Card | undefined {
    const index = this.deck.findIndex(card => {
      if (card.name !== name) return false;
      if (suit && card.suit !== suit) return false;
      if (number !== undefined && card.number !== Number(number)) return false;
      return true;
    });
    
    if (index !== -1) {
      const card = this.deck[index];
      console.log(`[发牌系统] 在牌堆中找到卡牌: ${card.name} [${card.suit}${card.number}]，位置: ${index}`);
      return card;
    }
    
    console.log(`[发牌系统] 在牌堆中未找到卡牌: ${name}`);
    return undefined;
  }

  /**
   * 从牌堆中移除指定ID的卡牌
   * @param cardId 卡牌ID
   * @returns 移除的卡牌，如果没有则返回undefined
   */
  removeCardFromDeck(cardId: string): Card | undefined {
    const index = this.deck.findIndex(card => card.id === cardId);
    if (index !== -1) {
      const [card] = this.deck.splice(index, 1);
      console.log(`[发牌系统] 从牌堆移除卡牌: ${card.name} [${card.suit}${card.number}]`);
      return card;
    }
    return undefined;
  }

  /**
   * 给玩家发放指定的初始手牌
   * @param player 目标玩家
   * @param initialHandCards 初始手牌ID列表
   * @returns 实际发出的牌（有些可能牌堆中没有）
   */
  dealInitialHandCards(player: Player, initialHandCards?: string[]): Card[] {
    if (!initialHandCards || initialHandCards.length === 0) {
      // 没有指定初始手牌，直接发4张
      return this.dealCards(player, 4);
    }

    const dealtCards: Card[] = [];
    
    // 1. 先从牌堆中查找并发放指定的初始手牌
    for (const cardId of initialHandCards) {
      const card = this.removeCardFromDeck(cardId);
      if (card) {
        player.handCards.push(card);
        dealtCards.push(card);
      } else {
        console.warn(`[发牌系统] 警告: 牌堆中未找到指定卡牌 ${cardId}`);
      }
    }
    
    console.log(`[发牌系统] ${player.character.name} 初始手牌发放完成，指定手牌: ${dealtCards.length} 张`);
    
    // 2. 如果初始手牌不足4张，从牌堆继续发牌补足到4张
    const remainingCount = 4 - dealtCards.length;
    if (remainingCount > 0) {
      console.log(`[发牌系统] ${player.character.name} 初始手牌不足4张，继续发 ${remainingCount} 张`);
      const additionalCards = this.dealCards(player, remainingCount);
      dealtCards.push(...additionalCards);
    }
    
    // 3. 打印玩家最终手牌
    console.log(`[发牌系统] ${player.character.name} 最终初始手牌 (${player.handCards.length}张):`);
    player.handCards.forEach((card, index) => {
      console.log(`  ${index + 1}. ${card.name} [${card.suit}${card.number}]`);
    });
    
    return dealtCards;
  }

  /**
   * 给所有玩家发放初始手牌
   * @param players 玩家列表
   * @param initialHandCardsMap 玩家ID到初始手牌ID列表的映射
   */
  dealInitialHandCardsToAll(
    players: Player[],
    initialHandCardsMap?: Map<string, string[]>
  ): void {
    console.log('[发牌系统] 开始发放初始手牌');
    
    for (const player of players) {
      const initialCards = initialHandCardsMap?.get(player.id);
      this.dealInitialHandCards(player, initialCards);
    }
    
    console.log('[发牌系统] 初始手牌发放完成');
  }

  /**
   * 获取当前牌堆剩余牌数
   */
  getDeckCount(): number {
    return this.deck.length;
  }

  /**
   * 获取牌堆引用（用于调试）
   */
  getDeck(): Card[] {
    return this.deck;
  }
}
