/**
 * 日志服务 - 将控制台日志和游戏记录分别保存到项目目录
 */

// 检测是否在Electron环境中
const isElectron = (): boolean => {
  // 使用最可靠的检测方式：检查 window.process.type
  if (typeof window !== 'undefined' && 
      typeof window.process === 'object' && 
      (window.process as any).type === 'renderer') {
    return true;
  }
  return false;
};

// 获取Electron IPC渲染器
const getElectronIpc = () => {
  if (!isElectron()) {
    console.log('[Logger] 不在Electron环境中运行');
    return null;
  }
  
  try {
    // 在Electron环境中，使用window.require
    const electron = (window as any).require('electron');
    if (electron && electron.ipcRenderer) {
      console.log('[Logger] 成功获取Electron IPC');
      return electron.ipcRenderer;
    }
  } catch (e) {
    console.error('[Logger] 获取Electron IPC失败:', e);
  }
  return null;
};

class Logger {
  private logs: string[] = [];
  private initialized = false;
  private ipcRenderer: any = null;
  private isElectronEnv: boolean = false;

  private originalConsole: { log: any; warn: any; error: any; info: any; debug: any } | null = null;

  constructor() {
    // 先保存原始 console 方法
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };
    
    this.isElectronEnv = isElectron();
    this.originalConsole.log('[Logger] 是否在Electron环境:', this.isElectronEnv);
    this.originalConsole.log('[Logger] userAgent:', navigator.userAgent);
    
    this.ipcRenderer = getElectronIpc();
    this.init();
    
    // 监听游戏日志事件
    this.setupEventListener();
    
    // 重写 console 方法以捕获所有控制台输出
    this.overrideConsole();
  }
  
  private setupEventListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('game-log', ((event: CustomEvent) => {
        const message = event.detail;
        if (message) {
          this.saveGameLog(message);
        }
      }) as EventListener);
      if (this.originalConsole) {
        this.originalConsole.log('[Logger] 已设置游戏日志事件监听器');
      }
    }
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    
    // 不清空之前的日志，保留历史记录
    this.logs = [];
    
    this.initialized = true;
    this.info('日志系统初始化完成');
  }

  // 重写 console 方法，将控制台输出保存到文件
  private overrideConsole(): void {
    if (!this.ipcRenderer || !this.originalConsole) return;
    
    const originalConsole = this.originalConsole;
    
    console.log = (...args: any[]) => {
      originalConsole.log.apply(console, args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this.saveConsoleLog('LOG', message);
    };
    
    console.warn = (...args: any[]) => {
      originalConsole.warn.apply(console, args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this.saveConsoleLog('WARN', message);
    };
    
    console.error = (...args: any[]) => {
      originalConsole.error.apply(console, args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this.saveConsoleLog('ERROR', message);
    };
    
    console.info = (...args: any[]) => {
      originalConsole.info.apply(console, args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this.saveConsoleLog('INFO', message);
    };
    
    console.debug = (...args: any[]) => {
      originalConsole.debug.apply(console, args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this.saveConsoleLog('DEBUG', message);
    };
    
    originalConsole.log('[Logger] 已重写 console 方法');
  }

  // 保存控制台日志
  private async saveConsoleLog(level: string, message: string): Promise<void> {
    if (!this.ipcRenderer) return;
    
    try {
      await this.ipcRenderer.invoke('save-console-log', level, message);
    } catch (e) {
      // 静默失败，避免循环错误
    }
  }

  // 保存游戏记录
  private async saveGameLog(message: string): Promise<void> {
    if (!this.ipcRenderer) return;
    
    try {
      await this.ipcRenderer.invoke('save-game-log', message);
    } catch (e) {
      console.error('[Logger] 保存游戏记录失败:', e);
    }
  }

  // 清空控制台日志
  async clearConsoleLogs(): Promise<void> {
    if (this.ipcRenderer) {
      try {
        await this.ipcRenderer.invoke('clear-console-logs');
      } catch (e) {
        console.error('[Logger] 清空控制台日志失败:', e);
      }
    }
  }

  // 清空游戏记录
  async clearGameLogs(): Promise<void> {
    if (this.ipcRenderer) {
      try {
        await this.ipcRenderer.invoke('clear-game-logs');
      } catch (e) {
        console.error('[Logger] 清空游戏记录失败:', e);
      }
    }
  }

  // 清空所有日志
  async clearAllLogs(): Promise<void> {
    await this.clearConsoleLogs();
    await this.clearGameLogs();
  }

  // 以下方法保持向后兼容，用于直接记录到内存
  info(message: string): void {
    const logEntry = `[INFO] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  warn(message: string): void {
    const logEntry = `[WARN] ${message}`;
    this.logs.push(logEntry);
    console.warn(logEntry);
  }

  error(message: string): void {
    const logEntry = `[ERROR] ${message}`;
    this.logs.push(logEntry);
    console.error(logEntry);
  }

  debug(message: string): void {
    const logEntry = `[DEBUG] ${message}`;
    this.logs.push(logEntry);
    console.debug(logEntry);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  // 导出日志（手动导出功能保留）
  exportLogs(): void {
    const content = this.logs.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cardgame_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

export const logger = getLogger();

export function logInfo(message: string): void {
  getLogger().info(message);
}

export function logWarn(message: string): void {
  getLogger().warn(message);
}

export function logError(message: string): void {
  getLogger().error(message);
}

export function logDebug(message: string): void {
  getLogger().debug(message);
}

export default logger;
