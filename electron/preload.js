const { contextBridge } = require('electron');

// Expose minimal API to renderer
contextBridge.exposeInMainWorld('quetzalcoatl', {
  platform: process.platform,
  version: '0.1.0',
  isDesktop: true,
});