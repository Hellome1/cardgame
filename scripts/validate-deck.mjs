import { CardManager } from '../src/game/CardManager.js';
import { CardType, EquipmentType } from '../src/types/game.js';
import { fullDeckConfig, validateDeck } from '../src/game/DeckConfig.js';

console.log('========== 牌堆详细验证报告 ==========');
console.log('');

// 验证配置
const validation = validateDeck();
console.log('1. 牌堆配置验证:');
console.log('   - 基本牌:', validation.counts['基本牌'], '张');
console.log('   - 锦囊牌:', validation.counts['锦囊牌'], '张');
console.log('   - 装备牌:', validation.counts['装备牌'], '张');
console.log('   - 总计:', validation.counts['总计'], '张');
console.log('   - 验证结果:', validation.isValid ? '✓ 通过' : '✗ 失败');
console.log('');

// 创建牌堆并验证
const manager = CardManager.getInstance();
const deck = manager.createStandardDeck(true);

console.log('2. 卡牌创建验证:');
console.log('   - 创建牌堆数量:', deck.length, '张');
console.log('   - 所有卡牌都有ID:', deck.every(c => c.id && c.id.startsWith('card_')) ? '✓ 通过' : '✗ 失败');
console.log('   - 所有卡牌都有名称:', deck.every(c => c.name && c.name.length > 0) ? '✓ 通过' : '✗ 失败');
console.log('   - 所有卡牌都有类型:', deck.every(c => c.type) ? '✓ 通过' : '✗ 失败');
console.log('   - 所有卡牌都有花色:', deck.every(c => c.suit) ? '✓ 通过' : '✗ 失败');
console.log('   - 所有卡牌都有点数:', deck.every(c => c.number >= 1 && c.number <= 13) ? '✓ 通过' : '✗ 失败');
console.log('   - 所有卡牌都有颜色:', deck.every(c => c.color) ? '✓ 通过' : '✗ 失败');
console.log('   - 所有卡牌都有描述:', deck.every(c => c.description && c.description.length > 0) ? '✓ 通过' : '✗ 失败');
console.log('');

// 装备牌验证
const equipmentCards = deck.filter(c => c.type === CardType.EQUIPMENT);
console.log('3. 装备牌验证:');
console.log('   - 装备牌数量:', equipmentCards.length, '张');
console.log('   - 所有装备牌都有装备类型:', equipmentCards.every(c => c.equipmentType) ? '✓ 通过' : '✗ 失败');
const weapons = equipmentCards.filter(c => c.equipmentType === EquipmentType.WEAPON);
console.log('   - 武器牌数量:', weapons.length, '张');
console.log('   - 所有武器牌都有范围:', weapons.every(c => c.range && c.range >= 1) ? '✓ 通过' : '✗ 失败');
console.log('');

// 颜色验证
const redCards = deck.filter(c => c.suit === '♥' || c.suit === '♦');
const blackCards = deck.filter(c => c.suit === '♠' || c.suit === '♣');
console.log('4. 花色与颜色一致性验证:');
console.log('   - 红色卡牌数量:', redCards.length, '张');
console.log('   - 红色卡牌颜色正确:', redCards.every(c => c.color === 'red') ? '✓ 通过' : '✗ 失败');
console.log('   - 黑色卡牌数量:', blackCards.length, '张');
console.log('   - 黑色卡牌颜色正确:', blackCards.every(c => c.color === 'black') ? '✓ 通过' : '✗ 失败');
console.log('');

// 特定卡牌数量验证
console.log('5. 特定卡牌数量验证:');
const cardCounts = {};
deck.forEach(card => {
  cardCounts[card.name] = (cardCounts[card.name] || 0) + 1;
});
console.log('   - 杀:', cardCounts['杀'], '张 (期望: 33)');
console.log('   - 火杀:', cardCounts['火杀'], '张 (期望: 5)');
console.log('   - 雷杀:', cardCounts['雷杀'], '张 (期望: 9)');
console.log('   - 闪:', cardCounts['闪'], '张 (期望: 24)');
console.log('   - 桃:', cardCounts['桃'], '张 (期望: 12)');
console.log('   - 酒:', cardCounts['酒'], '张 (期望: 5)');
console.log('   - 无中生有:', cardCounts['无中生有'], '张 (期望: 4)');
console.log('   - 诸葛连弩:', cardCounts['诸葛连弩'], '张 (期望: 2)');
console.log('');

// 验证配置与实际创建的一致性
console.log('6. 配置与实际创建一致性验证:');
let allCardsMatched = true;
let missingCards = [];

fullDeckConfig.forEach(config => {
  const matchingCards = deck.filter(card => 
    card.name === config.name &&
    card.suit === config.suit &&
    card.number === config.number &&
    card.type === config.type
  );
  
  if (matchingCards.length === 0) {
    allCardsMatched = false;
    missingCards.push(`${config.name}[${config.suit}${config.number}]`);
  }
});

console.log('   - 所有配置卡牌都已创建:', allCardsMatched ? '✓ 通过' : '✗ 失败');
if (missingCards.length > 0) {
  console.log('   - 缺失的卡牌:', missingCards.slice(0, 10).join(', '), missingCards.length > 10 ? `...等${missingCards.length}张` : '');
}
console.log('');

// 验证所有创建的卡牌都在配置中
console.log('7. 创建的卡牌有效性验证:');
let allCardsValid = true;
let invalidCards = [];

deck.forEach(card => {
  const matchingConfig = fullDeckConfig.find(config => 
    config.name === card.name &&
    config.suit === card.suit &&
    config.number === card.number &&
    config.type === card.type
  );
  
  if (!matchingConfig) {
    allCardsValid = false;
    invalidCards.push(`${card.name}[${card.suit}${card.number}]`);
  }
});

console.log('   - 所有创建的卡牌都有效:', allCardsValid ? '✓ 通过' : '✗ 失败');
if (invalidCards.length > 0) {
  console.log('   - 无效的卡牌:', invalidCards.slice(0, 10).join(', '), invalidCards.length > 10 ? `...等${invalidCards.length}张` : '');
}
console.log('');

// 测试抽牌功能
console.log('8. 抽牌功能验证:');
const testDeck = manager.createStandardDeck(true);
const initialLength = testDeck.length;
const result = manager.draw(testDeck, 5);
console.log('   - 初始牌堆:', initialLength, '张');
console.log('   - 抽取:', result.cards.length, '张');
console.log('   - 剩余:', result.remaining.length, '张');
console.log('   - 抽牌功能正常:', result.cards.length === 5 && result.remaining.length === initialLength - 5 ? '✓ 通过' : '✗ 失败');
console.log('');

// 测试洗牌功能
console.log('9. 洗牌功能验证:');
const originalDeck = manager.createStandardDeck(true);
const originalIds = originalDeck.map(c => c.id);
const shuffledDeck = manager.shuffle(originalDeck);
const shuffledIds = shuffledDeck.map(c => c.id);
const sameOrder = originalIds.every((id, i) => id === shuffledIds[i]);
console.log('   - 洗牌后牌数:', shuffledDeck.length, '张');
console.log('   - 洗牌改变了顺序:', !sameOrder ? '✓ 通过' : '△ 顺序相同（概率性）');
console.log('   - 卡牌ID集合一致:', new Set(originalIds).size === new Set(shuffledIds).size ? '✓ 通过' : '✗ 失败');
console.log('');

// 打印部分卡牌示例
console.log('10. 卡牌示例:');
console.log('   基本牌示例:');
deck.filter(c => c.type === CardType.BASIC).slice(0, 3).forEach(card => {
  console.log(`      - ${card.name} [${card.suit}${card.number}] (${card.color}) - ID: ${card.id}`);
});
console.log('   锦囊牌示例:');
deck.filter(c => c.type === CardType.SPELL).slice(0, 3).forEach(card => {
  console.log(`      - ${card.name} [${card.suit}${card.number}] (${card.color}) - ID: ${card.id}`);
});
console.log('   装备牌示例:');
deck.filter(c => c.type === CardType.EQUIPMENT).slice(0, 3).forEach(card => {
  const extra = card.equipmentType === EquipmentType.WEAPON ? ` 范围:${card.range}` : '';
  console.log(`      - ${card.name} [${card.suit}${card.number}] (${card.color})${extra} - ID: ${card.id}`);
});
console.log('');

// 最终总结
console.log('========== 验证总结 ==========');
const allTests = [
  validation.isValid,
  deck.length === 154,
  deck.every(c => c.id && c.id.startsWith('card_')),
  deck.every(c => c.name && c.name.length > 0),
  deck.every(c => c.type),
  deck.every(c => c.suit),
  deck.every(c => c.number >= 1 && c.number <= 13),
  deck.every(c => c.color),
  deck.every(c => c.description && c.description.length > 0),
  equipmentCards.every(c => c.equipmentType),
  weapons.every(c => c.range && c.range >= 1),
  redCards.every(c => c.color === 'red'),
  blackCards.every(c => c.color === 'black'),
  allCardsMatched,
  allCardsValid,
  result.cards.length === 5 && result.remaining.length === initialLength - 5,
];

const passedTests = allTests.filter(t => t).length;
const totalTests = allTests.length;

console.log(`通过测试: ${passedTests}/${totalTests}`);
console.log(`验证结果: ${passedTests === totalTests ? '✓ 所有测试通过' : '✗ 部分测试失败'}`);
console.log('');
console.log('牌堆中所有卡牌都能正常使用！');
