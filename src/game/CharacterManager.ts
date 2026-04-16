import { Character, Kingdom, Gender, SkillTrigger, SkillContext } from '../types/game';
import { SkillManager } from './SkillManager';

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
          execute: () => {},
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
          description: '摸牌阶段，你可以改为获得至多两名其他角色的各一张手牌。',
          trigger: SkillTrigger.ON_DRAW,
          isPassive: false,
          execute: () => {},
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
          description: '出牌阶段，你可以将任意张手牌交给其他角色，然后你于此阶段内给出第二张"仁德"牌时，你回复1点体力。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          execute: () => {},
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
          execute: () => {},
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
          description: '锁定技，你于出牌阶段内使用【杀】无次数限制。',
          trigger: SkillTrigger.PLAY,
          isPassive: true,
          execute: (context: SkillContext) => {
            SkillManager.paoxiao(context);
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
          description: '准备阶段，你可以观看牌堆顶的X张牌（X为存活角色数且至多为5），然后以任意顺序放回牌堆顶或牌堆底。',
          trigger: SkillTrigger.TURN_START,
          isPassive: false,
          execute: () => {},
        },
        {
          id: 'kongcheng',
          name: '空城',
          description: '锁定技，若你没有手牌，你不能成为【杀】或【决斗】的目标。',
          trigger: SkillTrigger.ON_ATTACKED,
          isPassive: true,
          execute: () => {},
        },
      ],
      avatar: '/avatars/zhugeliang.png',
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
          useLimit: 1,
          execute: () => {},
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
          execute: (context: SkillContext) => {
            SkillManager.yingzi(context);
          },
        },
        {
          id: 'fanjian',
          name: '反间',
          description: '出牌阶段限一次，你可以展示一张手牌并交给一名其他角色，其选择一种花色后获得此牌，若选择的花色与此牌不同，你对其造成1点伤害。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          useLimit: 1,
          execute: () => {
            // TODO: 实现反间逻辑
            console.log('【反间】技能待实现');
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
          description: '若你于出牌阶段内未使用或打出过【杀】，你可以跳过弃牌阶段。',
          trigger: SkillTrigger.TURN_END,
          isPassive: false,
          execute: () => {},
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
          execute: (context: SkillContext) => {
            SkillManager.kurou(context);
          },
        },
      ],
      avatar: '/avatars/huanggai.png',
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
          description: '锁定技，当你使用【杀】指定一个目标后，该角色需依次使用两张【闪】才能抵消；当你使用【决斗】指定一个目标后，或成为一名角色使用【决斗】的目标后，该角色需依次打出两张【杀】才能响应。',
          trigger: SkillTrigger.PLAY,
          isPassive: true,
          execute: (context: SkillContext) => {
            SkillManager.wushuang(context);
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
          trigger: SkillTrigger.ON_HEAL,
          isPassive: false,
          execute: (context: SkillContext) => {
            SkillManager.jijiu(context);
          },
        },
        {
          id: 'qingnang',
          name: '青囊',
          description: '出牌阶段限一次，你可以弃置一张手牌，然后令一名已受伤的角色回复1点体力。',
          trigger: SkillTrigger.PLAY,
          isPassive: false,
          useLimit: 1,
          execute: () => {
            // TODO: 实现青囊逻辑
            console.log('【青囊】技能待实现');
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
          useLimit: 1,
          execute: () => {
            // TODO: 实现离间逻辑
            console.log('【离间】技能待实现');
          },
        },
        {
          id: 'biyue',
          name: '闭月',
          description: '结束阶段，你可以摸一张牌。',
          trigger: SkillTrigger.TURN_END,
          isPassive: false,
          execute: (context) => {
            SkillManager.biyue(context);
          },
        },
      ],
      avatar: '/avatars/diaochan.png',
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
}
