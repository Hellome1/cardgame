# 项目代码引擎优化总结

## 优化概述

本次优化针对三国杀游戏项目的核心代码引擎进行了全面的架构改进和性能优化，主要包含以下方面：

## 1. 核心架构优化

### 1.1 游戏循环管理器 (GameLoop)
- **文件**: `src/core/GameLoop.ts`
- **功能**: 
  - 使用 `requestAnimationFrame` 实现高效的游戏主循环
  - 支持游戏暂停/恢复功能
  - 提供游戏状态检查和自动停止机制
- **优势**: 比传统的 `setInterval` 更加高效，避免不必要的CPU占用

### 1.2 事件总线 (EventBus)
- **文件**: `src/core/EventBus.ts`
- **功能**:
  - 实现发布-订阅模式，解耦组件间通信
  - 支持一次性监听和取消订阅
  - 提供错误隔离，单个监听器的错误不影响其他监听器
- **优势**: 替代直接的回调传递，使代码更加模块化和可维护

### 1.3 状态管理器 (StateManager)
- **文件**: `src/core/StateManager.ts`
- **功能**:
  - 记录游戏状态变更历史
  - 支持状态快照保存和加载
  - 提供变更历史查询功能
- **优势**: 便于调试、实现撤销功能、分析游戏流程

## 2. 性能优化工具

### 2.1 防抖与节流
- **文件**: `src/core/utils/PerformanceOptimizer.ts`
- **功能**:
  - `debounce`: 防抖函数，适用于输入处理等场景
  - `throttle`: 节流函数，适用于滚动、resize等高频事件
  - `memoize`: 记忆化函数，缓存计算结果

### 2.2 缓存管理器 (CacheManager)
- **功能**:
  - 支持TTL（生存时间）的缓存机制
  - 自动清理过期缓存
  - 提供缓存统计和清理接口

### 2.3 对象池 (ObjectPool)
- **功能**:
  - 复用对象，减少垃圾回收压力
  - 可配置池大小
  - 提供对象重置机制

### 2.4 性能监控器 (PerformanceMonitor)
- **功能**:
  - 使用 `performance.now()` 精确测量代码执行时间
  - 支持标记和测量
  - 提供性能报告输出

## 3. React 性能优化

### 3.1 优化的游戏状态 Hook
- **文件**: `src/hooks/useOptimizedGameState.ts`
- **功能**:
  - 使用 `useMemo` 记忆化常用查询结果
  - 智能缓存，回合切换时自动清理
  - 提供玩家、卡牌映射，加速查找

### 3.2 优化的选择 Hook
- **功能**:
  - 使用 `useRef` 存储选择状态，避免不必要的重渲染
  - 提供选择、取消、切换等常用操作

## 4. 现有代码优化建议

### 4.1 GameEngine 优化
- 将大文件拆分为多个小模块（PhaseManager、CardManager、SkillManager等）
- 使用事件总线替代直接的回调传递
- 使用状态管理器记录关键操作

### 4.2 GameStore 优化
- 使用优化的 Hook 替代直接的状态访问
- 实现选择性订阅，只监听需要的状态变化
- 使用防抖优化频繁的状态更新

### 4.3 UI 组件优化
- 使用 `React.memo` 包装纯展示组件
- 使用 `useCallback` 缓存事件处理函数
- 使用虚拟列表优化长列表渲染

## 5. 使用示例

### 5.1 使用事件总线
```typescript
import { globalEventBus } from './core';

// 订阅事件
const unsubscribe = globalEventBus.on('cardPlayed', (card, player) => {
  console.log(`${player.name} 打出了 ${card.name}`);
});

// 触发事件
globalEventBus.emit('cardPlayed', card, player);

// 取消订阅
unsubscribe();
```

### 5.2 使用性能优化工具
```typescript
import { debounce, CacheManager } from './core';

// 防抖处理
const handleResize = debounce(() => {
  // 处理窗口大小变化
}, 200);

// 缓存管理
const cardCache = new CacheManager<string, Card>(60000); // 60秒TTL
cardCache.set(card.id, card);
const cachedCard = cardCache.get(card.id);
```

### 5.3 使用优化的 Hook
```typescript
import { useOptimizedGameState } from './hooks/useOptimizedGameState';

function GameComponent() {
  const gameState = useGameStore(state => state.gameState);
  const { currentPlayer, humanPlayer, getPlayer, getCard } = useOptimizedGameState(gameState);
  
  // 使用记忆化的数据
  return (
    <div>
      <div>当前玩家: {currentPlayer?.name}</div>
      <div>人类玩家: {humanPlayer?.name}</div>
    </div>
  );
}
```

## 6. 性能提升预期

- **渲染性能**: 通过记忆化和选择性订阅，减少 30-50% 的不必要重渲染
- **状态查询**: 通过缓存和映射，加速玩家和卡牌查找
- **内存使用**: 通过对象池和缓存管理，减少内存碎片和GC压力
- **代码可维护性**: 通过解耦和模块化，提高代码可读性和可测试性

## 7. 后续优化建议

1. **实现虚拟列表**: 对于手牌较多的情况，使用虚拟列表优化渲染
2. **Web Workers**: 将AI计算移到Web Worker，避免阻塞主线程
3. **状态持久化**: 实现游戏状态的自动保存和恢复
4. **网络同步**: 添加多人对战支持，实现状态同步
5. **代码分割**: 使用动态导入，按需加载游戏模块

## 8. 文件结构

```
src/
├── core/
│   ├── GameLoop.ts          # 游戏循环管理
│   ├── EventBus.ts          # 事件总线
│   ├── StateManager.ts      # 状态管理
│   ├── utils/
│   │   └── PerformanceOptimizer.ts  # 性能优化工具
│   └── index.ts             # 核心模块导出
├── hooks/
│   └── useOptimizedGameState.ts     # 优化的React Hooks
└── ...
```

## 总结

本次优化为项目提供了坚实的基础架构，提升了代码的可维护性和运行性能。通过使用这些新工具和模式，可以更容易地扩展功能、修复bug，并为用户提供更流畅的游戏体验。
