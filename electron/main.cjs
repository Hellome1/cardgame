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

// 检查 Vite 开发服务器是否可用
const checkDevServer = () => {
  return new Promise((resolve) => {
    const request = http.get('http://localhost:5173', (res) => {
      resolve(res.statusCode === 200);
    });
    request.on('error', () => {
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
  const isDevMode = process.env.NODE_ENV === 'development' || await checkDevServer();
  
  if (isDevMode) {
    console.log('开发模式：连接到 Vite 开发服务器');
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
