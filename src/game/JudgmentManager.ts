import { Card, CardSuit, Player } from '../types/game';

/**
 * 判定类型枚举
 */
export enum JudgmentType {
  // 延时锦囊判定
  SUPPLY_SHORTAGE = 'supply_shortage',  // 兵粮寸断
  INDULGENCE = 'indulgence',            // 乐不思蜀
  LIGHTNING = 'lightning',              // 闪电
  
  // 装备判定
  BA_GUA = 'ba_gua',                    // 八卦阵
  
  // 技能判定（预留）
  // SKILL_XXX = 'skill_xxx',
}

/**
 * 判定类型显示名称
 */
export const JudgmentTypeNames: Record<JudgmentType, string> = {
  [JudgmentType.SUPPLY_SHORTAGE]: '兵粮寸断',
  [JudgmentType.INDULGENCE]: '乐不思蜀',
  [JudgmentType.LIGHTNING]: '闪电',
  [JudgmentType.BA_GUA]: '八卦阵',
};

/**
 * 判定结果
 */
export interface JudgmentResult {
  success: boolean;           // 判定是否成功
  judgeCard: Card;           // 判定牌
  message: string;           // 判定结果消息
  isEffective: boolean;      // 判定是否生效（用于动画显示）
}

/**
 * 判定执行选项
 */
export interface JudgmentOptions {
  player: Player;            // 进行判定的玩家
  judgeType: JudgmentType;   // 判定类型
  judgeCard: Card;           // 判定牌
  customMessage?: string;    // 自定义判定消息
}

/**
 * 判定管理器
 * 统一管理所有判定逻辑，提供可复用的判定功能
 */
export class JudgmentManager {
  
  /**
   * 执行判定
   * @param options 判定选项
   * @returns 判定结果
   */
  static executeJudgment(options: JudgmentOptions): JudgmentResult {
    const { player, judgeType, judgeCard, customMessage } = options;
    
    switch (judgeType) {
      case JudgmentType.SUPPLY_SHORTAGE:
        return this.judgeSupplyShortage(player, judgeCard);
      case JudgmentType.INDULGENCE:
        return this.judgeIndulgence(player, judgeCard);
      case JudgmentType.LIGHTNING:
        return this.judgeLightning(player, judgeCard);
      case JudgmentType.BA_GUA:
        return this.judgeBaGua(player, judgeCard);
      default:
        return this.createDefaultResult(player, judgeCard, customMessage);
    }
  }

  /**
   * 兵粮寸断判定
   * 梅花判定失效，其他生效
   */
  private static judgeSupplyShortage(player: Player, judgeCard: Card): JudgmentResult {
    const isClub = judgeCard.suit === CardSuit.CLUB;
    const suitName = this.getSuitName(judgeCard.suit);
    
    return {
      success: !isClub,  // 梅花判定失败（锦囊失效）
      judgeCard,
      isEffective: !isClub,
      message: `${player.character.name} 的【兵粮寸断】判定: ${judgeCard.suit}${judgeCard.number} ${suitName}，${isClub ? '判定失败，兵粮寸断失效' : '判定成功，跳过摸牌阶段'}`,
    };
  }

  /**
   * 乐不思蜀判定
   * 红桃判定失效，其他生效
   */
  private static judgeIndulgence(player: Player, judgeCard: Card): JudgmentResult {
    const isHeart = judgeCard.suit === CardSuit.HEART;
    const suitName = this.getSuitName(judgeCard.suit);
    
    return {
      success: !isHeart,  // 红桃判定失败（锦囊失效）
      judgeCard,
      isEffective: !isHeart,
      message: `${player.character.name} 的【乐不思蜀】判定: ${judgeCard.suit}${judgeCard.number} ${suitName}，${isHeart ? '判定失败，乐不思蜀失效' : '判定成功，跳过出牌阶段'}`,
    };
  }

  /**
   * 闪电判定
   * 黑桃2-9判定生效（受到伤害）
   */
  private static judgeLightning(player: Player, judgeCard: Card): JudgmentResult {
    const isSpade = judgeCard.suit === CardSuit.SPADE;
    const isInRange = judgeCard.number >= 2 && judgeCard.number <= 9;
    const isEffective = isSpade && isInRange;
    const suitName = this.getSuitName(judgeCard.suit);
    
    return {
      success: isEffective,
      judgeCard,
      isEffective,
      message: `${player.character.name} 的【闪电】判定: ${judgeCard.suit}${judgeCard.number} ${suitName}，${isEffective ? '判定成功，受到3点雷电伤害' : '判定失败，闪电转移给下家'}`,
    };
  }

  /**
   * 八卦阵判定
   * 红色判定成功（视为打出闪）
   */
  private static judgeBaGua(player: Player, judgeCard: Card): JudgmentResult {
    const isRed = judgeCard.color === 'red';
    const suitName = this.getSuitName(judgeCard.suit);
    
    return {
      success: isRed,
      judgeCard,
      isEffective: isRed,
      message: `${player.character.name} 的【八卦阵】判定: ${judgeCard.suit}${judgeCard.number} ${suitName}，${isRed ? '判定成功，视为打出【闪】' : '判定失败'}`,
    };
  }

  /**
   * 创建默认判定结果
   */
  private static createDefaultResult(
    player: Player, 
    judgeCard: Card, 
    customMessage?: string
  ): JudgmentResult {
    return {
      success: true,
      judgeCard,
      isEffective: true,
      message: customMessage || `${player.character.name} 判定: ${judgeCard.suit}${judgeCard.number}`,
    };
  }

  /**
   * 获取花色名称
   */
  private static getSuitName(suit: CardSuit): string {
    switch (suit) {
      case CardSuit.HEART: return '红桃';
      case CardSuit.DIAMOND: return '方块';
      case CardSuit.SPADE: return '黑桃';
      case CardSuit.CLUB: return '梅花';
      default: return '';
    }
  }

  /**
   * 获取判定类型的显示名称
   */
  static getJudgmentTypeName(judgeType: JudgmentType): string {
    return JudgmentTypeNames[judgeType] || '判定';
  }

  /**
   * 获取判定提示信息
   */
  static getJudgmentHint(judgeType: JudgmentType, isEffective: boolean): string {
    switch (judgeType) {
      case JudgmentType.SUPPLY_SHORTAGE:
        return isEffective ? '跳过摸牌阶段' : '梅花判定，兵粮寸断失效';
      case JudgmentType.INDULGENCE:
        return isEffective ? '跳过出牌阶段' : '红桃判定，乐不思蜀失效';
      case JudgmentType.LIGHTNING:
        return isEffective ? '受到3点雷电伤害' : '闪电转移给下家';
      case JudgmentType.BA_GUA:
        return isEffective ? '视为打出【闪】' : '判定失败';
      default:
        return '';
    }
  }
}
