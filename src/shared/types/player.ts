// 玩家相关类型定义

import { Card } from './card';
import { Identity } from './enums';
import { ISkill } from './skill';

// 延时锦囊牌区域
export interface DelayedSpellZone {
  indulgence?: Card;  // 乐不思蜀
  supplyShortage?: Card;  // 兵粮寸断
  lightning?: Card;  // 闪电
}

// 角色接口
export interface Character {
  id: string;
  name: string;
  kingdom: string;
  gender: string;
  maxHp: number;
  hp: number;
  skills: ISkill[];
  avatar: string;
}

// 玩家接口
export interface Player {
  id: string;
  character: Character;
  identity: Identity;
  handCards: Card[];
  equipment: {
    weapon?: Card;
    armor?: Card;
    horsePlus?: Card;
    horseMinus?: Card;
  };
  delayedSpells: DelayedSpellZone;
  isDead: boolean;
  isAI: boolean;
}
