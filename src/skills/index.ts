// 导出技能基类和类型
export {
  Skill,
  PassiveSkill,
  LockedSkill,
  ActiveSkill,
  SkillType,
  type SkillContext,
  type SkillConfig,
  type SkillResult,
} from './base/Skill';

// 导出技能注册中心
export { SkillRegistry } from './SkillRegistry';

// 导出魏国技能
export {
  JianXiongSkill,
  FanKuiSkill,
  GuiCaiSkill,
  GangLieSkill,
  TuXiSkill,
} from './characters/WeiSkills';

// 导出蜀国技能
export {
  RenDeSkill,
  WuShengSkill,
  PaoXiaoSkill,
  GuanXingSkill,
  KongChengSkill,
  LongDanSkill,
  TieJiSkill,
} from './characters/ShuSkills';

// 导出吴国技能
export {
  ZhiHengSkill,
  YingZiSkill,
  FanJianSkill,
  KeJiSkill,
  KuRouSkill,
  GuoSeSkill,
  LiuLiSkill,
  XiaoJiSkill,
  QianXunSkill,
  LianYingSkill,
} from './characters/WuSkills';

// 导出群雄技能
export {
  WuShuangSkill,
  JiJiuSkill,
  QingNangSkill,
  LiJianSkill,
  BiYueSkill,
  LuanJiSkill,
  JiuChiSkill,
  WanShaSkill,
  LuanWuSkill,
} from './characters/QunSkills';

import { SkillRegistry } from './SkillRegistry';
import {
  JianXiongSkill,
  FanKuiSkill,
  GuiCaiSkill,
  GangLieSkill,
  TuXiSkill,
} from './characters/WeiSkills';
import {
  RenDeSkill,
  WuShengSkill,
  PaoXiaoSkill,
  GuanXingSkill,
  KongChengSkill,
  LongDanSkill,
  TieJiSkill,
} from './characters/ShuSkills';
import {
  ZhiHengSkill,
  YingZiSkill,
  FanJianSkill,
  KeJiSkill,
  KuRouSkill,
  GuoSeSkill,
  LiuLiSkill,
  XiaoJiSkill,
  QianXunSkill,
  LianYingSkill,
} from './characters/WuSkills';
import {
  WuShuangSkill,
  JiJiuSkill,
  QingNangSkill,
  LiJianSkill,
  BiYueSkill,
  LuanJiSkill,
  JiuChiSkill,
  WanShaSkill,
  LuanWuSkill,
} from './characters/QunSkills';

/**
 * 初始化技能系统
 * 注册所有武将技能
 */
export function initSkillSystem(): void {
  const registry = SkillRegistry.getInstance();

  // 注册魏国技能
  registry.registerMany([
    JianXiongSkill,
    FanKuiSkill,
    GuiCaiSkill,
    GangLieSkill,
    TuXiSkill,
  ]);

  // 注册蜀国技能
  registry.registerMany([
    RenDeSkill,
    WuShengSkill,
    PaoXiaoSkill,
    GuanXingSkill,
    KongChengSkill,
    LongDanSkill,
    TieJiSkill,
  ]);

  // 注册吴国技能
  registry.registerMany([
    ZhiHengSkill,
    YingZiSkill,
    FanJianSkill,
    KeJiSkill,
    KuRouSkill,
    GuoSeSkill,
    LiuLiSkill,
    XiaoJiSkill,
    QianXunSkill,
    LianYingSkill,
  ]);

  // 注册群雄技能
  registry.registerMany([
    WuShuangSkill,
    JiJiuSkill,
    QingNangSkill,
    LiJianSkill,
    BiYueSkill,
    LuanJiSkill,
    JiuChiSkill,
    WanShaSkill,
    LuanWuSkill,
  ]);

  console.log('技能系统初始化完成');
}
