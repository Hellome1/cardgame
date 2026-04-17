import { Card, CardType, CardSuit, CardColor, BasicCardName, SpellCardName, EquipmentType } from '../types/game';

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

  // 创建一副标准牌
  private deckCreateCount = 0;

  /**
   * 创建标准牌堆
   * @param silent 如果为true，则不记录日志（用于UI展示）
   */
  createStandardDeck(silent: boolean = false): Card[] {
    this.deckCreateCount++;
    if (!silent) {
      console.log(`创建标准牌堆... (第 ${this.deckCreateCount} 次)`);
    }
    // 注意：不再重置计数器，确保所有牌的ID都是全局唯一的

    const deck: Card[] = [];
    const suits = [CardSuit.SPADE, CardSuit.HEART, CardSuit.CLUB, CardSuit.DIAMOND];

    // 基本牌
    // 普通杀 (20张)
    for (let i = 0; i < 20; i++) {
      const suit = suits[i % 4];
      deck.push({
        id: this.generateId(),
        name: BasicCardName.ATTACK,
        type: CardType.BASIC,
        suit,
        number: (i % 13) + 1,
        color: this.getSuitColor(suit),
        description: '出牌阶段，对攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到1点伤害。',
      });
    }

    // 雷杀 (5张) - 黑桃和梅花
    const thunderSuits = [CardSuit.SPADE, CardSuit.CLUB];
    for (let i = 0; i < 5; i++) {
      const suit = thunderSuits[i % 2];
      deck.push({
        id: this.generateId(),
        name: BasicCardName.THUNDER_ATTACK,
        type: CardType.BASIC,
        suit,
        number: (i % 13) + 1,
        color: CardColor.BLACK,
        description: '出牌阶段，对攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到1点雷电伤害。',
      });
    }

    // 火杀 (5张) - 红桃和方块
    const fireSuits = [CardSuit.HEART, CardSuit.DIAMOND];
    for (let i = 0; i < 5; i++) {
      const suit = fireSuits[i % 2];
      deck.push({
        id: this.generateId(),
        name: BasicCardName.FIRE_ATTACK_CARD,
        type: CardType.BASIC,
        suit,
        number: (i % 13) + 1,
        color: CardColor.RED,
        description: '出牌阶段，对攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到1点火焰伤害。',
      });
    }

    // 闪 (15张)
    for (let i = 0; i < 15; i++) {
      const suit = suits[i % 4];
      deck.push({
        id: this.generateId(),
        name: BasicCardName.DODGE,
        type: CardType.BASIC,
        suit,
        number: (i % 13) + 1,
        color: this.getSuitColor(suit),
        description: '当你成为【杀】、【雷杀】或【火杀】的目标时，可以打出一张【闪】来抵消该牌的效果。',
      });
    }

    // 桃 (8张)
    for (let i = 0; i < 8; i++) {
      const suit = suits[i % 4];
      deck.push({
        id: this.generateId(),
        name: BasicCardName.PEACH,
        type: CardType.BASIC,
        suit,
        number: (i % 13) + 1,
        color: this.getSuitColor(suit),
        description: '出牌阶段，对你使用。目标角色回复1点体力。',
      });
    }

    // 锦囊牌
    const spellCards = [
      { name: SpellCardName.DUEL, count: 3, desc: '出牌阶段，对一名其他角色使用。该角色需打出一张【杀】，否则受到1点伤害。' },
      { name: SpellCardName.FIRE_ATTACK, count: 3, desc: '出牌阶段，对一名有手牌的角色使用。该角色需展示一张手牌，然后你可以弃置一张与其同花色的手牌，对其造成1点火焰伤害。' },
      { name: SpellCardName.STEAL, count: 5, desc: '出牌阶段，对距离为1的一名角色使用。获得该角色的一张手牌或装备区里的一张牌。' },
      { name: SpellCardName.DISMANTLE, count: 6, desc: '出牌阶段，对一名其他角色使用。弃置该角色的一张手牌或装备区里的一张牌。' },
      { name: SpellCardName.PEACH_GARDEN, count: 1, desc: '出牌阶段，对所有角色使用。所有角色回复1点体力。' },
      { name: SpellCardName.ARCHERY, count: 1, desc: '出牌阶段，对所有其他角色使用。每名角色需打出一张【闪】，否则受到1点伤害。' },
      { name: SpellCardName.SAVAGE, count: 1, desc: '出牌阶段，对所有其他角色使用。每名角色需打出一张【杀】，否则受到1点伤害。' },
      { name: SpellCardName.DRAW_TWO, count: 4, desc: '出牌阶段，对你使用。摸两张牌。' },
      { name: SpellCardName.NULLIFICATION, count: 4, desc: '在锦囊牌生效前，对一名角色使用的锦囊牌使用。抵消该锦囊牌对该角色的效果。' },
    ];

    spellCards.forEach(spell => {
      for (let i = 0; i < spell.count; i++) {
        const suit = suits[i % 4];
        deck.push({
          id: this.generateId(),
          name: spell.name,
          type: CardType.SPELL,
          suit,
          number: (i % 13) + 1,
          color: this.getSuitColor(suit),
          description: spell.desc,
        });
      }
    });

    // 延时锦囊牌
    // 乐不思蜀 (3张) - 红桃、方块、黑桃
    const indulgenceSuits = [CardSuit.HEART, CardSuit.DIAMOND, CardSuit.SPADE];
    indulgenceSuits.forEach((suit, index) => {
      deck.push({
        id: this.generateId(),
        name: SpellCardName.INDULGENCE,
        type: CardType.SPELL,
        suit,
        number: index + 1,
        color: this.getSuitColor(suit),
        description: '出牌阶段，对一名其他角色使用。将【乐不思蜀】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为红桃，则跳过其出牌阶段。',
      });
    });

    // 兵粮寸断 (2张) - 梅花、黑桃
    const supplyShortageSuits = [CardSuit.CLUB, CardSuit.SPADE];
    supplyShortageSuits.forEach((suit, index) => {
      deck.push({
        id: this.generateId(),
        name: SpellCardName.SUPPLY_SHORTAGE,
        type: CardType.SPELL,
        suit,
        number: index + 1,
        color: CardColor.BLACK,
        description: '出牌阶段，对一名距离为1的其他角色使用。将【兵粮寸断】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为梅花，则跳过其摸牌阶段。',
      });
    });

    // 闪电 (2张) - 黑桃
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: this.generateId(),
        name: SpellCardName.LIGHTNING,
        type: CardType.SPELL,
        suit: CardSuit.SPADE,
        number: i + 1,
        color: CardColor.BLACK,
        description: '出牌阶段，对你使用。将【闪电】置于你的判定区里。你的判定阶段，需进行判定：若结果为黑桃2-9，则你受到3点雷电伤害，并将【闪电】弃置；否则，将【闪电】移动到下家的判定区里。',
      });
    }

    // 装备牌
    // 武器 - 每种只有1张
    const weapons = [
      { name: '诸葛连弩', range: 1, desc: '锁定技，你于出牌阶段内使用【杀】无次数限制。' },
      { name: '青釭剑', range: 2, desc: '锁定技，当你使用【杀】指定一名角色为目标后，你令其防具无效。' },
      { name: '雌雄双股剑', range: 2, desc: '当你使用【杀】指定一名异性角色为目标后，你可以令其选择一项：1.弃置一张手牌；2.令你摸一张牌。' },
      { name: '青龙偃月刀', range: 3, desc: '当你使用的【杀】被【闪】抵消后，你可以弃置一张手牌，然后对目标角色再使用一张【杀】。' },
      { name: '丈八蛇矛', range: 3, desc: '你可以将两张手牌当【杀】使用或打出。' },
      { name: '贯石斧', range: 3, desc: '当你使用的【杀】被【闪】抵消后，你可以弃置两张牌，然后令此【杀】依然对其造成伤害。' },
      { name: '方天画戟', range: 4, desc: '当你使用【杀】时，且此【杀】是你最后的手牌，你可以额外选择至多两名目标角色。' },
      { name: '麒麟弓', range: 5, desc: '当你使用【杀】对目标角色造成伤害时，你可以弃置其装备区里的一张坐骑牌。' },
    ];

    weapons.forEach((weapon, index) => {
      const suit = suits[index % 4];
      deck.push({
        id: this.generateId(),
        name: weapon.name,
        type: CardType.EQUIPMENT,
        suit,
        number: index + 1,
        color: this.getSuitColor(suit),
        description: weapon.desc,
        equipmentType: EquipmentType.WEAPON,
        range: weapon.range,
      });
    });

    // 防具 - 每种只有1张
    const armors = [
      { name: '八卦阵', desc: '当你需要使用或打出【闪】时，你可以进行判定，若结果为红色，视为你使用或打出了一张【闪】。' },
      { name: '仁王盾', desc: '锁定技，黑色的【杀】对你无效。' },
      { name: '藤甲', desc: '锁定技，【南蛮入侵】、【万箭齐发】和普通【杀】对你无效。当你受到火焰伤害时，此伤害+1。' },
      { name: '白银狮子', desc: '锁定技，当你受到伤害时，若此伤害大于1点，则防止多余的伤害。当你失去装备区里的【白银狮子】后，你回复1点体力。' },
    ];

    armors.forEach((armor, index) => {
      const suit = suits[index % 4];
      deck.push({
        id: this.generateId(),
        name: armor.name,
        type: CardType.EQUIPMENT,
        suit,
        number: index + 1,
        color: this.getSuitColor(suit),
        description: armor.desc,
        equipmentType: EquipmentType.ARMOR,
      });
    });

    // +1马 - 每种只有1张
    const horsePlus = [
      { name: '绝影', desc: '锁定技，其他角色计算与你的距离时，始终+1。' },
      { name: '的卢', desc: '锁定技，其他角色计算与你的距离时，始终+1。' },
    ];

    horsePlus.forEach((horse, index) => {
      const suit = suits[index % 4];
      deck.push({
        id: this.generateId(),
        name: horse.name,
        type: CardType.EQUIPMENT,
        suit,
        number: index + 1,
        color: this.getSuitColor(suit),
        description: horse.desc,
        equipmentType: EquipmentType.HORSE_PLUS,
      });
    });

    // -1马 - 每种只有1张
    const horseMinus = [
      { name: '赤兔', desc: '锁定技，你计算与其他角色的距离时，始终-1。' },
      { name: '紫骍', desc: '锁定技，你计算与其他角色的距离时，始终-1。' },
    ];

    horseMinus.forEach((horse, index) => {
      const suit = suits[index % 4];
      deck.push({
        id: this.generateId(),
        name: horse.name,
        type: CardType.EQUIPMENT,
        suit,
        number: index + 1,
        color: this.getSuitColor(suit),
        description: horse.desc,
        equipmentType: EquipmentType.HORSE_MINUS,
      });
    });

    // 检查是否有重复的装备牌
    const equipmentNames = deck.filter(c => c.type === CardType.EQUIPMENT).map(c => c.name);
    const duplicates = equipmentNames.filter((item, index) => equipmentNames.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.error('牌堆中有重复的装备牌:', duplicates);
    }

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
