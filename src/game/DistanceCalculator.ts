import { Player } from '../types/game';

export class DistanceCalculator {
  /**
   * 计算两个玩家之间的距离（从 fromPlayer 到 toPlayer 的攻击距离）
   * 
   * 基础距离 = 座位之间的最短距离
   * 最终距离 = 基础距离 - fromPlayer的-1马 + toPlayer的+1马
   */
  static calculateDistance(fromPlayer: Player, toPlayer: Player, allPlayers: Player[]): number {
    if (fromPlayer.id === toPlayer.id) return 0;
    
    // 获取存活玩家列表（保持座位顺序）
    const alivePlayers = allPlayers.filter(p => !p.isDead);
    const fromIndex = alivePlayers.findIndex(p => p.id === fromPlayer.id);
    const toIndex = alivePlayers.findIndex(p => p.id === toPlayer.id);
    
    if (fromIndex === -1 || toIndex === -1) return Infinity;
    
    const totalPlayers = alivePlayers.length;
    
    // 计算顺时针距离
    const clockwiseDistance = (toIndex - fromIndex + totalPlayers) % totalPlayers;
    // 计算逆时针距离
    const counterClockwiseDistance = (fromIndex - toIndex + totalPlayers) % totalPlayers;
    
    // 基础距离取最短路径
    let baseDistance = Math.min(clockwiseDistance, counterClockwiseDistance);
    
    // 应用马的影响
    // -1马：减少与其他玩家的距离
    const horseMinus = fromPlayer.equipment.horseMinus ? 1 : 0;
    // +1马：增加其他玩家与自己的距离
    const horsePlus = toPlayer.equipment.horsePlus ? 1 : 0;
    
    const finalDistance = baseDistance - horseMinus + horsePlus;
    
    // 距离至少为1
    return Math.max(1, finalDistance);
  }
  
  /**
   * 获取玩家的攻击范围
   */
  static getAttackRange(player: Player): number {
    // 默认攻击范围为1（没有武器时）
    if (!player.equipment.weapon) {
      return 1;
    }
    // 有武器时使用武器的攻击范围
    return player.equipment.weapon.range || 1;
  }
  
  /**
   * 检查玩家是否可以攻击目标
   */
  static canAttack(fromPlayer: Player, toPlayer: Player, allPlayers: Player[]): boolean {
    const distance = this.calculateDistance(fromPlayer, toPlayer, allPlayers);
    const attackRange = this.getAttackRange(fromPlayer);
    return distance <= attackRange;
  }
  
  /**
   * 获取距离信息字符串（用于显示）
   */
  static getDistanceInfo(fromPlayer: Player, toPlayer: Player, allPlayers: Player[]): string {
    const distance = this.calculateDistance(fromPlayer, toPlayer, allPlayers);
    const attackRange = this.getAttackRange(fromPlayer);
    const canAttack = distance <= attackRange;
    
    return `距离: ${distance} (攻击范围: ${attackRange}) ${canAttack ? '✓' : '✗'}`;
  }
}
