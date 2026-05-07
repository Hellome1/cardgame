// 简单的牌堆验证脚本
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 模拟类型定义
const CardType = {
  BASIC: 'basic',
  EQUIPMENT: 'equipment',
  SPELL: 'spell'
};

const CardSuit = {
  SPADE: '♠',
  HEART: '♥',
  CLUB: '♣',
  DIAMOND: '♦'
};

const CardColor = {
  RED: 'red',
  BLACK: 'black'
};

const BasicCardName = {
  ATTACK: '杀',
  THUNDER_ATTACK: '雷杀',
  FIRE_ATTACK_CARD: '火杀',
  DODGE: '闪',
  PEACH: '桃',
  WINE: '酒'
};

const SpellCardName = {
  DUEL: '决斗',
  FIRE_ATTACK: '火攻',
  STEAL: '顺手牵羊',
  DISMANTLE: '过河拆桥',
  PEACH_GARDEN: '桃园结义',
  ARCHERY: '万箭齐发',
  SAVAGE: '南蛮入侵',
  DRAW_TWO: '无中生有',
  NULLIFICATION: '无懈可击',
  GRAIN: '五谷丰登',
  IRON_CHAIN: '铁索连环',
  INDULGENCE: '乐不思蜀',
  SUPPLY_SHORTAGE: '兵粮寸断',
  LIGHTNING: '闪电'
};

const EquipmentType = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  HORSE_PLUS: 'horsePlus',
  HORSE_MINUS: 'horseMinus'
};

// 牌堆配置（从 DeckConfig.ts 复制）
const normalAttacks = [
  ...[1,2,3,4,5,6,7,8,9,10,11].map(n => ({ name: BasicCardName.ATTACK, suit: CardSuit.SPADE, number: n, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' })),
  ...[10,11,12].map(n => ({ name: BasicCardName.ATTACK, suit: CardSuit.HEART, number: n, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' })),
  ...[1,2,3,4,5,6,7,8,9,10,11,12,13].map(n => ({ name: BasicCardName.ATTACK, suit: CardSuit.CLUB, number: n, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' })),
  ...[6,7,8,9,10,13].map(n => ({ name: BasicCardName.ATTACK, suit: CardSuit.DIAMOND, number: n, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点伤害。' })),
];

const fireAttacks = [
  ...[4,5,6].map(n => ({ name: BasicCardName.FIRE_ATTACK_CARD, suit: CardSuit.DIAMOND, number: n, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点火焰伤害。' })),
  ...[4,7].map(n => ({ name: BasicCardName.FIRE_ATTACK_CARD, suit: CardSuit.HEART, number: n, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点火焰伤害。' })),
];

const thunderAttacks = [
  ...[4,5,6,7,8].map(n => ({ name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.SPADE, number: n, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' })),
  ...[5,6,7,8].map(n => ({ name: BasicCardName.THUNDER_ATTACK, suit: CardSuit.CLUB, number: n, type: 'basic', description: '出牌阶段，对你攻击范围内的一名其他角色使用。该角色需打出一张【闪】，否则受到你造成的1点雷电伤害。' })),
];

const dodges = [
  ...[2,2,8,8,9,9,11,11,12,12,13,13].map(n => ({ name: BasicCardName.DODGE, suit: CardSuit.HEART, number: n, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' })),
  ...[2,2,3,4,5,6,7,8,9,10,11,12].map(n => ({ name: BasicCardName.DODGE, suit: CardSuit.DIAMOND, number: n, type: 'basic', description: '当你成为【杀】的目标时，可以打出一张【闪】来抵消该牌的效果。' })),
];

const peaches = [
  ...[3,4,6,7,8,9,12,12,13].map(n => ({ name: BasicCardName.PEACH, suit: CardSuit.HEART, number: n, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' })),
  ...[2,3,12].map(n => ({ name: BasicCardName.PEACH, suit: CardSuit.DIAMOND, number: n, type: 'basic', description: '出牌阶段，对你使用。目标角色回复1点体力。' })),
];

const wines = [
  { name: BasicCardName.WINE, suit: CardSuit.SPADE, number: 3, type: 'basic', description: '出牌阶段，对你使用。本回合下一张【杀】的伤害+1。当你处于濒死状态时，对你使用。你回复1点体力。' },
  { name: BasicCardName.WINE, suit: CardSuit.SPADE, number: 9, type: 'basic', description: '出牌阶段，对你使用。本回合下一张【杀】的伤害+1。当你处于濒死状态时，对你使用。你回复1点体力。' },
  { name: BasicCardName.WINE, suit: CardSuit.CLUB, number: 3, type: 'basic', description: '出牌阶段，对你使用。本回合下一张【杀】的伤害+1。当你处于濒死状态时，对你使用。你回复1点体力。' },
  { name: BasicCardName.WINE, suit: CardSuit.CLUB, number: 9, type: 'basic', description: '出牌阶段，对你使用。本回合下一张【杀】的伤害+1。当你处于濒死状态时，对你使用。你回复1点体力。' },
  { name: BasicCardName.WINE, suit: CardSuit.DIAMOND, number: 9, type: 'basic', description: '出牌阶段，对你使用。本回合下一张【杀】的伤害+1。当你处于濒死状态时，对你使用。你回复1点体力。' },
];

const basicCards = [...normalAttacks, ...fireAttacks, ...thunderAttacks, ...dodges, ...peaches, ...wines];

const spellCards = [
  // 无中生有
  { name: SpellCardName.DRAW_TWO, suit: CardSuit.HEART, number: 7, type: 'spell', description: '出牌阶段，对你使用。你摸两张牌。' },
  { name: SpellCardName.DRAW_TWO, suit: CardSuit.HEART, number: 8, type: 'spell', description: '出牌阶段，对你使用。你摸两张牌。' },
  { name: SpellCardName.DRAW_TWO, suit: CardSuit.HEART, number: 9, type: 'spell', description: '出牌阶段，对你使用。你摸两张牌。' },
  { name: SpellCardName.DRAW_TWO, suit: CardSuit.HEART, number: 11, type: 'spell', description: '出牌阶段，对你使用。你摸两张牌。' },
  // 过河拆桥
  { name: SpellCardName.DISMANTLE, suit: CardSuit.SPADE, number: 3, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  { name: SpellCardName.DISMANTLE, suit: CardSuit.SPADE, number: 4, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  { name: SpellCardName.DISMANTLE, suit: CardSuit.SPADE, number: 12, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  { name: SpellCardName.DISMANTLE, suit: CardSuit.HEART, number: 12, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  { name: SpellCardName.DISMANTLE, suit: CardSuit.CLUB, number: 3, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  { name: SpellCardName.DISMANTLE, suit: CardSuit.CLUB, number: 4, type: 'spell', description: '出牌阶段，对一名其他角色使用。你弃置其区域内的一张牌。' },
  // 顺手牵羊
  { name: SpellCardName.STEAL, suit: CardSuit.SPADE, number: 3, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。你获得其区域内的一张牌。' },
  { name: SpellCardName.STEAL, suit: CardSuit.SPADE, number: 4, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。你获得其区域内的一张牌。' },
  { name: SpellCardName.STEAL, suit: CardSuit.DIAMOND, number: 3, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。你获得其区域内的一张牌。' },
  { name: SpellCardName.STEAL, suit: CardSuit.DIAMOND, number: 4, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。你获得其区域内的一张牌。' },
  { name: SpellCardName.STEAL, suit: CardSuit.DIAMOND, number: 11, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。你获得其区域内的一张牌。' },
  // 无懈可击
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.SPADE, number: 11, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.SPADE, number: 13, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.CLUB, number: 12, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.CLUB, number: 13, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.DIAMOND, number: 12, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.DIAMOND, number: 13, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  { name: SpellCardName.NULLIFICATION, suit: CardSuit.HEART, number: 13, type: 'spell', description: '当一张锦囊牌对你生效前，对此牌使用。抵消该锦囊牌对你的效果。' },
  // 决斗
  { name: SpellCardName.DUEL, suit: CardSuit.SPADE, number: 1, type: 'spell', description: '出牌阶段，对一名其他角色使用。由其开始，你与其轮流打出一张【杀】，直到其中一方未打出【杀】为止。未打出【杀】的一方受到另一方造成的1点伤害。' },
  { name: SpellCardName.DUEL, suit: CardSuit.DIAMOND, number: 1, type: 'spell', description: '出牌阶段，对一名其他角色使用。由其开始，你与其轮流打出一张【杀】，直到其中一方未打出【杀】为止。未打出【杀】的一方受到另一方造成的1点伤害。' },
  { name: SpellCardName.DUEL, suit: CardSuit.CLUB, number: 1, type: 'spell', description: '出牌阶段，对一名其他角色使用。由其开始，你与其轮流打出一张【杀】，直到其中一方未打出【杀】为止。未打出【杀】的一方受到另一方造成的1点伤害。' },
  // 火攻
  { name: SpellCardName.FIRE_ATTACK, suit: CardSuit.HEART, number: 2, type: 'spell', description: '出牌阶段，对一名有手牌的角色使用。其展示一张手牌，然后你可以弃置一张与其同花色的手牌，对其造成1点火焰伤害。' },
  { name: SpellCardName.FIRE_ATTACK, suit: CardSuit.HEART, number: 3, type: 'spell', description: '出牌阶段，对一名有手牌的角色使用。其展示一张手牌，然后你可以弃置一张与其同花色的手牌，对其造成1点火焰伤害。' },
  { name: SpellCardName.FIRE_ATTACK, suit: CardSuit.DIAMOND, number: 12, type: 'spell', description: '出牌阶段，对一名有手牌的角色使用。其展示一张手牌，然后你可以弃置一张与其同花色的手牌，对其造成1点火焰伤害。' },
  // 南蛮入侵
  { name: SpellCardName.SAVAGE, suit: CardSuit.SPADE, number: 7, type: 'spell', description: '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【杀】，否则受到你造成的1点伤害。' },
  { name: SpellCardName.SAVAGE, suit: CardSuit.SPADE, number: 13, type: 'spell', description: '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【杀】，否则受到你造成的1点伤害。' },
  { name: SpellCardName.SAVAGE, suit: CardSuit.CLUB, number: 7, type: 'spell', description: '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【杀】，否则受到你造成的1点伤害。' },
  // 万箭齐发
  { name: SpellCardName.ARCHERY, suit: CardSuit.HEART, number: 1, type: 'spell', description: '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【闪】，否则受到你造成的1点伤害。' },
  // 桃园结义
  { name: SpellCardName.PEACH_GARDEN, suit: CardSuit.HEART, number: 1, type: 'spell', description: '出牌阶段，对所有角色使用。每名角色回复1点体力。' },
  // 五谷丰登
  { name: SpellCardName.GRAIN, suit: CardSuit.HEART, number: 3, type: 'spell', description: '出牌阶段，对所有角色使用。你从牌堆顶亮出等同于角色数量的牌，每名目标角色获得其中一张。' },
  { name: SpellCardName.GRAIN, suit: CardSuit.HEART, number: 4, type: 'spell', description: '出牌阶段，对所有角色使用。你从牌堆顶亮出等同于角色数量的牌，每名目标角色获得其中一张。' },
  // 铁索连环
  { name: SpellCardName.IRON_CHAIN, suit: CardSuit.SPADE, number: 11, type: 'spell', description: '出牌阶段，对一至两名角色使用。横置或重置这些角色的武将牌（被横置的角色处于"连环状态"）。当处于连环状态的一名角色受到属性伤害（火焰或雷电伤害）时，其他处于连环状态的角色依次受到同来源、同属性、同伤害值的伤害，然后重置所有受到该伤害角色的武将牌。' },
  { name: SpellCardName.IRON_CHAIN, suit: CardSuit.SPADE, number: 12, type: 'spell', description: '出牌阶段，对一至两名角色使用。横置或重置这些角色的武将牌（被横置的角色处于"连环状态"）。当处于连环状态的一名角色受到属性伤害（火焰或雷电伤害）时，其他处于连环状态的角色依次受到同来源、同属性、同伤害值的伤害，然后重置所有受到该伤害角色的武将牌。' },
  { name: SpellCardName.IRON_CHAIN, suit: CardSuit.CLUB, number: 11, type: 'spell', description: '出牌阶段，对一至两名角色使用。横置或重置这些角色的武将牌（被横置的角色处于"连环状态"）。当处于连环状态的一名角色受到属性伤害（火焰或雷电伤害）时，其他处于连环状态的角色依次受到同来源、同属性、同伤害值的伤害，然后重置所有受到该伤害角色的武将牌。' },
  { name: SpellCardName.IRON_CHAIN, suit: CardSuit.CLUB, number: 12, type: 'spell', description: '出牌阶段，对一至两名角色使用。横置或重置这些角色的武将牌（被横置的角色处于"连环状态"）。当处于连环状态的一名角色受到属性伤害（火焰或雷电伤害）时，其他处于连环状态的角色依次受到同来源、同属性、同伤害值的伤害，然后重置所有受到该伤害角色的武将牌。' },
  { name: SpellCardName.IRON_CHAIN, suit: CardSuit.DIAMOND, number: 11, type: 'spell', description: '出牌阶段，对一至两名角色使用。横置或重置这些角色的武将牌（被横置的角色处于"连环状态"）。当处于连环状态的一名角色受到属性伤害（火焰或雷电伤害）时，其他处于连环状态的角色依次受到同来源、同属性、同伤害值的伤害，然后重置所有受到该伤害角色的武将牌。' },
  { name: SpellCardName.IRON_CHAIN, suit: CardSuit.DIAMOND, number: 12, type: 'spell', description: '出牌阶段，对一至两名角色使用。横置或重置这些角色的武将牌（被横置的角色处于"连环状态"）。当处于连环状态的一名角色受到属性伤害（火焰或雷电伤害）时，其他处于连环状态的角色依次受到同来源、同属性、同伤害值的伤害，然后重置所有受到该伤害角色的武将牌。' },
  // 乐不思蜀
  { name: SpellCardName.INDULGENCE, suit: CardSuit.SPADE, number: 6, type: 'spell', description: '出牌阶段，对一名其他角色使用。将【乐不思蜀】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为红桃，则跳过其出牌阶段。' },
  { name: SpellCardName.INDULGENCE, suit: CardSuit.HEART, number: 6, type: 'spell', description: '出牌阶段，对一名其他角色使用。将【乐不思蜀】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为红桃，则跳过其出牌阶段。' },
  { name: SpellCardName.INDULGENCE, suit: CardSuit.CLUB, number: 6, type: 'spell', description: '出牌阶段，对一名其他角色使用。将【乐不思蜀】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为红桃，则跳过其出牌阶段。' },
  // 兵粮寸断
  { name: SpellCardName.SUPPLY_SHORTAGE, suit: CardSuit.CLUB, number: 10, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。将【兵粮寸断】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为梅花，则跳过其摸牌阶段。' },
  { name: SpellCardName.SUPPLY_SHORTAGE, suit: CardSuit.SPADE, number: 10, type: 'spell', description: '出牌阶段，对距离为1的一名其他角色使用。将【兵粮寸断】置于该角色的判定区里。该角色的判定阶段，需进行判定：若结果不为梅花，则跳过其摸牌阶段。' },
  // 闪电
  { name: SpellCardName.LIGHTNING, suit: CardSuit.SPADE, number: 1, type: 'spell', description: '出牌阶段，对你使用。将【闪电】置于你的判定区里。你的判定阶段，需进行判定：若结果为黑桃2-9，则你受到3点雷电伤害，并将【闪电】弃置；否则，将【闪电】移动到下家的判定区里。' },
  { name: SpellCardName.LIGHTNING, suit: CardSuit.HEART, number: 12, type: 'spell', description: '出牌阶段，对你使用。将【闪电】置于你的判定区里。你的判定阶段，需进行判定：若结果为黑桃2-9，则你受到3点雷电伤害，并将【闪电】弃置；否则，将【闪电】移动到下家的判定区里。' },
];

const equipmentCards = [
  // 武器
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
  // 防具
  { name: '八卦阵', suit: CardSuit.SPADE, number: 2, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '当你需要使用或打出【闪】时，你可以进行判定，若结果为红色，视为你使用或打出了一张【闪】。' },
  { name: '八卦阵', suit: CardSuit.CLUB, number: 2, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '当你需要使用或打出【闪】时，你可以进行判定，若结果为红色，视为你使用或打出了一张【闪】。' },
  { name: '仁王盾', suit: CardSuit.CLUB, number: 2, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '锁定技，黑色的【杀】对你无效。' },
  { name: '藤甲', suit: CardSuit.SPADE, number: 2, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '锁定技，【南蛮入侵】、【万箭齐发】和普通【杀】对你无效；当你受到火焰伤害时，此伤害+1。' },
  { name: '藤甲', suit: CardSuit.CLUB, number: 2, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '锁定技，【南蛮入侵】、【万箭齐发】和普通【杀】对你无效；当你受到火焰伤害时，此伤害+1。' },
  { name: '白银狮子', suit: CardSuit.CLUB, number: 1, type: 'equipment', equipmentType: EquipmentType.ARMOR, description: '锁定技，当你受到伤害时，若此伤害大于1点，则防止多余的伤害。当你失去装备区里的【白银狮子】后，你回复1点体力。' },
  // +1马
  { name: '绝影', suit: CardSuit.SPADE, number: 5, type: 'equipment', equipmentType: EquipmentType.HORSE_PLUS, description: '锁定技，其他角色计算与你的距离时，始终+1。' },
  { name: '的卢', suit: CardSuit.SPADE, number: 5, type: 'equipment', equipmentType: EquipmentType.HORSE_PLUS, description: '锁定技，其他角色计算与你的距离时，始终+1。' },
  { name: '爪黄飞电', suit: CardSuit.HEART, number: 13, type: 'equipment', equipmentType: EquipmentType.HORSE_PLUS, description: '锁定技，其他角色计算与你的距离时，始终+1。' },
  // -1马
  { name: '赤兔', suit: CardSuit.HEART, number: 5, type: 'equipment', equipmentType: EquipmentType.HORSE_MINUS, description: '锁定技，你计算与其他角色的距离时，始终-1。' },
  { name: '紫骍', suit: CardSuit.DIAMOND, number: 13, type: 'equipment', equipmentType: EquipmentType.HORSE_MINUS, description: '锁定技，你计算与其他角色的距离时，始终-1。' },
  { name: '大宛', suit: CardSuit.SPADE, number: 13, type: 'equipment', equipmentType: EquipmentType.HORSE_MINUS, description: '锁定技，你计算与其他角色的距离时，始终-1。' },
];

const fullDeckConfig = [...basicCards, ...spellCards, ...equipmentCards];

// CardManager 模拟
class CardManager {
  static instance = null;
  static cardIdCounter = 0;

  static getInstance() {
    if (!CardManager.instance) {
      CardManager.instance = new CardManager();
    }
    return CardManager.instance;
  }

  generateId() {
    return `card_${++CardManager.cardIdCounter}`;
  }

  getSuitColor(suit) {
    return suit === CardSuit.HEART || suit === CardSuit.DIAMOND ? CardColor.RED : CardColor.BLACK;
  }

  createCardFromConfig(config) {
    const card = {
      id: this.generateId(),
      name: config.name,
      type: config.type,
      suit: config.suit,
      number: config.number,
      color: this.getSuitColor(config.suit),
      description: config.description,
    };

    if (config.type === 'equipment') {
      card.equipmentType = config.equipmentType;
      if (config.range !== undefined) {
        card.range = config.range;
      }
    }

    return card;
  }

  createStandardDeck(silent = false) {
    return fullDeckConfig.map(config => this.createCardFromConfig(config));
  }

  shuffle(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  draw(deck, count) {
    const actualCount = Math.min(count, deck.length);
    const cards = deck.splice(0, actualCount);
    return { cards, remaining: deck };
  }
}

// 验证函数
function validateDeck() {
  return {
    isValid: fullDeckConfig.length === 160,
    total: fullDeckConfig.length,
    counts: {
      '基本牌': basicCards.length,
      '锦囊牌': spellCards.length,
      '装备牌': equipmentCards.length,
      '总计': fullDeckConfig.length,
    }
  };
}

// 主验证逻辑
console.log('========== 牌堆详细验证报告 ==========\n');

let allPassed = true;

// 1. 验证配置
const validation = validateDeck();
console.log('1. 牌堆配置验证:');
console.log(`   - 基本牌: ${validation.counts['基本牌']} 张`);
console.log(`   - 锦囊牌: ${validation.counts['锦囊牌']} 张`);
console.log(`   - 装备牌: ${validation.counts['装备牌']} 张`);
console.log(`   - 总计: ${validation.counts['总计']} 张`);
console.log(`   - 验证结果: ${validation.isValid ? '✓ 通过' : '✗ 失败'}`);
if (!validation.isValid) allPassed = false;
console.log();

// 2. 创建牌堆并验证
const manager = CardManager.getInstance();
const deck = manager.createStandardDeck(true);

console.log('2. 卡牌创建验证:');
console.log(`   - 创建牌堆数量: ${deck.length} 张`);

const hasAllIds = deck.every(c => c.id && c.id.startsWith('card_'));
console.log(`   - 所有卡牌都有ID: ${hasAllIds ? '✓ 通过' : '✗ 失败'}`);
if (!hasAllIds) allPassed = false;

const hasAllNames = deck.every(c => c.name && c.name.length > 0);
console.log(`   - 所有卡牌都有名称: ${hasAllNames ? '✓ 通过' : '✗ 失败'}`);
if (!hasAllNames) allPassed = false;

const hasAllTypes = deck.every(c => c.type);
console.log(`   - 所有卡牌都有类型: ${hasAllTypes ? '✓ 通过' : '✗ 失败'}`);
if (!hasAllTypes) allPassed = false;

const hasAllSuits = deck.every(c => c.suit);
console.log(`   - 所有卡牌都有花色: ${hasAllSuits ? '✓ 通过' : '✗ 失败'}`);
if (!hasAllSuits) allPassed = false;

const hasAllNumbers = deck.every(c => c.number >= 1 && c.number <= 13);
console.log(`   - 所有卡牌都有点数: ${hasAllNumbers ? '✓ 通过' : '✗ 失败'}`);
if (!hasAllNumbers) allPassed = false;

const hasAllColors = deck.every(c => c.color);
console.log(`   - 所有卡牌都有颜色: ${hasAllColors ? '✓ 通过' : '✗ 失败'}`);
if (!hasAllColors) allPassed = false;

const hasAllDescriptions = deck.every(c => c.description && c.description.length > 0);
console.log(`   - 所有卡牌都有描述: ${hasAllDescriptions ? '✓ 通过' : '✗ 失败'}`);
if (!hasAllDescriptions) allPassed = false;
console.log();

// 3. 装备牌验证
const equipmentCardsCreated = deck.filter(c => c.type === CardType.EQUIPMENT);
console.log('3. 装备牌验证:');
console.log(`   - 装备牌数量: ${equipmentCardsCreated.length} 张`);

const hasAllEquipTypes = equipmentCardsCreated.every(c => c.equipmentType);
console.log(`   - 所有装备牌都有装备类型: ${hasAllEquipTypes ? '✓ 通过' : '✗ 失败'}`);
if (!hasAllEquipTypes) allPassed = false;

const weapons = equipmentCardsCreated.filter(c => c.equipmentType === EquipmentType.WEAPON);
console.log(`   - 武器牌数量: ${weapons.length} 张`);

const hasAllRanges = weapons.every(c => c.range && c.range >= 1);
console.log(`   - 所有武器牌都有范围: ${hasAllRanges ? '✓ 通过' : '✗ 失败'}`);
if (!hasAllRanges) allPassed = false;
console.log();

// 4. 颜色验证
const redCards = deck.filter(c => c.suit === '♥' || c.suit === '♦');
const blackCards = deck.filter(c => c.suit === '♠' || c.suit === '♣');
console.log('4. 花色与颜色一致性验证:');
console.log(`   - 红色卡牌数量: ${redCards.length} 张`);

const redColorCorrect = redCards.every(c => c.color === 'red');
console.log(`   - 红色卡牌颜色正确: ${redColorCorrect ? '✓ 通过' : '✗ 失败'}`);
if (!redColorCorrect) allPassed = false;

console.log(`   - 黑色卡牌数量: ${blackCards.length} 张`);

const blackColorCorrect = blackCards.every(c => c.color === 'black');
console.log(`   - 黑色卡牌颜色正确: ${blackColorCorrect ? '✓ 通过' : '✗ 失败'}`);
if (!blackColorCorrect) allPassed = false;
console.log();

// 5. 特定卡牌数量验证
console.log('5. 特定卡牌数量验证:');
const cardCounts = {};
deck.forEach(card => {
  cardCounts[card.name] = (cardCounts[card.name] || 0) + 1;
});
console.log(`   - 杀: ${cardCounts['杀']} 张 (期望: 33)`);
console.log(`   - 火杀: ${cardCounts['火杀']} 张 (期望: 5)`);
console.log(`   - 雷杀: ${cardCounts['雷杀']} 张 (期望: 9)`);
console.log(`   - 闪: ${cardCounts['闪']} 张 (期望: 24)`);
console.log(`   - 桃: ${cardCounts['桃']} 张 (期望: 12)`);
console.log(`   - 酒: ${cardCounts['酒']} 张 (期望: 5)`);
console.log(`   - 无中生有: ${cardCounts['无中生有']} 张 (期望: 4)`);
console.log(`   - 铁索连环: ${cardCounts['铁索连环']} 张 (期望: 6)`);
console.log(`   - 诸葛连弩: ${cardCounts['诸葛连弩']} 张 (期望: 2)`);
console.log();

// 6. 验证配置与实际创建的一致性
console.log('6. 配置与实际创建一致性验证:');
let allCardsMatched = true;
const missingCards = [];

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

console.log(`   - 所有配置卡牌都已创建: ${allCardsMatched ? '✓ 通过' : '✗ 失败'}`);
if (missingCards.length > 0) {
  console.log(`   - 缺失的卡牌: ${missingCards.slice(0, 10).join(', ')}${missingCards.length > 10 ? `...等${missingCards.length}张` : ''}`);
  allPassed = false;
}
console.log();

// 7. 验证所有创建的卡牌都在配置中
console.log('7. 创建的卡牌有效性验证:');
let allCardsValid = true;
const invalidCards = [];

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

console.log(`   - 所有创建的卡牌都有效: ${allCardsValid ? '✓ 通过' : '✗ 失败'}`);
if (invalidCards.length > 0) {
  console.log(`   - 无效的卡牌: ${invalidCards.slice(0, 10).join(', ')}${invalidCards.length > 10 ? `...等${invalidCards.length}张` : ''}`);
  allPassed = false;
}
console.log();

// 8. 测试抽牌功能
console.log('8. 抽牌功能验证:');
const testDeck = manager.createStandardDeck(true);
const initialLength = testDeck.length;
const result = manager.draw(testDeck, 5);
console.log(`   - 初始牌堆: ${initialLength} 张`);
console.log(`   - 抽取: ${result.cards.length} 张`);
console.log(`   - 剩余: ${result.remaining.length} 张`);

const drawTestPassed = result.cards.length === 5 && result.remaining.length === initialLength - 5;
console.log(`   - 抽牌功能正常: ${drawTestPassed ? '✓ 通过' : '✗ 失败'}`);
if (!drawTestPassed) allPassed = false;
console.log();

// 9. 测试洗牌功能
console.log('9. 洗牌功能验证:');
const originalDeck = manager.createStandardDeck(true);
const originalIds = originalDeck.map(c => c.id);
const shuffledDeck = manager.shuffle(originalDeck);
const shuffledIds = shuffledDeck.map(c => c.id);
const sameOrder = originalIds.every((id, i) => id === shuffledIds[i]);
console.log(`   - 洗牌后牌数: ${shuffledDeck.length} 张`);
console.log(`   - 洗牌改变了顺序: ${!sameOrder ? '✓ 通过' : '△ 顺序相同（概率性）'}`);

const sameCards = new Set(originalIds).size === new Set(shuffledIds).size;
console.log(`   - 卡牌ID集合一致: ${sameCards ? '✓ 通过' : '✗ 失败'}`);
if (!sameCards) allPassed = false;
console.log();

// 10. 卡牌示例
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
console.log();

// 最终总结
console.log('========== 验证总结 ==========');
console.log(`验证结果: ${allPassed ? '✓ 所有测试通过' : '✗ 部分测试失败'}`);
console.log(`牌堆中${allPassed ? '所有卡牌都能正常使用！' : '存在一些问题需要修复。'}`);

process.exit(allPassed ? 0 : 1);
