const { app, BrowserWindow, Tray, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let tray;

// --- 🔒 SINGLE INSTANCE LOCK (Prevents Double Icon) ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    // Agar koi doosri baar app kholne ki koshish kare
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });

    // App Ready hone par hi chalayen
    app.whenReady().then(() => {
        createWindow();
        createTray();
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        backgroundColor: '#0a0a0a',
        title: 'Unity Work OS',
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../public/icon.ico'),
        show: false, // Pehlay hidden rakhein
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            //preload: path.join(__dirname, 'preload.js') // Optional
        }
    });

    const startUrl = process.env.ELECTRON_START_URL;

    if (startUrl) {
        mainWindow.loadURL(startUrl);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (!startUrl) autoUpdater.checkForUpdatesAndNotify();
    });

    // --- CLOSE BEHAVIOR (Minimize to Tray) ---
    mainWindow.on('close', (e) => {
        if (!app.isQuiting) {
            e.preventDefault();
            mainWindow.hide();
            return false;
        }
    });
}

// --- TRAY LOGIC (Fixed) ---
function createTray() {
    tray = new Tray(path.join(__dirname, '../public/icon.ico'));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Unity Work OS',
            click: () => {
                mainWindow.show();
                if (mainWindow.isMinimized()) mainWindow.restore();
            }
        },
        {
            label: 'Quit',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Unity Work OS');
    tray.setContextMenu(contextMenu);

    // ✅ FIX: Single Click par bhi open ho
    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // Double click support
    tray.on('double-click', () => {
        mainWindow.show();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    });
}

// --- AUTO UPDATER ---
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: 'A new version is downloading in the background...',
        buttons: ['OK']
    });
});

autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Update Ready',
        message: 'New version downloaded. Restart now to install?',
        buttons: ['Restart Now', 'Later']
    }).then((result) => {
        if (result.response === 0) {
            // Force Install
            autoUpdater.quitAndInstall(false, true);
        }
    });
});

autoUpdater.on('error', (message) => {
    console.error('Update Error:', message);
});

// --- GLOBAL SETTINGS ---
app.setLoginItemSettings({ openAtLogin: true });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});