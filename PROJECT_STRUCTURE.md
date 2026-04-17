# 项目结构优化方案

## 目录结构

```
src/
├── core/                          # 核心游戏逻辑
│   ├── engine/                    # 游戏引擎
│   │   └── GameEngine.ts         # 主游戏引擎
│   ├── manager/                   # 管理器
│   │   ├── CardManager.ts        # 卡牌管理
│   │   ├── CharacterManager.ts   # 角色管理
│   │   └── SkillManager.ts       # 技能管理（整合版）
│   ├── service/                   # 服务层
│   │   └── LoggerService.ts      # 统一日志服务
│   ├── skill/                     # 技能系统
│   │   ├── base/
│   │   │   └── Skill.ts          # 技能基类
│   │   ├── implementations/      # 技能实现
│   │   │   ├── WuSkills.ts       # 吴国技能
│   │   │   ├── WeiSkills.ts      # 魏国技能
│   │   │   ├── ShuSkills.ts      # 蜀国技能
│   │   │   └── QunSkills.ts      # 群雄技能
│   │   ├── SkillFactory.ts       # 技能工厂
│   │   └── index.ts              # 统一导出
│   └── index.ts                   # 核心模块导出
│
├── shared/                        # 共享资源
│   ├── types/                     # 类型定义
│   │   ├── index.ts              # 统一导出
│   │   ├── enums.ts              # 枚举类型
│   │   ├── card.ts               # 卡牌类型
│   │   ├── player.ts             # 玩家类型
│   │   ├── skill.ts              # 技能类型
│   │   └── game.ts               # 游戏状态类型
│   ├── constants/                 # 常量定义
│   │   └── game.ts               # 游戏常量
│   └── utils/                     # 工具函数
│       └── helpers.ts            # 辅助函数
│
├── components/                    # UI组件
│   ├── Card/
│   ├── PlayerAvatar/
│   ├── HandCards/
│   ├── GameBoard/
│   └── DebugSetup/
│
├── store/                         # 状态管理
│   └── gameStore.ts              # 游戏状态
│
└── App.tsx                        # 应用入口
```

## 主要改进点

### 1. 统一技能系统
- **旧问题**：两套技能系统并存（SkillManager 静态方法 + skills/ 类实现）
- **新方案**：
  - 使用 `SkillFactory` 统一管理技能注册和创建
  - 统一的 `Skill` 基类，支持主动、被动、锁定技
  - 所有技能实现放在 `core/skill/implementations/`

### 2. 类型定义集中管理
- **旧问题**：类型定义分散在多个文件中
- **新方案**：
  - 所有类型定义在 `shared/types/`
  - 按功能模块分离（card.ts, player.ts, skill.ts, game.ts）
  - 统一从 `shared/types/index.ts` 导出

### 3. 统一日志服务
- **旧问题**：日志分散在 Logger.ts、GameLogger.ts、console
- **新方案**：
  - 单例模式的 `LoggerService`
  - 分类日志方法（game, card, skill, deck）
  - 支持监听器模式

### 4. 清晰的模块边界
- **core/**: 纯游戏逻辑，不依赖 UI
- **shared/**: 共享类型和工具
- **components/**: 纯 UI 组件
- **store/**: 状态管理

## 迁移计划

### 第一阶段：类型定义
1. ✅ 创建 `shared/types/` 目录结构
2. ✅ 迁移枚举类型到 `enums.ts`
3. ✅ 创建分离的类型文件
4. ⏳ 更新所有导入语句

### 第二阶段：技能系统
1. ✅ 创建 `core/skill/base/Skill.ts`
2. ✅ 创建 `SkillFactory`
3. ⏳ 迁移技能实现到新目录
4. ⏳ 更新 CharacterManager 使用新技能系统
5. ⏳ 移除旧 SkillManager

### 第三阶段：日志系统
1. ✅ 创建 `LoggerService`
2. ⏳ 替换所有 console.log
3. ⏳ 移除旧的 Logger.ts 和 GameLogger.ts

### 第四阶段：游戏引擎
1. ⏳ 重构 GameEngine，拆分职责
2. ⏳ 创建 CardManager、CharacterManager 单例
3. ⏳ 优化状态同步机制

## 使用示例

### 使用新的类型定义
```typescript
import { Card, Player, GameState, SkillTrigger } from '../shared/types';
```

### 使用新的技能系统
```typescript
import { SkillFactory, ActiveSkill } from '../core/skill';

// 注册技能
SkillFactory.register('kurou', KuRouSkill);

// 创建技能实例
const skill = SkillFactory.create('kurou');
if (skill) {
  skill.execute(context);
}
```

### 使用新的日志服务
```typescript
import { logger } from '../core/service/LoggerService';

logger.game('游戏开始');
logger.skill('发动苦肉');
logger.deck('发牌后', deck, dealtCards);
```
