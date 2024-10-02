/* 胡桃木实验室©版权所有 */
const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    shell,
    screen,
    ipcMain,
    Notification
} = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
let ignoreMouseEvents = false; // 默认不忽略鼠标事件

function createWindow() {
    // 获取屏幕尺寸
    const primaryDisplay = screen.getPrimaryDisplay();
    const {
        width,
        height
    } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: 440,
        height: 460,
        icon: path.join(__dirname, 'project/icon/icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            nativeWindowOpen: true
        },
        frame: false,
        transparent: true,
        x: width - 440,
        y: height - 460,
    });

    // 隐藏默认菜单栏
    mainWindow.setMenuBarVisibility(false);
    // 设置窗口为不可调整大小
    mainWindow.setResizable(false);
    mainWindow.loadFile('./live2d/index.html');

    // 设置透明区域鼠标事件穿透
    updateMouseEvents();

    // Handle window close event to hide the window instead of closing
    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });

    // 处理窗口中的链接，确保它们在外部浏览器中打开
    mainWindow.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });

    // Create tray icon
    tray = new Tray(path.join(__dirname, 'project/icon/icon.ico'));
    const contextMenu = Menu.buildFromTemplate([{
            label: '显示看板娘',
            click: function() {
                mainWindow.show();
            }
        },
        {
            label: '看板娘置顶',
            type: 'checkbox',
            checked: mainWindow.isAlwaysOnTop(),
            click: function(menuItem) {
                mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
                menuItem.checked = mainWindow.isAlwaysOnTop();
            }
        },
        {
            label: '开发者工具',
            click: function() {
                mainWindow.webContents.openDevTools({
                    mode: 'detach'
                }); // 在新窗口打开开发者工具
            }
        },
        {
            label: '开机启动',
            type: 'checkbox',
            click: function(menuItem) {
                const isEnabled = !app.getLoginItemSettings().openAtLogin;
                app.setLoginItemSettings({
                    openAtLogin: isEnabled
                });
                menuItem.checked = isEnabled;
            }
        },
        {
            label: '忽略点击',
            type: 'checkbox',
            checked: ignoreMouseEvents,
            click: function(menuItem) {
                ignoreMouseEvents = !ignoreMouseEvents;
                updateMouseEvents();
                menuItem.checked = ignoreMouseEvents;
            }
        },
        {
            label: '重新渲染',
            click: function() {
                mainWindow.reload();
            }
        },
        {
            type: 'separator' // 添加分隔栏
        },
        /* {
            label: '检查更新',
            click: function() {
                shell.openExternal('https://www.htmacg.cn/app-kanbanniang');
            }
        }, */
        {
            label: '版本信息',
            click: function() {
                showVersionNotification();
            }
        },
        {
            label: '关于软件',
            click: function() {
                openAboutWindow();
            }
        },
        {
            label: 'QWQ退出',
            click: function() {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip('看板娘');
    tray.on('click', () => {
        mainWindow.show();
    });
}

function updateMouseEvents() {
    mainWindow.setIgnoreMouseEvents(ignoreMouseEvents, {
        forward: true
    });
}

function showVersionNotification() {
    const notification = new Notification({
        title: '看板娘 - 版本信息', // 包含程序名称
        body: '当前版本号：1.6',
        icon: path.join(__dirname, 'project/icon/icon.ico') // 设置图标路径
    });

    notification.on('click', () => {
        shell.openExternal('https://www.htmacg.cn'); // 更新服务器
    });

    notification.show();
}

/* 配置窗口 */
function openAboutWindow() {
    const aboutWindow = new BrowserWindow({
        width: 1000,
        height: 518,
        icon: path.join(__dirname, 'project/icon/icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,/* 隐藏默认菜单栏 */
    });
	
    aboutWindow.loadFile('./live2d/indextools.html');

    // 拦截窗口打开事件
    aboutWindow.webContents.setWindowOpenHandler((details) => {
        // 使用 shell 模块在外部浏览器中打开链接
        shell.openExternal(details.url);
        return { action: 'deny' }; // 阻止 Electron 默认的窗口打开行为
    });
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
