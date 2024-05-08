const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { screen } = require('electron');
const { obtenerUltimaVersion } = require('./update_packager');
var unrarjs = require('node-unrar-js')
var unzipper = require("unzipper");
const { shell } = require('electron');
const packageJson = require('./package.json');



let mainWindow;

function saveDownloadPath(filePath) {
  const data = { downloadPath: filePath };
  fs.writeFileSync(path.join(app.getPath('userData'), 'config.json'), JSON.stringify(data));
}

function getDownloadPath() {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  if (fs.existsSync(configPath)) {
    const data = JSON.parse(fs.readFileSync(configPath));
    return data.downloadPath || null;
  }
  return null;
}

function createWindow() {
  const downloadPath = getDownloadPath() || app.getPath('downloads');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Creamos la ventana principal
  mainWindow = new BrowserWindow({
    width,
    height,
    icon: path.join(__dirname, './icons/favicon.ico'), // Ruta al archivo de ícono
    webPreferences: {
      nodeIntegration: false, // Deshabilita la integración de Node.js en la ventana del navegador
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Establecemos la carpeta de descargas predeterminada
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    const downloadPath = getDownloadPath() || app.getPath('downloads');
    const filePath = path.join(downloadPath, item.getFilename());
    item.setSavePath(filePath);

    // Manejamos el evento cuando la descarga se completa
    item.once('done', (event, state) => {
      if (state === 'completed') {
        // Verificamos si el archivo es un archivo comprimido
        const extension = path.extname(filePath).toLowerCase();
        if (extension === '.zip') {
          const extractStream = fs.createReadStream(filePath)
          .pipe(unzipper.Extract({ path: downloadPath }));

      extractStream.on('close', () => {
          // Eliminar el archivo comprimido después de la extracción
          fs.unlinkSync(filePath);
      });

      extractStream.on('error', (err) => {
          console.error('Error al extraer el archivo:', err);
      });
          
          // Contenido para archivos ZIP
        }
        
        if (extension === '.rar') {
          //extrac the file then remove the rar
          extractRarArchive(filePath, downloadPath).then(() => {
            fs.unlinkSync(filePath);
          })
          
        }
      } else {
        // Mostramos un mensaje de alerta si la descarga falla
        dialog.showErrorBox('Download Failed', `The download of ${item.getFilename()} has failed.`);
      }
    });
  });

  // Cargamos la URL en la ventana principal
  mainWindow.loadURL('https://www.minemev.com/');

  // Manejamos el evento de cierre de la ventana
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}


app.on('ready', async () => {
  try {
    const latestVersion = await obtenerUltimaVersion('Dalinnar', 'Minemev-desktop');
    const currentVersion = packageJson.version;
    

    if (latestVersion !== 'v'+currentVersion) {
      const result = dialog.showMessageBoxSync({
        type: 'info',
        title: 'Update Available',
        message: 'A new update is available.',
        buttons: ['OK', 'Download']
      });

      // Si el usuario selecciona "Download", abre una nueva ventana del navegador
      if (result === 1) {
        const repoUrl = 'https://github.com/Dalinnar/Minemev-desktop/releases/'; // URL de tu repositorio en GitHub
        shell.openExternal(repoUrl);
      }
    }
  } catch (error) {
    console.error(error);
  }

  // Resto del código para crear la ventana principal, etc.
});



// Evento cuando la aplicación está lista
app.on('ready', () => {
  const downloadPath = getDownloadPath();

  // Si no hay una ruta de descargas guardada, o el archivo config.json no existe, mostramos un alerta y luego el diálogo para seleccionar el directorio de descargas
  if (!downloadPath) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Select Litematics Folder',
      message: 'Please select where your Litematics folder is located.',
      buttons: ['OK']
    }).then(() => {
      dialog.showOpenDialog({
        properties: ['openDirectory']
      }).then(result => {
        const { canceled, filePaths } = result;
        if (!canceled && filePaths.length > 0) {
          // Guardamos la ruta del directorio seleccionado
          saveDownloadPath(filePaths[0]);
          createWindow();
        } else {
          // Si el usuario cancela la selección, salimos de la aplicación
          app.quit();
        }
      });
    });
  } else {
    createWindow();
  }

  // Creamos el menú
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Select Download Folder',
          click: async () => {
            const { filePaths } = await dialog.showOpenDialog({
              properties: ['openDirectory']
            });
            if (filePaths && filePaths.length > 0) {
              saveDownloadPath(filePaths[0]);
              mainWindow.reload();
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Home',
      click: () => {
        // Redirigir a www.minemev.com
        mainWindow.loadURL('https://www.minemev.com');
      }
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

// Evento cuando todas las ventanas han sido cerradas
app.on('window-all-closed', () => {
  // En macOS, es común que las aplicaciones y sus barras de menú se mantengan activas hasta que el usuario las cierre explícitamente
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Evento cuando la aplicación es activada (macOS)
app.on('activate', () => {
  // En macOS, re-creamos la ventana principal cuando se hace clic en el icono del dock y no hay otras ventanas abiertas
  if (mainWindow === null) {
    createWindow();
  }
});

// Manejamos la solicitud de diálogo para seleccionar el directorio de descargas
ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

async function extractRarArchive(file, destination) {
  try {
    // Create the extractor with the file information (returns a promise)
    const extractor = await unrarjs.createExtractorFromFile({
      filepath: file,
      targetPath: destination
    });

    // Extract the files
    [...extractor.extract().files];
  } catch (err) {
    // May throw UnrarError, see docs
    console.error(err);
  }
}