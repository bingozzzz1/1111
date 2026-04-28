const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('hotstripDesktop', {
  platform: process.platform,
  isDesktop: true,
  version: process.versions.electron
})
