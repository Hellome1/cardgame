/**
 * 核心模块导出
 * 提供游戏引擎的核心功能
 */

// 游戏循环
export { GameLoop } from './GameLoop';

// 事件总线
export { EventBus, globalEventBus } from './EventBus';

// 状态管理
export { StateManager, globalStateManager } from './StateManager';

// 性能优化工具
export {
  debounce,
  throttle,
  memoize,
  CacheManager,
  ObjectPool,
  PerformanceMonitor,
} from './utils/PerformanceOptimizer';
