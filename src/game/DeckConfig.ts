import { CardSuit, BasicCardName, SpellCardName, EquipmentType } from '../types/game';

/**
 * 牌堆配置
 * 根据 skills/card.md 中的定义精确配置每张牌
 */

// 卡牌定义接口
export interface CardDefinition {
  name: string;
  suit: CardSuit;
  number: number;
  type: 'basic' | 'spell' | 'equipment';
  equipmentType?: EquipmentType;
  range?: number;
  description: string;
}

// 普通杀 (33张)
const normalAttacks: CardDefinition[] = [
  // ♠ 11张: A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 1, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 2, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 3, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 4, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 5, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 6, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 7, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 8, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 9, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 10, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: 11, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  // ♥ 3张: 10, J, Q
  { name: BasicCardName.ATTACK, suit: CardSuit.HEART, number: 10, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.HEART, number: 11, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.HEART, number: 12, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  // ♣ 13张: A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 1, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 2, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 3, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 4, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 5, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 6, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 7, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 8, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 9, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 10, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 11, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 12, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: 13, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  // ♦ 6张: 6, 7, 8, 9, 10, K
  { name: BasicCardName.ATTACK, suit: CardSuit.DIAMOND, number: 6, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.DIAMOND, number: 7, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.DIAMOND, number: 8, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.DIAMOND, number: 9, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.DIAMOND, number: 10, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  { name: BasicCardName.ATTACK, suit: CardSuit.DIAMOND, number: 13, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' },
];

// 火杀 (5张)
const fireAttacks: CardDefinition[] = [
  // ♦ 3张: 4, 5, 6
  { name: BasicCardName.FIRE_ATTACK_CARD, suit: CardSuit.DIAMOND, number: 4, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点火焰伤害。' },
  { name: BasicCardName.FIRE_ATTACK_CARD, suit: CardSuit.DIAMOND, number: 5, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点火焰伤害。' },
  { name: BasicCardName.FIRE_ATTACK_CARD, suit: CardSuit.DIAMOND, number: 6, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点火焰伤害。' },
  // ♥ 2张: 4, 7
  { name: BasicCardName.FIRE_ATTACK_CARD, suit: CardSuit.HEART, number: 4, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点火焰伤害。' },
  { name: BasicCardName.FIRE_ATTACK_CARD, suit: CardSuit.HEART, number: 7, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点火焰伤害。' },
];

// 雷杀 (9张)
const thunderAttacks: CardDefinition[] = [
  // ♠ 5张: 4, 5, 6, 7, 8
  { name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.SPADE, number: 4, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' },
  { name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.SPADE, number: 5, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' },
  { name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.SPADE, number: 6, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' },
  { name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.SPADE, number: 7, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' },
  { name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.SPADE, number: 8, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' },
  // ♣ 4张: 5, 6, 7, 8
  { name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.CLUB, number: 5, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' },
  { name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.CLUB, number: 6, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' },
  { name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.CLUB, number: 7, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' },
  { name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.CLUB, number: 8, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' },
];

// 闪 (24张)
const dodges: CardDefinition[] = [
  // ♥ 12张: 2, 2, 8, 8, 9, 9, J, J, Q, Q, K, K
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 2, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 2, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 8, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 8, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 9, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 9, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 11, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 11, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 12, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 12, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 13, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.HEART, number: 13, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  // ♦ 12张: 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 2, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 2, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 3, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 4, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 5, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 6, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 7, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 8, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 9, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 10, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 11, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
  { name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: 12, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' },
];

// 桃 (12张)
const peaches: CardDefinition[] = [
  // ♥ 9张: 3, 4, 6, 7, 8, 9, Q, Q, K
  { name: BasicCardName.PEACH, suit: CardSuit.HEART, number: 3, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  { name: BasicCardName.PEACH, suit: CardSuit.HEART, number: 4, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  { name: BasicCardName.PEACH, suit: CardSuit.HEART, number: 6, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  { name: BasicCardName.PEACH, suit: CardSuit.HEART, number: 7, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  { name: BasicCardName.PEACH, suit: CardSuit.HEART, number: 8, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  { name: BasicCardName.PEACH, suit: CardSuit.HEART, number: 9, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  { name: BasicCardName.PEACH, suit: CardSuit.HEART, number: 12, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  { name: BasicCardName.PEACH, suit: CardSuit.HEART, number: 12, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  { name: BasicCardName.PEACH, suit: CardSuit.HEART, number: 13, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  // ♦ 3张: 2, 3, Q
  { name: BasicCardName.PEACH, suit: CardSuit.DIAMOND, number: 2, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  { name: BasicCardName.PEACH, suit: CardSuit.DIAMOND, number: 3, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
  { name: BasicCardName.PEACH, suit: CardSuit.DIAMOND, number: 12, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' },
];

// 酒 (5张)
const wines: CardDefinition[] = [
  // ♠ 2张: 3, 9
  { name: BasicCardName.WINE, suit: CardSuit.SPADE, number: 3, type: 'basic', description: '出牌阶段，对你使用。本回合下一张【杀】的伤害+1。当你处于濒死状态时，对你使用。你回复1点体力。' },
  { name: BasicCardName.WINE, suit: CardSuit.SPADE, number: 9, type: 'basic', description: '出牌阶段，对你使用。本回合下一张【杀】的伤害+1。当你处于濒死状态时，对你使用。你回复1点体力。' },
  // ♣ 2张: 3, 9
  { name: BasicCardName.WINE, suit: CardSuit.CLUB, number: 3, type: 'basic', description: '出牌阶段，对你使用。本回合下一张【杀】的伤害+1。当你处于濒死状态时，对你使用。你回复1点体力。' },
  { name: BasicCardName.WINE, suit: CardSuit.CLUB, number: 9, type: 'basic', description: '出牌阶段，对你使用。本回合下一张【杀】的伤害+1。当你处于濒死状态时，对你使用。你回复1点体力。' },
  // ♦ 1张: 9
  { name: BasicCardName.WINE, suit: CardSuit.DIAMOND, number: 9, type: 'basic', description: '出牌阶段，对你使用。本回合下一张【杀】的伤害+1。当你处于濒死状态时，对你使用。你回复1点体力。' },
];

// 导出所有基本牌
export const basicCards: CardDefinition[] = [
  ...normalAttacks,
  ...fireAttacks,
  ...thunderAttacks,
  ...dodges,
  ...peaches,
  ...wines,
];

// 锦囊牌 (42张)
export const spellCards: CardDefinition[] = [
  // 无中生有 4张: ♥7、♥8、♥9、♥J
  { name: SpellCardName.DRAW_TWO, suit: CardSuit.HEART, number: 7, type: 'spell', description: '出牌阶段，对你使用。你摸两张牌。' },
  { name: SpellCardName.DRAW_TWO, suit: CardSuit.HEART, number: 8, type: 'spell', description: '出牌阶段，对你使用。你摸两张牌。' },
  { name: SpellCardName.DRAW_TWO, suit: CardSuit.HEART, number: 9, type: 'spell', description: '出牌阶段，对你使用。你摸两张牌。' },
  { name: SpellCardName.DRAW_TWO, suit: CardSuit.HEART, number: 11, type: 'spell', description: '出牌阶段，对你使用。你摸两张牌。' },
  // 过河拆桥 6张: ♠3、♠4、♠Q、♥Q、♣3、♣4
  { name: SpellCardName.DISMANTLE, suit: CardSuit.SPADE, number: 3, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  { name: SpellCardName.DISMANTLE, suit: CardSuit.SPADE, number: 4, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  { name: SpellCardName.DISMANTLE, suit: CardSuit.SPADE, number: 12, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  { name: SpellCardName.DISMANTLE, suit: CardSuit.HEART, number: 12, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  { name: SpellCardName.DISMANTLE, suit: CardSuit.CLUB, number: 3, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  { name: SpellCardName.DISMANTLE, suit: CardSuit.CLUB, number: 4, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  // 顺手牵羊 5张: ♠3、♠4、♦3、♦4、♦J
  { name: SpellCardName.STEAL, suit: CardSuit.SPADE, number: 3, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。你获得其区域内的一张牌。' },
  { name: SpellCardName.STEAL, suit: CardSuit.SPADE, number: 4, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。你获得其区域内的一张牌。' },
  { name: SpellCardName.STEAL, suit: CardSuit.DIAMOND, number: 3, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。你获得其区域内的一张牌。' },
  { name: SpellCardName.STEAL, suit: CardSuit.DIAMOND, number: 4, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。你获得其区域内的一张牌。' },
  { name: SpellCardName.STEAL, suit: CardSuit.DIAMOND, number: 11, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。你获得其区域内的一张牌。' },
  // 无懈可击 7张: ♠J、♠K、♣Q、♣K、♦Q、♦K、♥K
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.SPADE, number: 11, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.SPADE, number: 13, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.CLUB, number: 12, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.CLUB, number: 13, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.DIAMOND, number: 12, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.DIAMOND, number: 13, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.HEART, number: 13, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  // 决斗 3张: ♠A、♦A、♣A
  { name: SpellCardName.DUEL, suit: CardSuit.SPADE, number: 1, type: 'spell', description: '出牌阶段，对一名其他角色使用。由其开始，你与其轮流打出一张【杀】，直到其中一方未打出【杀】为止。未打出【杀】的一方受到另一方造成的1点伤害。' },
  { name: SpellCardName.DUEL, suit: CardSuit.DIAMOND, number: 1, type: 'spell', description: '出牌阶段，对一名其他角色使用。由其开始，你与其轮流打出一张【杀】，直到其中一方未打出【杀】为止。未打出【杀】的一方受到另一方造成的1点伤害。' },
  { name: SpellCardName.DUEL, suit: CardSuit.CLUB, number: 1, type: 'spell', description: '出牌阶段，对一名其他角色使用。由其开始，你与其轮流打出一张【杀】，直到其中一方未打出【杀】为止。未打出【杀】的一方受到另一方造成的1点伤害。' },
  // 火攻 3张: ♥2、♥3、♦Q
  { name: SpellCardName.FIRE_ATTACK, suit: CardSuit.HEART, number: 2, type: 'spell', description: '出牌阶段，对一名有手牌的角色使用。其展示一张手牌，然后你可以弃置一张与其同花色的手牌，对其造成1点火焰伤害。' },
  { name: SpellCardName.FIRE_ATTACK, suit: CardSuit.HEART, number: 3, type: 'spell', description: '出牌阶段，对一名有手牌的角色使用。其展示一张手牌，然后你可以弃置一张与其同花色的手牌，对其造成1点火焰伤害。' },
  { name: SpellCardName.FIRE_ATTACK, suit: CardSuit.DIAMOND, number: 12, type: 'spell', description: '出牌阶段，对一名有手牌的角色使用。其展示一张手牌，然后你可以弃置一张与其同花色的手牌，对其造成1点火焰伤害。' },
  // 南蛮入侵 3张: ♠7、♠K、♣7
  { name: SpellCardName.SAVAGE, suit: CardSuit.SPADE, number: 7, type: 'spell', description: '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【杀】，否则受到你造成的1点伤害。' },
  { name: SpellCardName.SAVAGE, suit: CardSuit.SPADE, number: 13, type: 'spell', description: '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【杀】，否则受到你造成的1点伤害。' },
  { name: SpellCardName.SAVAGE, suit: CardSuit.CLUB, number: 7, type: 'spell', description: '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【杀】，否则受到你造成的1点伤害。' },
  // 万箭齐发 1张: ♥A
  { name: SpellCardName.ARCHERY, suit: CardSuit.HEART, number: 1, type: 'spell', description: '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  // 桃园结义 1张: ♥A
  { name: SpellCardName.PEACH_GARDEN, suit: CardSuit.HEART, number: 1, type: 'spell', description: '出牌阶段，对所有角色使用。每名角色回复1点体力。' },
  // 五谷丰登 2张: ♥3、♥4
  { name: SpellCardName.GRAIN, suit: CardSuit.HEART, number: 3, type: 'spell', description: '出牌阶段，对所有角色使用。你从牌堆顶亮出等同于角色数量的牌，每名目标角色获得其中一张。' },
  { name: SpellCardName.GRAIN, suit: CardSuit.HEART, number: 4, type: 'spell', description: '出牌阶段，对所有角色使用。你从牌堆顶亮出等同于角色数量的牌，每名目标角色获得其中一张。' },
  // 乐不思蜀 3张: ♠6、♥6、♣6
  { name: SpellCardName.INDULGENCE, suit: CardSuit.SPADE, number: 6, type: 'spell', description: '出牌阶段，对一名其他角色使用。将【乐不思蜀】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为红桃，则跳过其出牌阶段。' },
  { name: SpellCardName.INDULGENCE, suit: CardSuit.HEART, number: 6, type: 'spell', description: '出牌阶段，对一名其他角色使用。将【乐不思蜀】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为红桃，则跳过其出牌阶段。' },
  { name: SpellCardName.INDULGENCE, suit: CardSuit.CLUB, number: 6, type: 'spell', description: '出牌阶段，对一名其他角色使用。将【乐不思蜀】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为红桃，则跳过其出牌阶段。' },
  // 兵粮寸断 2张: ♣10、♠10
  { name: SpellCardName.SUPPLY_SHORTAGE, suit: CardSuit.CLUB, number: 10, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。将【兵粮寸断】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为梅花，则跳过其摸牌阶段。' },
  { name: SpellCardName.SUPPLY_SHORTAGE, suit: CardSuit.SPADE, number: 10, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。将【兵粮寸断】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为梅花，则跳过其摸牌阶段。' },
  // 闪电 2张: ♠A、♥Q
  { name: SpellCardName.LIGHTNING, suit: CardSuit.SPADE, number: 1, type: 'spell', description: '出牌阶段，对你使用。将【闪电】置于你的判定区里。你的判定阶段，需进行判定：若结果为黑桃2-9，则你受到3点雷电伤害，并将【闪电】弃置；否则，将【闪电】移动到下家的判定区里。' },
  { name: SpellCardName.LIGHTNING, suit: CardSuit.HEART, number: 12, type: 'spell', description: '出牌阶段，对你使用。将【闪电】置于你的判定区里。你的判定阶段，需进行判定：若结果为黑桃2-9，则你受到3点雷电伤害，并将【闪电】弃置；否则，将【闪电】移动到下家的判定区里。' },
];

// 装备牌 (24张)
export const equipmentCards: CardDefinition[] = [
  // 武器 (12张)
  { name: '诸葛连弩', suit: CardSuit.SPADE, number: 1, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 1, description: '锁定技，你于出牌阶段内使用【杀】无次数限制。' },
  { name: '诸葛连弩', suit: CardSuit.CLUB, number: 1, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 1, description: '锁定技，你于出牌阶段内使用【杀】无次数限制。' },
  { name: '青釭剑', suit: CardSuit.SPADE, number: 2, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 2, description: '锁定技，当你使用【杀】指定一名角色为目标后，你令其防具无效直到此【杀】结算完毕。' },
  { name: '雌雄双股剑', suit: CardSuit.SPADE, number: 2, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 2, description: '当你使用【杀】指定一名异性角色为目标后，你可以令其选择一项：弃置一张手牌，或令你摸一张牌。' },
  { name: '青龙偃月刀', suit: CardSuit.SPADE, number: 5, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 3, description: '当你使用的【杀】被【闪】抵消后，你可以弃置一张手牌，然后对目标角色再使用一张【杀】。' },
  { name: '丈八蛇矛', suit: CardSuit.SPADE, number: 12, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 3, description: '你可以将两张手牌当【杀】使用或打出。' },
  { name: '贯石斧', suit: CardSuit.DIAMOND, number: 5, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 3, description: '当你使用的【杀】被【闪】抵消后，你可以弃置两张牌，然后令此【杀】依然对其造成伤害。' },
  { name: '方天画戟', suit: CardSuit.DIAMOND, number: 12, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 4, description: '当你使用【杀】时，且此【杀】是你最后的手牌，你可以额外选择至多两名目标角色。' },
  { name: '麒麟弓', suit: CardSuit.HEART, number: 5, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 5, description: '当你使用【杀】对目标角色造成伤害时，你可以弃置其装备区里的一张坐骑牌。' },
  { name: '寒冰剑', suit: CardSuit.SPADE, number: 2, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 2, description: '当你使用【杀】对目标角色造成伤害时，若该角色有牌，你可以防止此伤害，改为弃置其两张牌。' },
  { name: '古锭刀', suit: CardSuit.SPADE, number: 1, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 2, description: '锁定技，当你使用【杀】指定目标后，若该角色没有手牌，此【杀】伤害+1。' },
  { name: '朱雀羽扇', suit: CardSuit.DIAMOND, number: 1, type: 'equipment', equipmentType: EquipmentType.WEAPON, range: 4, description: '你可以将一张普通【杀】当【火杀】使用。' },
  // 防具 (6张)
  { name: '八卦阵', suit: CardSuit.SPADE, number: 2, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '当你需要使用或打出【闪】时，你可以进行判定，若结果为红色，视为你使用或打出了一张【闪】。' },
  { name: '八卦阵', suit: CardSuit.CLUB, number: 2, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '当你需要使用或打出【闪】时，你可以进行判定，若结果为红色，视为你使用或打出了一张【闪】。' },
  { name: '仁王盾', suit: CardSuit.CLUB, number: 2, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '锁定技，黑色的【杀】对你无效。' },
  { name: '藤甲', suit: CardSuit.SPADE, number: 2, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '锁定技，【南蛮入侵】、【万箭齐发】和普通【杀】对你无效；当你受到火焰伤害时，此伤害+1。' },
  { name: '藤甲', suit: CardSuit.CLUB, number: 2, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '锁定技，【南蛮入侵】、【万箭齐发】和普通【杀】对你无效；当你受到火焰伤害时，此伤害+1。' },
  { name: '白银狮子', suit: CardSuit.CLUB, number: 1, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '锁定技，当你受到伤害时，若此伤害大于1点，则防止多余的伤害。当你失去装备区里的【白银狮子】后，你回复1点体力。' },
  // +1马 (3张)
  { name: '绝影', suit: CardSuit.SPADE, number: 5, type: 'equipment', equipmentType: EquipmentType.HORSE_PLUS, description: '锁定技，其他角色计算与你的距离时，始终+1。' },
  { name: '的卢', suit: CardSuit.SPADE, number: 5, type: 'equipment', equipmentType: EquipmentType.HORSE_PLUS, description: '锁定技，其他角色计算与你的距离时，始终+1。' },
  { name: '爪黄飞电', suit: CardSuit.HEART, number: 13, type: 'equipment', equipmentType: EquipmentType.HORSE_PLUS, description: '锁定技，其他角色计算与你的距离时，始终+1。' },
  // -1马 (3张)
  { name: '赤兔', suit: CardSuit.HEART, number: 5, type: 'equipment', equipmentType: EquipmentType.HORSE_MINUS, description: '锁定技，你计算与其他角色的距离时，始终-1。' },
  { name: '紫骍', suit: CardSuit.DIAMOND, number: 13, type: 'equipment', equipmentType: EquipmentType.HORSE_MINUS, description: '锁定技，你计算与其他角色的距离时，始终-1。' },
  { name: '大宛', suit: CardSuit.SPADE, number: 13, type: 'equipment', equipmentType: EquipmentType.HORSE_MINUS, description: '锁定技，你计算与其他角色的距离时，始终-1。' },
];

// 导出完整牌堆配置
export const fullDeckConfig: CardDefinition[] = [
  ...basicCards,
  ...spellCards,
  ...equipmentCards,
];

// 验证牌堆数量
export function validateDeck(): { isValid: boolean; total: number; counts: Record<string, number> } {
  const counts = {
    basic: basicCards.length,
    spell: spellCards.length,
    equipment: equipmentCards.length,
    total: fullDeckConfig.length,
  };

  return {
    isValid: counts.total === 154,
    total: counts.total,
    counts: {
      '基本牌': counts.basic,
      '锦囊牌': counts.spell,
      '装备牌': counts.equipment,
      '总计': counts.total,
    },
  };
}
