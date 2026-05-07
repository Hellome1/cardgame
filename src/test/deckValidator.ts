import { CardManager } from '../game/CardManager';
import { CardType, EquipmentType } from '../types/game';
import { fullDeckConfig, validateDeck } from '../game/DeckConfig';

export function validateDeckComprehensive(): { success: boolean; report: string } {
  let report = '========== 牌堆详细验证报告 ==========\n\n';
  let allPassed = true;

  // 验证配置
  const validation = validateDeck();
  report += '1. 牌堆配置验证:\n';
  report += `   - 基本牌: ${validation.counts['基本牌']} 张\n`;
  report += `   - 锦囊牌: ${validation.counts['锦囊牌']} 张\n`;
  report += `   - 装备牌: ${validation.counts['装备牌']} 张\n`;
  report += `   - 总计: ${validation.counts['总计']} 张\n`;
  report += `   - 验证结果: ${validation.isValid ? '✓ 通过' : '✗ 失败'}\n\n`;
  if (!validation.isValid) allPassed = false;

  // 创建牌堆并验证
  const manager = CardManager.getInstance();
  const deck = manager.createStandardDeck(true);

  report += '2. 卡牌创建验证:\n';
  report += `   - 创建牌堆数量: ${deck.length} 张\n`;
  
  const hasAllIds = deck.every(c => c.id && c.id.startsWith('card_'));
  report += `   - 所有卡牌都有ID: ${hasAllIds ? '✓ 通过' : '✗ 失败'}\n`;
  if (!hasAllIds) allPassed = false;
  
  const hasAllNames = deck.every(c => c.name && c.name.length > 0);
  report += `   - 所有卡牌都有名称: ${hasAllNames ? '✓ 通过' : '✗ 失败'}\n`;
  if (!hasAllNames) allPassed = false;
  
  const hasAllTypes = deck.every(c => c.type);
  report += `   - 所有卡牌都有类型: ${hasAllTypes ? '✓ 通过' : '✗ 失败'}\n`;
  if (!hasAllTypes) allPassed = false;
  
  const hasAllSuits = deck.every(c => c.suit);
  report += `   - 所有卡牌都有花色: ${hasAllSuits ? '✓ 通过' : '✗ 失败'}\n`;
  if (!hasAllSuits) allPassed = false;
  
  const hasAllNumbers = deck.every(c => c.number >= 1 && c.number <= 13);
  report += `   - 所有卡牌都有点数: ${hasAllNumbers ? '✓ 通过' : '✗ 失败'}\n`;
  if (!hasAllNumbers) allPassed = false;
  
  const hasAllColors = deck.every(c => c.color);
  report += `   - 所有卡牌都有颜色: ${hasAllColors ? '✓ 通过' : '✗ 失败'}\n`;
  if (!hasAllColors) allPassed = false;
  
  const hasAllDescriptions = deck.every(c => c.description && c.description.length > 0);
  report += `   - 所有卡牌都有描述: ${hasAllDescriptions ? '✓ 通过' : '✗ 失败'}\n\n`;
  if (!hasAllDescriptions) allPassed = false;

  // 装备牌验证
  const equipmentCards = deck.filter(c => c.type === CardType.EQUIPMENT);
  report += '3. 装备牌验证:\n';
  report += `   - 装备牌数量: ${equipmentCards.length} 张\n`;
  
  const hasAllEquipTypes = equipmentCards.every(c => c.equipmentType);
  report += `   - 所有装备牌都有装备类型: ${hasAllEquipTypes ? '✓ 通过' : '✗ 失败'}\n`;
  if (!hasAllEquipTypes) allPassed = false;
  
  const weapons = equipmentCards.filter(c => c.equipmentType === EquipmentType.WEAPON);
  report += `   - 武器牌数量: ${weapons.length} 张\n`;
  
  const hasAllRanges = weapons.every(c => c.range && c.range >= 1);
  report += `   - 所有武器牌都有范围: ${hasAllRanges ? '✓ 通过' : '✗ 失败'}\n\n`;
  if (!hasAllRanges) allPassed = false;

  // 颜色验证
  const redCards = deck.filter(c => c.suit === '♥' || c.suit === '♦');
  const blackCards = deck.filter(c => c.suit === '♠' || c.suit === '♣');
  report += '4. 花色与颜色一致性验证:\n';
  report += `   - 红色卡牌数量: ${redCards.length} 张\n`;
  
  const redColorCorrect = redCards.every(c => c.color === 'red');
  report += `   - 红色卡牌颜色正确: ${redColorCorrect ? '✓ 通过' : '✗ 失败'}\n`;
  if (!redColorCorrect) allPassed = false;
  
  report += `   - 黑色卡牌数量: ${blackCards.length} 张\n`;
  
  const blackColorCorrect = blackCards.every(c => c.color === 'black');
  report += `   - 黑色卡牌颜色正确: ${blackColorCorrect ? '✓ 通过' : '✗ 失败'}\n\n`;
  if (!blackColorCorrect) allPassed = false;

  // 特定卡牌数量验证
  report += '5. 特定卡牌数量验证:\n';
  const cardCounts: Record<string, number> = {};
  deck.forEach(card => {
    cardCounts[card.name] = (cardCounts[card.name] || 0) + 1;
  });
  report += `   - 杀: ${cardCounts['杀']} 张 (期望: 33)\n`;
  report += `   - 火杀: ${cardCounts['火杀']} 张 (期望: 5)\n`;
  report += `   - 雷杀: ${cardCounts['雷杀']} 张 (期望: 9)\n`;
  report += `   - 闪: ${cardCounts['闪']} 张 (期望: 24)\n`;
  report += `   - 桃: ${cardCounts['桃']} 张 (期望: 12)\n`;
  report += `   - 酒: ${cardCounts['酒']} 张 (期望: 5)\n`;
  report += `   - 无中生有: ${cardCounts['无中生有']} 张 (期望: 4)\n`;
  report += `   - 诸葛连弩: ${cardCounts['诸葛连弩']} 张 (期望: 2)\n\n`;

  // 验证配置与实际创建的一致性
  report += '6. 配置与实际创建一致性验证:\n';
  let allCardsMatched = true;
  const missingCards: string[] = [];

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

  report += `   - 所有配置卡牌都已创建: ${allCardsMatched ? '✓ 通过' : '✗ 失败'}\n`;
  if (missingCards.length > 0) {
    report += `   - 缺失的卡牌: ${missingCards.slice(0, 10).join(', ')}${missingCards.length > 10 ? `...等${missingCards.length}张` : ''}\n`;
    allPassed = false;
  }
  report += '\n';

  // 验证所有创建的卡牌都在配置中
  report += '7. 创建的卡牌有效性验证:\n';
  let allCardsValid = true;
  const invalidCards: string[] = [];

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

  report += `   - 所有创建的卡牌都有效: ${allCardsValid ? '✓ 通过' : '✗ 失败'}\n`;
  if (invalidCards.length > 0) {
    report += `   - 无效的卡牌: ${invalidCards.slice(0, 10).join(', ')}${invalidCards.length > 10 ? `...等${invalidCards.length}张` : ''}\n`;
    allPassed = false;
  }
  report += '\n';

  // 测试抽牌功能
  report += '8. 抽牌功能验证:\n';
  const testDeck = manager.createStandardDeck(true);
  const initialLength = testDeck.length;
  const result = manager.draw(testDeck, 5);
  report += `   - 初始牌堆: ${initialLength} 张\n`;
  report += `   - 抽取: ${result.cards.length} 张\n`;
  report += `   - 剩余: ${result.remaining.length} 张\n`;
  
  const drawTestPassed = result.cards.length === 5 && result.remaining.length === initialLength - 5;
  report += `   - 抽牌功能正常: ${drawTestPassed ? '✓ 通过' : '✗ 失败'}\n\n`;
  if (!drawTestPassed) allPassed = false;

  // 测试洗牌功能
  report += '9. 洗牌功能验证:\n';
  const originalDeck = manager.createStandardDeck(true);
  const originalIds = originalDeck.map(c => c.id);
  const shuffledDeck = manager.shuffle(originalDeck);
  const shuffledIds = shuffledDeck.map(c => c.id);
  const sameOrder = originalIds.every((id, i) => id === shuffledIds[i]);
  report += `   - 洗牌后牌数: ${shuffledDeck.length} 张\n`;
  report += `   - 洗牌改变了顺序: ${!sameOrder ? '✓ 通过' : '△ 顺序相同（概率性）'}\n`;
  
  const sameCards = new Set(originalIds).size === new Set(shuffledIds).size;
  report += `   - 卡牌ID集合一致: ${sameCards ? '✓ 通过' : '✗ 失败'}\n\n`;
  if (!sameCards) allPassed = false;

  // 打印部分卡牌示例
  report += '10. 卡牌示例:\n';
  report += '   基本牌示例:\n';
  deck.filter(c => c.type === CardType.BASIC).slice(0, 3).forEach(card => {
    report += `      - ${card.name} [${card.suit}${card.number}] (${card.color}) - ID: ${card.id}\n`;
  });
  report += '   锦囊牌示例:\n';
  deck.filter(c => c.type === CardType.SPELL).slice(0, 3).forEach(card => {
    report += `      - ${card.name} [${card.suit}${card.number}] (${card.color}) - ID: ${card.id}\n`;
  });
  report += '   装备牌示例:\n';
  deck.filter(c => c.type === CardType.EQUIPMENT).slice(0, 3).forEach(card => {
    const extra = card.equipmentType === EquipmentType.WEAPON ? ` 范围:${card.range}` : '';
    report += `      - ${card.name} [${card.suit}${card.number}] (${card.color})${extra} - ID: ${card.id}\n`;
  });
  report += '\n';

  // 最终总结
  report += '========== 验证总结 ==========\n';
  report += `验证结果: ${allPassed ? '✓ 所有测试通过' : '✗ 部分测试失败'}\n`;
  report += `牌堆中${allPassed ? '所有卡牌都能正常使用！' : '存在一些问题需要修复。'}\n`;

  return { success: allPassed, report };
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  // 浏览器环境
  console.log('请在控制台运行 validateDeckComprehensive() 来查看验证报告');
} else {
  // Node 环境
  const result = validateDeckComprehensive();
  console.log(result.report);
}
