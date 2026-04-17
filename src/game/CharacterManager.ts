import { Character, Kingdom, Gender, SkillTrigger, SkillContext } from '../types/game';
import { SkillManager } from './SkillManager';

// 新版技能系统导入
import {
  SkillRegistry,
  JianXiongSkill,
  FanKuiSkill,
  GuiCaiSkill,
  GangLieSkill,
  TuXiSkill,
  RenDeSkill,
  WuShengSkill,
  PaoXiaoSkill,
  GuanXingSkill,
  KongChengSkill,
  LongDanSkill,
  TieJiSkill,
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
  WuShuangSkill,
  JiJiuSkill,
  QingNangSkill,
  LiJianSkill,
  BiYueSkill,
  LuanJiSkill,
  JiuChiSkill,
  WanShaSkill,
  LuanWuSkill,
} from '../skills';

// 技能类映射表
const skillClassMap: Record<string, new () => any> = {
  jianxiong: JianXiongSkill,
  fankui: FanKuiSkill,
  guicai: GuiCaiSkill,
  ganglie: GangLieSkill,
  tuxi: TuXiSkill,
  rende: RenDeSkill,
  wusheng: WuShengSkill,
  paoxiao: PaoXiaoSkill,
  guanxing: GuanXingSkill,
  kongcheng: KongChengSkill,
  longdan: LongDanSkill,
  tieji: TieJiSkill,
  zhiheng: ZhiHengSkill,
  yingzi: YingZiSkill,
  fanjian: FanJianSkill,
  keji: KeJiSkill,
  kurou: KuRouSkill,
  guose: GuoSeSkill,
  liuli: LiuLiSkill,
  xiaoji: XiaoJiSkill,
  qianxun: QianXunSkill,
  lianying: LianYingSkill,
  wushuang: WuShuangSkill,
  jijiu: JiJiuSkill,
  qingnang: QingNangSkill,
  lijian: LiJianSkill,
  biyue: BiYueSkill,
  luanji: LuanJiSkill,
  jiuchi: JiuChiSkill,
  wansha: WanShaSkill,
  luanwu: LuanWuSkill,
};

// 武将技能映射表：武将ID -> 技能ID数组
const characterSkillMap: Record<string, string[]> = {
  caocao: ['jianxiong'],
  simayi: ['fankui', 'guicai'],
  xiahoudun: ['ganglie'],
  zhangliao: ['tuxi'],
  liubei: ['rende'],
  guanyu: ['wusheng'],
  zhangfei: ['paoxiao'],
  zhugeliang: ['guanxing', 'kongcheng'],
  zhaoyun: ['longdan'],
  machao: ['tieji'],
  sunquan: ['zhiheng'],
  zhouyu: ['yingzi', 'fanjian'],
  lumeng: ['keji'],
  huanggai: ['kurou'],
  daqiao: ['guose', 'liuli'],
  sunshangxiang: ['xiaoji'],
  luxun: ['qianxun', 'lianying'],
  lvbu: ['wushuang'],
  huatuo: ['jijiu', 'qingnang'],
  diaochan: ['lijian', 'biyue'],
  yuanshao: ['luanji'],
  dongzhuo: ['jiuchi'],
  jiaxu: ['wansha', 'luanwu'],
};

export class CharacterManager {
  private static instance: CharacterManager;
  private characters: Map<string, Character> = new Map();

  static getInstance(): CharacterManager {
    if (!CharacterManager.instance) {
      CharacterManager.instance = new CharacterManager();
      CharacterManager.instance.initCharacters();
    }
    return CharacterManager.instance;
  }

  /**
   * 根据场上武将注册技能（游戏开始时调用）
   * @param characterIds 场上武将ID列表
   */
  registerSkillsForCharacters(characterIds: string[]): void {
    const registry = SkillRegistry.getInstance();
    const registeredSkills = new Set<string>();

    console.log('根据场上武将注册技能:', characterIds);

    for (const characterId of characterIds) {
      const skillIds = characterSkillMap[characterId];
      if (skillIds) {
        for (const skillId of skillIds) {
          const skillClass = skillClassMap[skillId];
          if (skillClass && !registeredSkills.has(skillId)) {
            registry.register(skillClass);
            registeredSkills.add(skillId);
            console.log(`注册技能: ${skillId}`);
          }
        }
      }
    }

    console.log(`技能注册完成，共注册 ${registeredSkills.size} 个技能`);
  }

  /**
   * 重置技能注册状态（用于重新开始游戏）
   */
  resetSkillRegistration(): void {
    const registry = SkillRegistry.getInstance();
    registry.clear();
    console.log('技能注册状态已重置');
  }

  /**
   * 获取武将的技能ID列表
   * @param characterId 武将ID
   */
  getCharacterSkillIds(characterId: string): string[] {
    return characterSkillMap[characterId] || [];
  }

  private initCharacters() {
    // 魏国武将
    this.addCharacter({
      id: 'caocao',
      name: '曹操',
      kingdom: Kingdom.WEI,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'jianxiong',
          name: '奸雄',
          description: '当你受到伤害后，你可以获得对你造成伤害的牌，并摸一张牌。',
          trigger: SkillTrigger.ON_DAMAGE,
          isPassive: false,
          skillClassName: 'jianxiong',
          execute: (context: SkillContext) => {
            SkillManager.jianxiong(context);
          },
        },
      ],
      avatar: '/avatars/caocao.png',
    });

    this.addCharacter({
      id: 'simayi',
      name: '司马懿',
      kingdom: Kingdom.WEI,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      skills: [
        {
          id: 'fankui',
          name: '反馈',
          description: '当你受到伤害后，你可以获得伤害来源的一张牌。',
          trigger: SkillTrigger.ON_DAMAGE,
          isPassive: false,
          skillClassName: 'fankui',
          execute: (context: SkillContext) => {
            SkillManager.fankui(context);
          },
        },
        {
          id: 'guicai',
          name: '鬼才',
          description: '当一名角色的判定牌生效前，你可以打出一张手牌代替之。',
          trigger: SkillTrigger.BEFORE_PLAY,
          isPassive: false,
          skillClassName: 'guicai',
          execute: () => {
            // TODO: 实现判定牌替换逻辑
            console.log('【鬼才】技能待实现');
          },
        },
      ],
      avatar: '/avatars/simayi.png',
    });

    this.addCharacter({
      id: 'xiahoudun',
      name: '夏侯惇',
      kingdom: Kingdom.WEI,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'ganglie',
          name: '刚烈',
          description: '当你受到伤害后，你可以进行判定，若结果不为红桃，伤害来源弃置两张手牌或受到1点伤害。',
          trigger: SkillTrigger.ON_DAMAGE,
          isPassive: false,
          skillClassName: 'ganglie',
          execute: (context: SkillContext) => {
            SkillManager.ganglie(context);
          },
        },
      ],
      avatar: '/avatars/xiahoudun.png',
    });

    this.addCharacter({
      id: 'zhangliao',
      name: '张辽',
      kingdom: Kingdom.WEI,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'tuxi',
          name: '突袭',
          description: '摸牌阶段，你可以改为获得至多两名其他角色各一张手牌。',
          trigger: SkillTrigger.ON_DRAW,
          isPassive: false,
          skillClassName: 'tuxi',
          execute: (context: SkillContext) => {
            SkillManager.tuxi(context);
          },
        },
      ],
      avatar: '/avatars/zhangliao.png',
    });

    // 蜀国武将
    this.addCharacter({
      id: 'liubei',
      name: '刘备',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'rende',
          name: '仁德',
          description: '出牌阶段，你可以将任意张手牌交给其他角色，然后你回复1点体力。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'rende',
          execute: (context: SkillContext) => {
            SkillManager.rende(context);
          },
        },
      ],
      avatar: '/avatars/liubei.png',
    });

    this.addCharacter({
      id: 'guanyu',
      name: '关羽',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'wusheng',
          name: '武圣',
          description: '你可以将一张红色牌当【杀】使用或打出。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'wusheng',
          execute: (context: SkillContext) => {
            SkillManager.wusheng(context);
          },
        },
      ],
      avatar: '/avatars/guanyu.png',
    });

    this.addCharacter({
      id: 'zhangfei',
      name: '张飞',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'paoxiao',
          name: '咆哮',
          description: '锁定技，出牌阶段，你使用【杀】无次数限制。',
          trigger: SkillTrigger.PLAY,
          isPassive: true,
          skillClassName: 'paoxiao',
          execute: () => {
            // 被动技能，在GameEngine中处理
          },
        },
      ],
      avatar: '/avatars/zhangfei.png',
    });

    this.addCharacter({
      id: 'zhugeliang',
      name: '诸葛亮',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      skills: [
        {
          id: 'guanxing',
          name: '观星',
          description: '准备阶段，你可以观看牌堆顶的X张牌（X为存活角色数且至多为5），然后将这些牌以任意顺序置于牌堆顶或牌堆底。',
          trigger: SkillTrigger.TURN_START,
          isPassive: false,
          skillClassName: 'guanxing',
          execute: (context: SkillContext) => {
            SkillManager.guanxing(context);
          },
        },
        {
          id: 'kongcheng',
          name: '空城',
          description: '锁定技，若你没有手牌，你不能成为【杀】或【决斗】的目标。',
          trigger: SkillTrigger.ON_ATTACKED,
          isPassive: true,
          skillClassName: 'kongcheng',
          execute: () => {
            // 被动技能，在GameEngine中处理
          },
        },
      ],
      avatar: '/avatars/zhugeliang.png',
    });

    this.addCharacter({
      id: 'zhaoyun',
      name: '赵云',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'longdan',
          name: '龙胆',
          description: '你可以将一张【杀】当【闪】使用或打出，或将一张【闪】当【杀】使用或打出。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'longdan',
          execute: (context: SkillContext) => {
            SkillManager.longdan(context);
          },
        },
      ],
      avatar: '/avatars/zhaoyun.png',
    });

    this.addCharacter({
      id: 'machao',
      name: '马超',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'tieji',
          name: '铁骑',
          description: '当你使用【杀】指定目标后，你可以进行判定，若结果为红色，该角色不能使用【闪】响应此【杀】。',
          trigger: SkillTrigger.ON_ATTACKED,
          isPassive: false,
          skillClassName: 'tieji',
          execute: (context: SkillContext) => {
            SkillManager.tieji(context);
          },
        },
      ],
      avatar: '/avatars/machao.png',
    });

    // 吴国武将
    this.addCharacter({
      id: 'sunquan',
      name: '孙权',
      kingdom: Kingdom.WU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'zhiheng',
          name: '制衡',
          description: '出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'zhiheng',
          execute: (context: SkillContext) => {
            SkillManager.zhiheng(context);
          },
        },
      ],
      avatar: '/avatars/sunquan.png',
    });

    this.addCharacter({
      id: 'zhouyu',
      name: '周瑜',
      kingdom: Kingdom.WU,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      skills: [
        {
          id: 'yingzi',
          name: '英姿',
          description: '摸牌阶段，你可以多摸一张牌。',
          trigger: SkillTrigger.ON_DRAW,
          isPassive: true,
          skillClassName: 'yingzi',
          execute: (context: SkillContext) => {
            SkillManager.yingzi(context);
          },
        },
        {
          id: 'fanjian',
          name: '反间',
          description: '出牌阶段限一次，你可以展示一张手牌并交给一名其他角色，其选择一项：1.展示所有手牌并弃置与此牌同花色的牌；2.失去1点体力。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'fanjian',
          execute: (context: SkillContext) => {
            SkillManager.fanjian(context);
          },
        },
      ],
      avatar: '/avatars/zhouyu.png',
    });

    this.addCharacter({
      id: 'lumeng',
      name: '吕蒙',
      kingdom: Kingdom.WU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'keji',
          name: '克己',
          description: '若你于出牌阶段未使用或打出过【杀】，你可以跳过弃牌阶段。',
          trigger: SkillTrigger.ON_DISCARD,
          isPassive: true,
          skillClassName: 'keji',
          execute: () => {
            // 被动技能，在GameEngine中处理
          },
        },
      ],
      avatar: '/avatars/lumeng.png',
    });

    this.addCharacter({
      id: 'huanggai',
      name: '黄盖',
      kingdom: Kingdom.WU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'kurou',
          name: '苦肉',
          description: '出牌阶段，你可以失去1点体力，然后摸两张牌。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'kurou',
          execute: (context: SkillContext) => {
            SkillManager.kurou(context);
          },
        },
      ],
      avatar: '/avatars/huanggai.png',
    });

    this.addCharacter({
      id: 'daqiao',
      name: '大乔',
      kingdom: Kingdom.WU,
      gender: Gender.FEMALE,
      maxHp: 3,
      hp: 3,
      skills: [
        {
          id: 'guose',
          name: '国色',
          description: '你可以将一张方块牌当【乐不思蜀】使用。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'guose',
          execute: (context: SkillContext) => {
            SkillManager.guose(context);
          },
        },
        {
          id: 'liuli',
          name: '流离',
          description: '当你成为【杀】的目标时，你可以弃置一张牌，将此【杀】转移给你攻击范围内的另一名其他角色。',
          trigger: SkillTrigger.ON_ATTACKED,
          isPassive: false,
          skillClassName: 'liuli',
          execute: (context: SkillContext) => {
            SkillManager.liuli(context);
          },
        },
      ],
      avatar: '/avatars/daqiao.png',
    });

    this.addCharacter({
      id: 'sunshangxiang',
      name: '孙尚香',
      kingdom: Kingdom.WU,
      gender: Gender.FEMALE,
      maxHp: 3,
      hp: 3,
      skills: [
        {
          id: 'xiaoji',
          name: '枭姬',
          description: '当你失去装备区里的一张牌后，你可以摸两张牌。',
          trigger: SkillTrigger.ON_DISCARD,
          isPassive: false,
          skillClassName: 'xiaoji',
          execute: (context: SkillContext) => {
            SkillManager.xiaoji(context);
          },
        },
      ],
      avatar: '/avatars/sunshangxiang.png',
    });

    this.addCharacter({
      id: 'luxun',
      name: '陆逊',
      kingdom: Kingdom.WU,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      skills: [
        {
          id: 'qianxun',
          name: '谦逊',
          description: '锁定技，你不能成为【顺手牵羊】和【乐不思蜀】的目标。',
          trigger: SkillTrigger.ON_ATTACKED,
          isPassive: true,
          skillClassName: 'qianxun',
          execute: () => {
            // 被动技能，在GameEngine中处理
          },
        },
        {
          id: 'lianying',
          name: '连营',
          description: '当你失去最后的手牌后，你可以摸一张牌。',
          trigger: SkillTrigger.ON_DISCARD,
          isPassive: false,
          skillClassName: 'lianying',
          execute: (context: SkillContext) => {
            SkillManager.lianying(context);
          },
        },
      ],
      avatar: '/avatars/luxun.png',
    });

    // 群雄武将
    this.addCharacter({
      id: 'lvbu',
      name: '吕布',
      kingdom: Kingdom.QUN,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'wushuang',
          name: '无双',
          description: '锁定技，当你使用【杀】指定目标后，该角色需依次使用两张【闪】才能抵消；当你使用【决斗】指定目标后，该角色需依次打出两张【杀】才能响应。',
          trigger: SkillTrigger.ON_ATTACKED,
          isPassive: true,
          skillClassName: 'wushuang',
          execute: () => {
            // 被动技能，在GameEngine中处理
          },
        },
      ],
      avatar: '/avatars/lvbu.png',
    });

    this.addCharacter({
      id: 'huatuo',
      name: '华佗',
      kingdom: Kingdom.QUN,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      skills: [
        {
          id: 'jijiu',
          name: '急救',
          description: '你的回合外，你可以将一张红色牌当【桃】使用。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'jijiu',
          execute: (context: SkillContext) => {
            SkillManager.jijiu(context);
          },
        },
        {
          id: 'qingnang',
          name: '青囊',
          description: '出牌阶段限一次，你可以弃置一张手牌，令一名角色回复1点体力。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'qingnang',
          execute: (context: SkillContext) => {
            SkillManager.qingnang(context);
          },
        },
      ],
      avatar: '/avatars/huatuo.png',
    });

    this.addCharacter({
      id: 'diaochan',
      name: '貂蝉',
      kingdom: Kingdom.QUN,
      gender: Gender.FEMALE,
      maxHp: 3,
      hp: 3,
      skills: [
        {
          id: 'lijian',
          name: '离间',
          description: '出牌阶段限一次，你可以弃置一张牌，令一名男性角色视为对另一名男性角色使用一张【决斗】。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'lijian',
          execute: () => {
            // TODO: 实现离间技能
            console.log('离间技能待实现');
          },
        },
        {
          id: 'biyue',
          name: '闭月',
          description: '结束阶段，你可以摸一张牌。',
          trigger: SkillTrigger.TURN_END,
          isPassive: false,
          skillClassName: 'biyue',
          execute: (context: SkillContext) => {
            SkillManager.biyue(context);
          },
        },
      ],
      avatar: '/avatars/diaochan.png',
    });

    this.addCharacter({
      id: 'yuanshao',
      name: '袁绍',
      kingdom: Kingdom.QUN,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      skills: [
        {
          id: 'luanji',
          name: '乱击',
          description: '你可以将两张花色相同的手牌当【万箭齐发】使用。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'luanji',
          execute: (context: SkillContext) => {
            SkillManager.luanji(context);
          },
        },
      ],
      avatar: '/avatars/yuanshao.png',
    });

    this.addCharacter({
      id: 'dongzhuo',
      name: '董卓',
      kingdom: Kingdom.QUN,
      gender: Gender.MALE,
      maxHp: 8,
      hp: 8,
      skills: [
        {
          id: 'jiuchi',
          name: '酒池',
          description: '你可以将一张黑桃手牌当【酒】使用。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'jiuchi',
          execute: (context: SkillContext) => {
            SkillManager.jiuchi(context);
          },
        },
      ],
      avatar: '/avatars/dongzhuo.png',
    });

    this.addCharacter({
      id: 'jiaxu',
      name: '贾诩',
      kingdom: Kingdom.QUN,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      skills: [
        {
          id: 'wansha',
          name: '完杀',
          description: '锁定技，你的回合内，只有你和处于濒死状态的角色才能使用【桃】。',
          trigger: SkillTrigger.PLAY,
          isPassive: true,
          skillClassName: 'wansha',
          execute: () => {
            // 被动技能，在GameEngine中处理
          },
        },
        {
          id: 'luanwu',
          name: '乱武',
          description: '限定技，出牌阶段，你可以令所有其他角色依次选择一项：1.对距离最近的另一名角色使用一张【杀】；2.失去1点体力。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          skillClassName: 'luanwu',
          execute: (context: SkillContext) => {
            SkillManager.luanwu(context);
          },
        },
      ],
      avatar: '/avatars/jiaxu.png',
    });
  }

  private addCharacter(character: Character) {
    this.characters.set(character.id, character);
  }

  getCharacter(id: string): Character | undefined {
    return this.characters.get(id);
  }

  getAllCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  getRandomCharacters(count: number): Character[] {
    const all = this.getAllCharacters();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * 根据技能ID获取新版技能实例
   * @param skillId 技能ID
   */
  getSkillInstance(skillId: string) {
    const registry = SkillRegistry.getInstance();
    return registry.getSkill(skillId);
  }
}
