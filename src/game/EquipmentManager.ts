import { Player, Card, CardSuit, BasicCardName, SpellCardName } from '../types/game';
import { GameEngine } from './GameEngine';

/**
 * 装备效果管理器
 * 处理所有装备牌的特殊效果
 */
export class EquipmentManager {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  // ==================== 武器效果 ====================

  /**
   * 诸葛连弩：使用【杀】无次数限制
   * 在 canPlayCard 中检查
   */
  static hasUnlimitedAttacks(player: Player): boolean {
    return player.equipment.weapon?.name === '诸葛连弩';
  }

  /**
   * 青釭剑：无视目标防具
   * 在造成伤害时检查
   */
  static ignoresArmor(attacker: Player): boolean {
    return attacker.equipment.weapon?.name === '青釭剑';
  }

  /**
   * 雌雄双股剑：目标为异性时，可令其弃牌或自己摸牌
   * 在【杀】指定目标后触发，返回是否需要选择
   */
  static canTriggerCiXiong(attacker: Player, target: Player): boolean {
    if (attacker.equipment.weapon?.name !== '雌雄双股剑') return false;
    return attacker.character.gender !== target.character.gender;
  }

  /**
   * 青龙偃月刀：【杀】被闪抵消后，可继续出【杀】
   * 在响应阶段结束后检查
   */
  static canTriggerQingLong(attacker: Player): boolean {
    return attacker.equipment.weapon?.name === '青龙偃月刀';
  }

  /**
   * 丈八蛇矛：可将两张手牌当【杀】使用
   * 在手牌选择时提供额外选项
   */
  static canUseZhangBa(player: Player): boolean {
    return player.equipment.weapon?.name === '丈八蛇矛' && player.handCards.length >= 2;
  }

  /**
   * 贯石斧：【杀】被闪抵消后，可弃两张牌强制命中
   * 在响应阶段结束后检查
   */
  static canTriggerGuanShi(attacker: Player): boolean {
    return attacker.equipment.weapon?.name === '贯石斧' && attacker.handCards.length + (attacker.equipment.armor ? 1 : 0) >= 2;
  }

  /**
   * 方天画戟：最后一张手牌为【杀】时可额外指定目标
   * 在出牌时检查
   */
  static canTriggerFangTian(player: Player): boolean {
    return player.equipment.weapon?.name === '方天画戟' && player.handCards.length === 1;
  }

  /**
   * 麒麟弓：造成伤害时可弃置目标坐骑
   * 在造成伤害时检查
   */
  static canTriggerQiLin(attacker: Player, target: Player): boolean {
    if (attacker.equipment.weapon?.name !== '麒麟弓') return false;
    return !!(target.equipment.horsePlus || target.equipment.horseMinus);
  }

  /**
   * 寒冰剑：造成伤害时可防止伤害并弃置目标两张牌
   * 在造成伤害时检查
   */
  static canTriggerHanBing(attacker: Player, target: Player): boolean {
    if (attacker.equipment.weapon?.name !== '寒冰剑') return false;
    return target.handCards.length > 0 || target.equipment.weapon || target.equipment.armor;
  }

  /**
   * 古锭刀：目标无手牌时伤害+1
   * 在计算伤害时检查
   */
  static canTriggerGuDing(attacker: Player, target: Player): boolean {
    return attacker.equipment.weapon?.name === '古锭刀' && target.handCards.length === 0;
  }

  /**
   * 朱雀羽扇：可将普通【杀】当【火杀】使用
   * 在出牌时检查
   */
  static canConvertToFireAttack(player: Player, card: Card): boolean {
    return player.equipment.weapon?.name === '朱雀羽扇' && card.name === BasicCardName.ATTACK;
  }

  // ==================== 防具效果 ====================

  /**
   * 八卦阵：需要进行判定的【闪】
   * 在需要打出【闪】时触发
   */
  static canTriggerBaGua(player: Player): boolean {
    return player.equipment.armor?.name === '八卦阵';
  }

  /**
   * 仁王盾：黑色【杀】无效
   * 在成为黑色【杀】目标时检查
   */
  static isRenWangEffective(target: Player, attackCard: Card): boolean {
    if (target.equipment.armor?.name !== '仁王盾') return false;
    return attackCard.color === 'black';
  }

  /**
   * 藤甲：【南蛮入侵】、【万箭齐发】、普通【杀】无效，火焰伤害+1
   * 在受到伤害时检查
   */
  static isTengJiaEffective(target: Player, damageSource: Card | string, damageType?: 'normal' | 'fire' | 'thunder'): boolean {
    if (target.equipment.armor?.name !== '藤甲') return false;
    
    // 火焰伤害+1（在计算伤害时处理）
    if (damageType === 'fire') return false;
    
    // 检查是否为南蛮入侵、万箭齐发或普通杀
    if (typeof damageSource === 'string') {
      return damageSource === SpellCardName.SAVAGE || damageSource === SpellCardName.ARCHERY;
    }
    
    if (damageSource.name === SpellCardName.SAVAGE || 
        damageSource.name === SpellCardName.ARCHERY ||
        damageSource.name === BasicCardName.ATTACK) {
      return true;
    }
    
    return false;
  }

  /**
   * 藤甲：火焰伤害+1
   */
  static isTengJiaFireVulnerable(target: Player): boolean {
    return target.equipment.armor?.name === '藤甲';
  }

  /**
   * 白银狮子：伤害大于1时防止多余伤害，失去时回复1点体力
   * 在受到伤害时检查
   */
  static getBaiYinDamage(target: Player, damage: number): number {
    if (target.equipment.armor?.name !== '白银狮子') return damage;
    return 1; // 最多造成1点伤害
  }

  /**
   * 白银狮子：失去时回复体力
   * 在装备被替换或弃置时调用
   */
  static shouldHealOnRemoveBaiYin(player: Player): boolean {
    return player.equipment.armor?.name === '白银狮子';
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取武器攻击范围
   */
  static getWeaponRange(player: Player): number {
    return player.equipment.weapon?.range || 1;
  }

  /**
   * 检查是否有+1马
   */
  static hasHorsePlus(player: Player): boolean {
    return !!player.equipment.horsePlus;
  }

  /**
   * 检查是否有-1马
   */
  static hasHorseMinus(player: Player): boolean {
    return !!player.equipment.horseMinus;
  }

  /**
   * 获取装备名称列表
   */
  static getEquipmentNames(player: Player): string[] {
    const names: string[] = [];
    if (player.equipment.weapon) names.push(player.equipment.weapon.name);
    if (player.equipment.armor) names.push(player.equipment.armor.name);
    if (player.equipment.horsePlus) names.push(player.equipment.horsePlus.name);
    if (player.equipment.horseMinus) names.push(player.equipment.horseMinus.name);
    return names;
  }
}
