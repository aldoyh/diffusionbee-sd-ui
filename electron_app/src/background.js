'use strict'


import { app, protocol, BrowserWindow, nativeTheme, Menu} from 'electron'
import createProtocol from 'vue-cli-plugin-electron-builder/lib/createProtocol'
const isDevelopment = process.env.NODE_ENV !== 'production'

// Single-instance guarantee. Without this, relaunching the app while an old
// window is still around (e.g. a session started before a reinstall, or a
// zombie from a crash) silently focuses the OLD window — which may run stale
// code (pre-fix splash trap, old overlays) while the user believes they're
// looking at the current build. With the lock, the second launch focuses the
// live window instead and exits itself.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
    app.quit()
}
app.on('second-instance', () => {
    if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
    }
})

import settings from 'electron-settings';


let is_windows = process.platform.startsWith('win');

const path = require('path');

let win;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
	{ scheme: 'app', privileges: { secure: true, standard: true } }
])


import {menu_template} from "./menu_template"
Menu.setApplicationMenu(Menu.buildFromTemplate(menu_template))




function save_window_size() {
	if( ! win.savable )
		return;
	let windowState = win.getBounds();
	windowState.isMaximized = win.isMaximized();
	settings.set('windowPosState', windowState);
}

async function createWindow() {
	// Create the browser window.
	win = new BrowserWindow({
		width: 800,
		height: 600,
		minWidth: 770,
		minHeight: 550,
		titleBarStyle : (is_windows ) ? 'default' : 'hidden' , 
		titleBarOverlay : is_windows, 
		maximizable : false,
		trafficLightPosition: { x: 18, y: 20 },
		webPreferences: {
			webSecurity: false,

			// Use pluginOptions.nodeIntegration, leave this alone
			// See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
			nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
			contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
			enableRemoteModule: true,
			preload: path.join(__dirname, 'preload.js'),
		}
	});

	win.removeMenu(); // remove the menu ( works for windows! )

	win.webContents.on('before-input-event', (event, input) => {
		if (input.type !== 'keyDown') return;
		const blockRefresh =
			input.key === 'F5' ||
			(input.key === 'r' && (input.meta || input.control)) ||
			(input.key === 'R' && (input.meta || input.control) && input.shift);
		if (blockRefresh) event.preventDefault();
	});
	win.setSize(770, 550);
	// win.setResizable(false);
	win.setMaximizable(false);

	// save the window state on resize , move, etc
	['resize', 'move'].forEach(event => {
		win.on(event, save_window_size);
	});


	win.on('close', function(e) {
		if(win.show_dialog_on_quit){

			let message = 'Are you sure you want to quit?';
			if(win.dialog_on_msg)
				message = win.dialog_on_msg;

			const choice = require('electron').dialog.showMessageBoxSync(this, {
				type: 'question',
				buttons: ['Yes', 'No'],
				title: 'Confirm',
				message: message
			});
			if (choice === 1) {
				e.preventDefault();
			}
		}
	});



	if(is_windows){
		nativeTheme.themeSource = 'light';
	} else {
		nativeTheme.themeSource = 'system';
	}
	

	if (process.env.WEBPACK_DEV_SERVER_URL) {
		// Load the url of the dev server if in development mode
		await win.webContents.session.clearStorageData({ storages: ['cachestorage', 'shadercache'] });
		await win.webContents.session.clearCache();
		await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
		if (!process.env.IS_TEST) win.webContents.openDevTools()
	} else {
		createProtocol('app')
		// Load the index.html when not in development
		win.loadURL('app://./index.html')
	}
}


app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) createWindow()
})




// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
	const [{ start_bridge, bind_window_bridge }, { bind_window_native_functions }] = await Promise.all([
		import('./bridge.js'),
		import('./native_functions.js')
	])

	start_bridge()

	if (isDevelopment && !process.env.IS_TEST) {
		try {
			const { default: installExtension, VUEJS_DEVTOOLS } = await import('electron-devtools-installer')
			await installExtension(VUEJS_DEVTOOLS)
		} catch (e) {
			console.error('Vue Devtools failed to install:', e.toString())
		}
	}
	createWindow();

	console.log(win);
	bind_window_bridge(win);

	win.webContents.on('did-finish-load', function() {

		bind_window_native_functions(win);
	});

})

// set the about panel 
app.setAboutPanelOptions({
	applicationName: require('../package.json').name, 
	applicationVersion: require('../package.json').version,
	version: require('../package.json').build_number,
	credits: require('../package.json').description,
	copyright: "Copyright © 2023 DiffusionBee GUI",
	website: require('../package.json').website
});





// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
	if (process.platform === 'win32') {
		process.on('message', (data) => {
			if (data === 'graceful-exit') {
				app.quit()
			}
		})
	} else {
		process.on('SIGTERM', () => {
			app.quit()
		})
	}
}
