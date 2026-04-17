/**
 * 事件总线
 * 用于组件间的解耦通信
 */
export class EventBus {
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * 订阅事件
   * @param event 事件名称
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // 返回取消订阅函数
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * 取消订阅
   * @param event 事件名称
   * @param callback 回调函数
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param args 参数
   */
  emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`事件处理错误 [${event}]:`, error);
        }
      });
    }
  }

  /**
   * 只监听一次
   * @param event 事件名称
   * @param callback 回调函数
   */
  once(event: string, callback: Function): void {
    const onceCallback = (...args: any[]) => {
      this.off(event, onceCallback);
      callback(...args);
    };
    this.on(event, onceCallback);
  }

  /**
   * 清除所有监听
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * 获取事件监听数量
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }
}

// 全局事件总线实例
export const globalEventBus = new EventBus();
