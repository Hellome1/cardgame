import { Card, CardType, CardSuit, CardColor, BasicCardName, SpellCardName, EquipmentType } from '../types/game';
import { fullDeckConfig, CardDefinition, validateDeck } from './DeckConfig';

// 牌堆日志记录函数
type DeckLogCallback = (reason: string, cards: Card[], changedCards?: Card[]) => void;
let deckLogCallback: DeckLogCallback | null = null;

export function setDeckLogCallback(callback: DeckLogCallback): void {
  deckLogCallback = callback;
}

export function logDeckState(reason: string, cards: Card[], changedCards?: Card[]): void {
  if (deckLogCallback) {
    deckLogCallback(reason, cards, changedCards);
  }
}

export class CardManager {
  private static instance: CardManager;
  private static cardIdCounter = 0;

  static getInstance(): CardManager {
    if (!CardManager.instance) {
      CardManager.instance = new CardManager();
    }
    return CardManager.instance;
  }

  private generateId(): string {
    return `card_${++CardManager.cardIdCounter}`;
  }

  private getSuitColor(suit: CardSuit): CardColor {
    return suit === CardSuit.HEART || suit === CardSuit.DIAMOND
      ? CardColor.RED
      : CardColor.BLACK;
  }

  private deckCreateCount = 0;

  /**
   * 创建标准牌堆
   * 使用 DeckConfig 中定义的精确卡牌配置
   * @param silent 如果为true，则不记录日志（用于UI展示）
   */
  createStandardDeck(silent: boolean = false): Card[] {
    this.deckCreateCount++;
    if (!silent) {
      console.log(`创建标准牌堆... (第 ${this.deckCreateCount} 次)`);
    }

    // 验证牌堆配置
    const validation = validateDeck();
    if (!validation.isValid) {
      console.warn(`[CardManager] 牌堆配置验证失败，实际数量: ${validation.total}，期望: 159`);
    }

    // 根据配置创建卡牌
    const deck: Card[] = fullDeckConfig.map(config => this.createCardFromConfig(config));

    // 如果是静默模式，直接返回洗牌后的牌堆，不记录日志
    if (silent) {
      return this.shuffle(deck);
    }

    // 记录初始牌堆（创建后、洗牌前）
    console.log(`[牌堆] 创建完成，共 ${deck.length} 张牌`);
    console.log('[牌堆] 各类型数量统计:');
    const basicCount = deck.filter(c => c.type === CardType.BASIC).length;
    const spellCount = deck.filter(c => c.type === CardType.SPELL).length;
    const equipCount = deck.filter(c => c.type === CardType.EQUIPMENT).length;
    console.log(`  - 基本牌: ${basicCount} 张`);
    console.log(`  - 锦囊牌: ${spellCount} 张`);
    console.log(`  - 装备牌: ${equipCount} 张`);

    // 记录完整的初始牌堆（洗牌前）
    console.log('[牌堆] 初始牌堆内容（洗牌前，按创建顺序）:');
    deck.forEach((card, index) => {
      console.log(`  ${index + 1}. ${card.name} [${card.suit}${card.number}] (${card.type}) - ID: ${card.id}`);
    });

    const shuffledDeck = this.shuffle(deck);

    // 记录洗牌后的牌堆
    console.log('[牌堆] 洗牌完成');
    console.log('[牌堆] 洗牌后牌堆内容（顶部到底部）:');
    shuffledDeck.forEach((card, index) => {
      console.log(`  ${index + 1}. ${card.name} [${card.suit}${card.number}] (${card.type}) - ID: ${card.id}`);
    });

    // 触发牌堆日志记录
    logDeckState('牌堆创建完成-洗牌后', shuffledDeck);

    return shuffledDeck;
  }

  /**
   * 根据配置创建卡牌
   */
  private createCardFromConfig(config: CardDefinition): Card {
    const card: Card = {
      id: this.generateId(),
      name: config.name,
      type: config.type as CardType,
      suit: config.suit,
      number: config.number,
      color: this.getSuitColor(config.suit),
      description: config.description,
    };

    // 添加装备特有的属性
    if (config.type === 'equipment') {
      card.equipmentType = config.equipmentType;
      if (config.range !== undefined) {
        card.range = config.range;
      }
    }

    return card;
  }

  /**
   * 创建用于调试界面的牌堆（不洗牌，保持固定顺序便于选择）
   */
  createDeckForDebug(): Card[] {
    console.log('[CardManager] 创建调试牌堆');
    return fullDeckConfig.map(config => this.createCardFromConfig(config));
  }

  // 洗牌
  shuffle(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // 抽牌
  draw(deck: Card[], count: number): { cards: Card[]; remaining: Card[] } {
    const actualCount = Math.min(count, deck.length);
    const cards = deck.splice(0, actualCount);
    console.log(`[CardManager] 从牌堆抽取 ${cards.length} 张牌: ${cards.map(c => c.name).join(', ')}`);
    console.log(`[CardManager] 牌堆剩余 ${deck.length} 张牌`);
    return { cards, remaining: deck };
  }
}
