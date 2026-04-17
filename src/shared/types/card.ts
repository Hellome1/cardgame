// 卡牌相关类型定义

import { CardType, CardSuit, CardColor, EquipmentType } from './enums';

// 卡牌接口
export interface Card {
  id: string;
  name: string;
  type: CardType;
  suit: CardSuit;
  number: number;
  color: CardColor;
  description: string;
  equipmentType?: EquipmentType;
  range?: number;
}

// 卡牌配置（用于创建牌堆）
export interface CardConfig {
  name: string;
  type: CardType;
  count: number;
  description: string;
  equipmentType?: EquipmentType;
  range?: number;
}
