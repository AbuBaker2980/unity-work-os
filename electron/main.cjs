const { app, BrowserWindow, Tray, Menu } = require('electron')
const path = require('path')

let mainWindow
let tray

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        backgroundColor: '#0a0a0a',
        title: 'Unity Work OS',
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    const startUrl = process.env.ELECTRON_START_URL;

    if (startUrl) {
        mainWindow.loadURL(startUrl); // Dev Mode (http://localhost:5173)
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html')); // Production Mode
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    // ❌ window close → tray
    mainWindow.on('close', (e) => {
        if (!app.isQuiting) {
            e.preventDefault()
            mainWindow.hide()
        }
    })
}

function createTray() {
    tray = new Tray(path.join(__dirname, '../public/icon.ico'))

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Unity Work OS',
            click: () => {
                mainWindow.show()
            }
        },
        {
            label: 'Quit',
            click: () => {
                app.isQuiting = true
                app.quit()
            }
        }
    ])

    tray.setToolTip('Unity Work OS')
    tray.setContextMenu(contextMenu)

    tray.on('double-click', () => {
        mainWindow.show()
    })
}

app.whenReady().then(() => {
    createWindow()
    createTray()
})
app.setLoginItemSettings({
    openAtLogin: true
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
