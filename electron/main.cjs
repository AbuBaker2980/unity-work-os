const { app, BrowserWindow, Tray, Menu, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater'); // 👈 Import kiya

let mainWindow;
let tray;

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
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
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

        // 🚀 APP START HOTAY HI UPDATE CHECK KARO (Sirf Production mein)
        if (!startUrl) {
            autoUpdater.checkForUpdatesAndNotify();
        }
    });

    mainWindow.on('close', (e) => {
        if (!app.isQuiting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });
}

// --- AUTO UPDATER EVENTS ---
autoUpdater.on('update-available', () => {
    // Jab update mil jaye
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: 'A new version is downloading in the background...',
        buttons: ['OK']
    });
});

autoUpdater.on('update-downloaded', () => {
    // Jab download ho jaye -> Install karo
    dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Update Ready',
        message: 'New version downloaded. Restart now to install?',
        buttons: ['Yes', 'Later']
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

function createTray() {
    tray = new Tray(path.join(__dirname, '../public/icon.ico'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open Unity Work OS', click: () => mainWindow.show() },
        { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
    ]);
    tray.setToolTip('Unity Work OS');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow.show());
}

app.whenReady().then(() => {
    createWindow();
    createTray();
});

app.setLoginItemSettings({ openAtLogin: true });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});