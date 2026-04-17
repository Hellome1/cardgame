const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;

// 控制台日志文件路径
const getConsoleLogFilePath = () => {
  const projectRoot = path.join(__dirname, '..');
  const logsDir = path.join(projectRoot, 'logs');
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().slice(0, 10);
  return path.join(logsDir, `console_${timestamp}.log`);
};

// 游戏记录日志文件路径
const getGameLogFilePath = () => {
  const projectRoot = path.join(__dirname, '..');
  const logsDir = path.join(projectRoot, 'logs');
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().slice(0, 10);
  return path.join(logsDir, `game_${timestamp}.log`);
};

// 牌堆日志文件路径（记录当前牌堆中的牌）
const getDeckLogFilePath = () => {
  const projectRoot = path.join(__dirname, '..');
  const logsDir = path.join(projectRoot, 'logs');
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().slice(0, 10);
  return path.join(logsDir, `deck_${timestamp}.log`);
};

// 弃牌堆日志文件路径（记录弃牌堆中的牌）
const getDiscardPileLogFilePath = () => {
  const projectRoot = path.join(__dirname, '..');
  const logsDir = path.join(projectRoot, 'logs');
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().slice(0, 10);
  return path.join(logsDir, `discard_pile_${timestamp}.log`);
};

// 保存控制台日志到文件
const saveConsoleLogToFile = (level, message) => {
  try {
    const logFilePath = getConsoleLogFilePath();
    const timestamp = new Date().toLocaleTimeString();
    const line = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(logFilePath, line, 'utf8');
    return { success: true, filePath: logFilePath };
  } catch (error) {
    console.error('保存控制台日志失败:', error);
    return { success: false, error: error.message };
  }
};

// 保存游戏记录到文件
const saveGameLogToFile = (logEntry) => {
  try {
    const logFilePath = getGameLogFilePath();
    const timestamp = new Date().toLocaleTimeString();
    const line = `[${timestamp}] ${logEntry}\n`;
    fs.appendFileSync(logFilePath, line, 'utf8');
    return { success: true, filePath: logFilePath };
  } catch (error) {
    console.error('保存游戏记录失败:', error);
    return { success: false, error: error.message };
  }
};

// 清空控制台日志文件
const clearConsoleLogFile = () => {
  try {
    const logFilePath = getConsoleLogFilePath();
    if (fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '', 'utf8');
    }
    return { success: true };
  } catch (error) {
    console.error('清空控制台日志失败:', error);
    return { success: false, error: error.message };
  }
};

// 清空游戏记录日志文件
const clearGameLogFile = () => {
  try {
    const logFilePath = getGameLogFilePath();
    if (fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '', 'utf8');
    }
    return { success: true };
  } catch (error) {
    console.error('清空游戏记录失败:', error);
    return { success: false, error: error.message };
  }
};

// 清空牌堆日志文件
const clearDeckLogFile = () => {
  try {
    const logFilePath = getDeckLogFilePath();
    if (fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '', 'utf8');
    }
    return { success: true };
  } catch (error) {
    console.error('清空牌堆日志失败:', error);
    return { success: false, error: error.message };
  }
};

// 清空弃牌堆日志文件
const clearDiscardPileLogFile = () => {
  try {
    const logFilePath = getDiscardPileLogFilePath();
    if (fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '', 'utf8');
    }
    return { success: true };
  } catch (error) {
    console.error('清空弃牌堆日志失败:', error);
    return { success: false, error: error.message };
  }
};

// 保存牌堆状态到文件（记录变化原因和变化后的牌堆）
const saveDeckStateToFile = (data) => {
  try {
    const logFilePath = getDeckLogFilePath();
    const timestamp = new Date().toLocaleTimeString();

    // 检查数据格式
    if (!data || typeof data !== 'object') {
      console.error('保存牌堆状态失败: 数据格式错误', data);
      return { success: false, error: '数据格式错误' };
    }

    const { reason, cards, changedCards } = data;

    // 检查 cards 是否为数组
    if (!Array.isArray(cards)) {
      console.error('保存牌堆状态失败: cards 不是数组', cards);
      return { success: false, error: 'cards 不是数组' };
    }

    let content = `\n========== [${timestamp}] ${reason || '牌堆更新'} ==========\n`;

    // 如果有变化的牌，打印变化的牌详情
    if (changedCards && Array.isArray(changedCards) && changedCards.length > 0) {
      content += `共 ${changedCards.length} 张牌:\n`;
      changedCards.forEach((card, index) => {
        if (card && card.name && card.suit && card.number) {
          content += `  ${index + 1}. ${card.name} [${card.suit}${card.number}]\n`;
        }
      });
      content += '\n';
    }

    // 打印当前牌堆
    content += `当前牌堆共 ${cards.length} 张牌:\n`;
    cards.forEach((card, index) => {
      if (card && card.name && card.suit && card.number) {
        content += `  ${index + 1}. ${card.name} [${card.suit}${card.number}]\n`;
      } else {
        content += `  ${index + 1}. [无效卡牌数据]\n`;
      }
    });
    content += '========================================\n';

    fs.appendFileSync(logFilePath, content, 'utf8');
    return { success: true, filePath: logFilePath };
  } catch (error) {
    console.error('保存牌堆状态失败:', error);
    return { success: false, error: error.message };
  }
};

// 保存弃牌堆状态到文件（记录变化原因和变化后的弃牌堆）
const saveDiscardPileStateToFile = (data) => {
  try {
    const logFilePath = getDiscardPileLogFilePath();
    const timestamp = new Date().toLocaleTimeString();

    // 检查数据格式
    if (!data || typeof data !== 'object') {
      console.error('保存弃牌堆状态失败: 数据格式错误', data);
      return { success: false, error: '数据格式错误' };
    }

    const { reason, cards, previousCount, changedCards } = data;

    // 检查 cards 是否为数组
    if (!Array.isArray(cards)) {
      console.error('保存弃牌堆状态失败: cards 不是数组', cards);
      return { success: false, error: 'cards 不是数组' };
    }

    let content = `\n========== [${timestamp}] ${reason || '弃牌堆更新'} ==========\n`;
    if (previousCount !== undefined) {
      content += `变化前: ${previousCount} 张牌\n`;
      content += `变化后: ${cards.length} 张牌\n`;
    }
    // 记录变化的牌
    if (changedCards && Array.isArray(changedCards) && changedCards.length > 0) {
      content += `变化的牌:\n`;
      changedCards.forEach((card, index) => {
        if (card && card.name && card.suit && card.number) {
          content += `  - ${card.name} [${card.suit}${card.number}]\n`;
        }
      });
      content += '\n';
    }
    content += `当前弃牌堆共 ${cards.length} 张牌:\n`;
    cards.forEach((card, index) => {
      if (card && card.name && card.suit && card.number) {
        content += `  ${index + 1}. ${card.name} [${card.suit}${card.number}]\n`;
      } else {
        content += `  ${index + 1}. [无效卡牌数据]\n`;
      }
    });
    content += '========================================\n';

    fs.appendFileSync(logFilePath, content, 'utf8');
    return { success: true, filePath: logFilePath };
  } catch (error) {
    console.error('保存弃牌堆状态失败:', error);
    return { success: false, error: error.message };
  }
};

// 检查 Vite 开发服务器是否可用
const checkDevServer = () => {
  return new Promise((resolve) => {
    // Vite 服务器任何响应（包括 404）都表示服务器在运行
    const request = http.get('http://localhost:5173', (res) => {
      console.log('Vite server status:', res.statusCode);
      // 只要服务器有响应（无论 200 还是 404），都表示服务器在运行
      resolve(true);
    });
    request.on('error', (err) => {
      console.log('Vite server not available:', err.message);
      resolve(false);
    });
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
};

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: '三国卡牌',
  });

  // 检查是否是开发模式
  // 优先级：1. NODE_ENV 环境变量 2. Vite 服务器是否运行
  // 注意：Windows set 命令可能会添加尾部空格，需要 trim()
  const nodeEnv = process.env.NODE_ENV?.trim();
  console.log('NODE_ENV:', JSON.stringify(nodeEnv), 'checkDevServer:',await checkDevServer());
  const isDevMode = nodeEnv === 'development' || await checkDevServer();
  console.log('isDevMode:', isDevMode);
  
  if (isDevMode) {
    console.log('开发模式：连接到 Vite 开发服务器');
    // 开发模式下禁用缓存，确保显示最新代码
    mainWindow.webContents.session.clearCache();
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('生产模式：加载打包后的文件');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC 处理程序 - 保存控制台日志
ipcMain.handle('save-console-log', async (event, level, message) => {
  return saveConsoleLogToFile(level, message);
});

// IPC 处理程序 - 保存游戏记录
ipcMain.handle('save-game-log', async (event, logEntry) => {
  return saveGameLogToFile(logEntry);
});

// IPC 处理程序 - 清空控制台日志
ipcMain.handle('clear-console-logs', async () => {
  return clearConsoleLogFile();
});

// IPC 处理程序 - 清空游戏记录
ipcMain.handle('clear-game-logs', async () => {
  return clearGameLogFile();
});

// IPC 处理程序 - 保存牌堆状态
ipcMain.handle('save-deck-state', async (event, data) => {
  return saveDeckStateToFile(data);
});

// IPC 处理程序 - 保存弃牌堆状态
ipcMain.handle('save-discard-pile-state', async (event, data) => {
  return saveDiscardPileStateToFile(data);
});

// IPC 处理程序 - 清空牌堆日志
ipcMain.handle('clear-deck-logs', async () => {
  return clearDeckLogFile();
});

// IPC 处理程序 - 清空弃牌堆日志
ipcMain.handle('clear-discard-pile-logs', async () => {
  return clearDiscardPileLogFile();
});

// 获取logs文件夹下的所有日志文件
const getLogFiles = () => {
  try {
    const projectRoot = path.join(__dirname, '..');
    const logsDir = path.join(projectRoot, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      return { success: true, files: [], message: 'logs文件夹不存在' };
    }
    
    const files = fs.readdirSync(logsDir);
    const logFiles = files.filter(file => file.endsWith('.log'));
    
    return { success: true, files: logFiles, count: logFiles.length };
  } catch (error) {
    console.error('获取日志文件列表失败:', error);
    return { success: false, error: error.message, files: [] };
  }
};

// 删除非当日的日志文件
const cleanupOldLogs = () => {
  try {
    const projectRoot = path.join(__dirname, '..');
    const logsDir = path.join(projectRoot, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      return { success: true, deleted: [], message: 'logs文件夹不存在' };
    }
    
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const files = fs.readdirSync(logsDir);
    const logFiles = files.filter(file => file.endsWith('.log'));
    
    const deletedFiles = [];
    
    for (const file of logFiles) {
      // 检查文件名是否包含日期（格式：xxx_YYYY-MM-DD.log）
      const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const fileDate = dateMatch[1];
        if (fileDate !== today) {
          const filePath = path.join(logsDir, file);
          fs.unlinkSync(filePath);
          deletedFiles.push(file);
          console.log(`已删除非当日日志文件: ${file}`);
        }
      }
    }
    
    return { 
      success: true, 
      deleted: deletedFiles, 
      count: deletedFiles.length,
      message: `检查了 ${logFiles.length} 个日志文件，删除了 ${deletedFiles.length} 个非当日日志` 
    };
  } catch (error) {
    console.error('清理旧日志失败:', error);
    return { success: false, error: error.message, deleted: [] };
  }
};

// IPC 处理程序 - 获取日志文件列表
ipcMain.handle('get-log-files', async () => {
  return getLogFiles();
});

// IPC 处理程序 - 清理非当日日志
ipcMain.handle('cleanup-old-logs', async () => {
  return cleanupOldLogs();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
