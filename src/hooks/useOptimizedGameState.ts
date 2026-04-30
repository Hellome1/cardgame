import { useMemo, useCallback, useRef, useEffect } from 'react';
import type { GameState, Player, Card } from '../types/game';

/**
 * 优化的游戏状态 Hook
 * 提供记忆化的游戏状态查询，减少不必要的重渲染
 */
export function useOptimizedGameState(gameState: GameState | null) {
  const prevStateRef = useRef<GameState | null>(null);
  const cacheRef = useRef<Map<string, any>>(new Map());

  // 清除缓存当游戏状态发生关键变化时
  useEffect(() => {
    if (gameState?.round !== prevStateRef.current?.round) {
      cacheRef.current.clear();
    }
    prevStateRef.current = gameState;
  }, [gameState]);

  // 记忆化当前玩家
  const currentPlayer = useMemo(() => {
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex];
  }, [gameState?.currentPlayerIndex, gameState?.players]);

  // 记忆化人类玩家
  const humanPlayer = useMemo(() => {
    if (!gameState) return null;
    return gameState.players.find(p => !p.isAI);
  }, [gameState?.players]);

  // 记忆化主公
  const lordPlayer = useMemo(() => {
    if (!gameState) return null;
    return gameState.players.find(p => p.identity === 'lord');
  }, [gameState?.players]);

  // 记忆化玩家映射
  const playerMap = useMemo(() => {
    if (!gameState) return new Map();
    return new Map(gameState.players.map(p => [p.id, p]));
  }, [gameState?.players]);

  // 获取玩家（使用缓存）
  const getPlayer = useCallback((playerId: string): Player | undefined => {
    const cacheKey = `player_${playerId}`;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey);
    }
    const player = playerMap.get(playerId);
    cacheRef.current.set(cacheKey, player);
    return player;
  }, [playerMap]);

  // 记忆化卡牌映射
  const cardMap = useMemo(() => {
    if (!gameState) return new Map();
    const map = new Map<string, Card>();
    gameState.players.forEach(p => {
      p.handCards.forEach(c => map.set(c.id, c));
      // 添加装备区的卡牌
      if (p.equipment.weapon) map.set(p.equipment.weapon.id, p.equipment.weapon);
      if (p.equipment.armor) map.set(p.equipment.armor.id, p.equipment.armor);
      if (p.equipment.horsePlus) map.set(p.equipment.horsePlus.id, p.equipment.horsePlus);
      if (p.equipment.horseMinus) map.set(p.equipment.horseMinus.id, p.equipment.horseMinus);
    });
    gameState.discardPile.forEach(c => map.set(c.id, c));
    return map;
  }, [gameState?.players, gameState?.discardPile]);

  // 获取卡牌（使用缓存）
  const getCard = useCallback((cardId: string): Card | undefined => {
    const cacheKey = `card_${cardId}`;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey);
    }
    const card = cardMap.get(cardId);
    cacheRef.current.set(cacheKey, card);
    return card;
  }, [cardMap]);

  // 记忆化可玩卡牌列表
  const playableCards = useMemo(() => {
    if (!humanPlayer) return [];
    return humanPlayer.handCards.filter(card => {
      // 基础牌都可以出
      if (card.type === 'basic') return true;
      // 锦囊牌需要检查目标
      if (card.type === 'spell') {
        // 简化逻辑，实际应该根据卡牌效果判断
        return true;
      }
      // 装备牌都可以出
      if (card.type === 'equipment') return true;
      return false;
    });
  }, [humanPlayer?.handCards]);

  // 记忆化有效目标
  const validTargets = useMemo(() => {
    if (!gameState || !humanPlayer) return [];
    return gameState.players.filter(p =>
      p.id !== humanPlayer.id && p.character.hp > 0 && !p.isDead
    );
  }, [gameState?.players, humanPlayer?.id]);

  return {
    currentPlayer,
    humanPlayer,
    lordPlayer,
    playerMap,
    getPlayer,
    cardMap,
    getCard,
    playableCards,
    validTargets,
  };
}

/**
 * 优化的选择 Hook
 * 管理选择状态，避免不必要的重渲染
 */
export function useOptimizedSelection<T>() {
  const selectedRef = useRef<Set<T>>(new Set());
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const select = useCallback((item: T) => {
    selectedRef.current.add(item);
    forceUpdate();
  }, []);

  const deselect = useCallback((item: T) => {
    selectedRef.current.delete(item);
    forceUpdate();
  }, []);

  const toggle = useCallback((item: T) => {
    if (selectedRef.current.has(item)) {
      selectedRef.current.delete(item);
    } else {
      selectedRef.current.add(item);
    }
    forceUpdate();
  }, []);

  const clear = useCallback(() => {
    selectedRef.current.clear();
    forceUpdate();
  }, []);

  const isSelected = useCallback((item: T): boolean => {
    return selectedRef.current.has(item);
  }, []);

  const selected = useMemo(() => Array.from(selectedRef.current), []);

  return {
    selected,
    select,
    deselect,
    toggle,
    clear,
    isSelected,
  };
}

import { useReducer } from 'react';
