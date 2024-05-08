const { ipcRenderer } = require('electron');

ipcRenderer.send('download', {
    url: 'URL is here',
    properties: { directory: 'Directory is here' }
});