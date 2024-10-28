// # 胡桃木实验室
// # 作者：北沐林奈
// # Last Update: 2024.10.28

// 引入模块
const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    shell,
    screen,
    ipcMain,
    Notification,
    globalShortcut,
} = require('electron');
const path = require('path');
const fs = require('fs');

// 全局变量
let mainWindow;
let aboutWindow;
let tray = null;
let ignoreMouseEvents = false;
let isMuted = false;
let currentLanguage = 'zh'; // 默认托盘菜单为中文
let splashScreen; // 新增 Splash Screen 窗口变量

// 状态文件路径
const stateFilePath = path.join(app.getPath('userData'), 'appState.json');

// 从文件中读取状态
function loadState() {
    if (fs.existsSync(stateFilePath)) {
        const state = JSON.parse(fs.readFileSync(stateFilePath, 'utf-8'));
        ignoreMouseEvents = state.ignoreMouseEvents || false;
        isMuted = state.isMuted || false;
        currentLanguage = state.currentLanguage || 'zh';
    }
}

// 保存状态到文件
function saveState() {
    const state = {
        ignoreMouseEvents,
        isMuted,
        currentLanguage,
    };
    fs.writeFileSync(stateFilePath, JSON.stringify(state), 'utf-8');
}

// 在应用程序启动时加载状态
app.on('ready', () => {
    loadState();
    createWindow();
});

// 在应用程序退出时保存状态
app.on('before-quit', () => {
    saveState();
});

// 防止软件多开
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

function createWindow() {
    if (mainWindow) return; // 防止窗口多开

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // 创建启动LOGO画面
    splashScreen = new BrowserWindow({
        width: 600,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false
        }
    });

    splashScreen.loadFile(path.join(__dirname, 'splash.html'));
	
	// 主窗口
    mainWindow = new BrowserWindow({
        width: 440,
        height: 460,
        icon: path.join(__dirname, 'project/icon/icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true, // 一定要开！
            nativeWindowOpen: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        frame: false,
        transparent: true, // 窗口是否支持透明
        x: width - 440,
        y: height - 460,
        show: false, // 先不显示主窗口
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.setResizable(false);
    mainWindow.loadFile('./project/index.html');

    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });

    mainWindow.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });

    // 当主窗口加载完成后，关闭 Splash Screen 并显示主窗口
     mainWindow.once('ready-to-show', () => {
            setTimeout(() => {
                splashScreen.close();
                mainWindow.show();
            }, 2000); // 2秒钟后关闭 Splash Screen
        });

    tray = new Tray(path.join(__dirname, 'project/icon/icon.ico'));
    const contextMenu = buildContextMenu();
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Desk-KanbanNiang');
    tray.on('click', () => {
        mainWindow.show();
    });

    globalShortcut.register('Alt+o', () => {
        try {
            const currentZoomFactor = mainWindow.webContents.getZoomFactor();
            const newZoomFactor = currentZoomFactor + 0.1;
            if (newZoomFactor > 0) {
                mainWindow.webContents.setZoomFactor(newZoomFactor);
            } else {
                throw new Error("Zoom factor cannot be less than or equal to 0");
            }
        } catch (error) {
            console.error(error);
            const notification = new Notification({
                title: '缩放错误',
                body: '已经最大了TXT',
				icon: path.join(__dirname, 'project/icon/icon.ico') // 设置图标路径
            });
            notification.show();
        }
    });

    globalShortcut.register('Alt+p', () => {
        try {
            const currentZoomFactor = mainWindow.webContents.getZoomFactor();
            const newZoomFactor = currentZoomFactor - 0.1;
            if (newZoomFactor > 0) {
                mainWindow.webContents.setZoomFactor(newZoomFactor);
            } else {
                throw new Error("Zoom factor cannot be less than or equal to 0");
            }
        } catch (error) {
            console.error(error);
            const notification = new Notification({
                title: '缩放错误',
                body: '已经最小了TXT',
				icon: path.join(__dirname, 'project/icon/icon.ico') // 设置图标路径
            });
            notification.show();
        }
    });

    globalShortcut.register('Alt+q', () => {
        app.quit();
    });

    globalShortcut.register('Alt+e', () => {
        mainWindow.webContents.setZoomFactor(1);
    });
}

function updateMouseEvents() {
    mainWindow.setIgnoreMouseEvents(ignoreMouseEvents, { forward: true });
}

function openAboutWindow() {
    if (aboutWindow) return; // 防止窗口多开
	
	// 关于页面窗口
    aboutWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        icon: path.join(__dirname, 'project/icon/icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
			transparent: true, // 窗口是否支持透明
        },
        autoHideMenuBar: true,
    });

    aboutWindow.loadFile('./index.html');

    ipcMain.on('toggle-resizable', (event, resizable) => {
        mainWindow.setResizable(resizable);
    });

    aboutWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: 'deny' };
    });

    aboutWindow.on('closed', () => {
        aboutWindow = null;
    });
}

// 托盘菜单
function buildContextMenu() {
    const menuTemplate = [
        {
            label: currentLanguage === 'zh' ? '显示' : 'Show',
            accelerator: 'Alt+Q',
            click: function() {
                mainWindow.show();
            }
        },
        {
            label: currentLanguage === 'zh' ? '置于顶层' : 'Always on Top',
            type: 'checkbox',
            checked: mainWindow.isAlwaysOnTop(),
            click: function(menuItem) {
                mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
                menuItem.checked = mainWindow.isAlwaysOnTop();
				saveState(); // 保存状态
            }
        },
        {
            label: currentLanguage === 'zh' ? '开机启动' : 'Start on Boot',
            type: 'checkbox',
            click: function(menuItem) {
                const isEnabled = !app.getLoginItemSettings().openAtLogin;
                app.setLoginItemSettings({ openAtLogin: isEnabled });
                menuItem.checked = isEnabled;
				saveState(); // 保存状态
            }
        },
        {
            label: currentLanguage === 'zh' ? '忽略点击' : 'Ignore Clicks',
            type: 'checkbox',
            checked: ignoreMouseEvents,
            click: function(menuItem) {
                ignoreMouseEvents = !ignoreMouseEvents;
                updateMouseEvents();
                menuItem.checked = ignoreMouseEvents;
                saveState(); // 保存状态
            }
        },
        {
            label: currentLanguage === 'zh' ? '重新渲染' : 'Reload',
            click: function() {
                mainWindow.reload();
            }
        },
        {
            label: currentLanguage === 'zh' ? '关闭声音' : 'Mute',
            type: 'checkbox',
            checked: isMuted,
            click: function(menuItem) {
                isMuted = !isMuted;
                mainWindow.webContents.audioMuted = isMuted;
                menuItem.checked = isMuted;
                saveState(); // 保存状态
            }
        },
        { type: 'separator' },
        {
            label: currentLanguage === 'zh' ? '放大' : 'Zoom In',
            accelerator: 'Alt+O',
            click: () => {
                const currentZoomFactor = mainWindow.webContents.getZoomFactor();
                mainWindow.webContents.setZoomFactor(currentZoomFactor + 0.1);
            }
        },
        {
            label: currentLanguage === 'zh' ? '缩小' : 'Zoom Out',
            accelerator: 'Alt+P',
            click: () => {
                const currentZoomFactor = mainWindow.webContents.getZoomFactor();
                mainWindow.webContents.setZoomFactor(currentZoomFactor - 0.1);
            }
        },
        {
            label: currentLanguage === 'zh' ? '恢复原大小' : 'Reset Zoom',
            accelerator: 'Alt+E',
            click: () => {
                mainWindow.webContents.setZoomFactor(1);
            }
        },
        { type: 'separator' },
        {
            label: currentLanguage === 'zh' ? '开发者工具' : 'Developer Tools',
            click: function() {
                mainWindow.webContents.openDevTools({ mode: 'detach' });
            }
        },
        { type: 'separator' },
        {
            label: currentLanguage === 'zh' ? '语言' : 'Language',
            submenu: [
                {
                    label: '中文',
                    type: 'radio',
                    checked: currentLanguage === 'zh',
                    click: () => {
                        currentLanguage = 'zh';
                        tray.setContextMenu(buildContextMenu());
                        saveState(); // 保存状态
                    }
                },
                {
                    label: 'English',
                    type: 'radio',
                    checked: currentLanguage === 'en',
                    click: () => {
                        currentLanguage = 'en';
                        tray.setContextMenu(buildContextMenu());
                        saveState(); // 保存状态
                    }
                }
            ]
        },
        { type: 'separator' },
        {
            label: currentLanguage === 'zh' ? '关于软件' : 'About',
            click: function() {
                openAboutWindow();
            }
        },
        {
            label: currentLanguage === 'zh' ? '退出TXT' : 'Exit',
            click: function() {
                app.isQuiting = true;
                app.quit();
            }
        },
        { type: 'separator' },
    ];

    return Menu.buildFromTemplate(menuTemplate);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('toggle-resizable', (event, resizable) => {
    mainWindow.setResizable(resizable);
});