import { Character, Kingdom, Gender } from '../types/game';

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
      avatar: '/avatars/caocao.png',
      skills: [],
    });

    this.addCharacter({
      id: 'simayi',
      name: '司马懿',
      kingdom: Kingdom.WEI,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      avatar: '/avatars/simayi.png',
      skills: [],
    });

    this.addCharacter({
      id: 'xiahoudun',
      name: '夏侯惇',
      kingdom: Kingdom.WEI,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/xiahoudun.png',
      skills: [],
    });

    this.addCharacter({
      id: 'zhangliao',
      name: '张辽',
      kingdom: Kingdom.WEI,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/zhangliao.png',
      skills: [],
    });

    // 蜀国武将
    this.addCharacter({
      id: 'liubei',
      name: '刘备',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/liubei.png',
      skills: [],
    });

    this.addCharacter({
      id: 'guanyu',
      name: '关羽',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/guanyu.png',
      skills: [],
    });

    this.addCharacter({
      id: 'zhangfei',
      name: '张飞',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/zhangfei.png',
      skills: [],
    });

    this.addCharacter({
      id: 'zhugeliang',
      name: '诸葛亮',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      avatar: '/avatars/zhugeliang.png',
      skills: [],
    });

    this.addCharacter({
      id: 'zhaoyun',
      name: '赵云',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/zhaoyun.png',
      skills: [],
    });

    this.addCharacter({
      id: 'machao',
      name: '马超',
      kingdom: Kingdom.SHU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/machao.png',
      skills: [],
    });

    // 吴国武将
    this.addCharacter({
      id: 'sunquan',
      name: '孙权',
      kingdom: Kingdom.WU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/sunquan.png',
      skills: [],
    });

    this.addCharacter({
      id: 'zhouyu',
      name: '周瑜',
      kingdom: Kingdom.WU,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      avatar: '/avatars/zhouyu.png',
      skills: [],
    });

    this.addCharacter({
      id: 'lumeng',
      name: '吕蒙',
      kingdom: Kingdom.WU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/lumeng.png',
      skills: [],
    });

    this.addCharacter({
      id: 'huanggai',
      name: '黄盖',
      kingdom: Kingdom.WU,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/huanggai.png',
      skills: [],
    });

    this.addCharacter({
      id: 'daqiao',
      name: '大乔',
      kingdom: Kingdom.WU,
      gender: Gender.FEMALE,
      maxHp: 3,
      hp: 3,
      avatar: '/avatars/daqiao.png',
      skills: [],
    });

    this.addCharacter({
      id: 'sunshangxiang',
      name: '孙尚香',
      kingdom: Kingdom.WU,
      gender: Gender.FEMALE,
      maxHp: 3,
      hp: 3,
      avatar: '/avatars/sunshangxiang.png',
      skills: [],
    });

    this.addCharacter({
      id: 'luxun',
      name: '陆逊',
      kingdom: Kingdom.WU,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      avatar: '/avatars/luxun.png',
      skills: [],
    });

    // 群雄武将
    this.addCharacter({
      id: 'lvbu',
      name: '吕布',
      kingdom: Kingdom.QUN,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/lvbu.png',
      skills: [],
    });

    this.addCharacter({
      id: 'huatuo',
      name: '华佗',
      kingdom: Kingdom.QUN,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      avatar: '/avatars/huatuo.png',
      skills: [],
    });

    this.addCharacter({
      id: 'diaochan',
      name: '貂蝉',
      kingdom: Kingdom.QUN,
      gender: Gender.FEMALE,
      maxHp: 3,
      hp: 3,
      avatar: '/avatars/diaochan.png',
      skills: [],
    });

    this.addCharacter({
      id: 'yuanshao',
      name: '袁绍',
      kingdom: Kingdom.QUN,
      gender: Gender.MALE,
      maxHp: 4,
      hp: 4,
      avatar: '/avatars/yuanshao.png',
      skills: [],
    });

    this.addCharacter({
      id: 'dongzhuo',
      name: '董卓',
      kingdom: Kingdom.QUN,
      gender: Gender.MALE,
      maxHp: 8,
      hp: 8,
      avatar: '/avatars/dongzhuo.png',
      skills: [],
    });

    this.addCharacter({
      id: 'jiaxu',
      name: '贾诩',
      kingdom: Kingdom.QUN,
      gender: Gender.MALE,
      maxHp: 3,
      hp: 3,
      avatar: '/avatars/jiaxu.png',
      skills: [],
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
