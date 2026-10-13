const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('starsourceDesktop', {
  platform: process.platform,
  onUpdate: cb => ipcRenderer.on('update:status', (_e, s) => cb(s)),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  checkQuietly: () => ipcRenderer.invoke('update:check-quiet'),
  updateState: () => ipcRenderer.invoke('update:state'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  revealUpdate: () => ipcRenderer.invoke('update:reveal'),
  version: () => ipcRenderer.invoke('app:version')
});
