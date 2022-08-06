// Modules to control application life and create native browser window
require('dotenv').config();
const {
  app, ipcMain, Menu, dialog,
} = require('electron');
const { autoUpdater } = require('electron-updater');
const { join, basename } = require('path');
const {
  promises: {
    mkdir,
  },
  existsSync, createWriteStream,
} = require('fs');
const { https: { get } } = require('follow-redirects');
const extract = require('extract-zip');
const log = require('electron-log');
const find = require('findit');
const cp = require('cp');
const openAboutWindow = require('about-window').default;
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { createAppWindow, isMainWindowDefined, sendToMainWindow } = require('./main/app-process');

const execCmd = async (cmd) => exec(cmd, {
  maxBuffer: 8 * 1024 * 1024,
});

const getAboutWindowOptions = () => {
  const packageJsonDir = join(__dirname, '..');
  const prodIconPath = join(packageJsonDir, 'icon.png');
  const devIconPath = join(packageJsonDir, 'build/icon.png');
  const aboutWindowOptions = { icon_path: '' };
  if (existsSync(devIconPath)) {
    aboutWindowOptions.icon_path = devIconPath;
    aboutWindowOptions.package_json_dir = packageJsonDir;
  } else {
    aboutWindowOptions.icon_path = prodIconPath;
  }
  return aboutWindowOptions;
};

const getBuildPath = () => {
  const path = app.getAppPath();
  const pathUnpacked = `${path}.unpacked`;
  if (existsSync(pathUnpacked)) {
    return join(pathUnpacked, 'build');
  }
  return join(path, 'build');
};

const getDatabasePath = () => {
  const path = app.getPath('userData');
  const pathUnpacked = `${path}.unpacked`;
  if (existsSync(pathUnpacked)) {
    return join(pathUnpacked, 'keyframes');
  }
  return join(path, 'keyframes');
};

const listDirectories = (root) => new Promise((resolve) => {
  const results = [];
  const finder = find(root);
  finder.on('directory', (dir) => {
    if (dir !== root) {
      results.push({ basename: basename(dir), fullname: dir });
    }
  });
  finder.on('error', () => {
    resolve(results);
  });
  finder.on('end', () => {
    resolve(results);
  });
});

const listFiles = (root, ext) => new Promise((resolve) => {
  const results = [];
  const finder = find(root);
  finder.on('file', (file) => {
    if (file.indexOf(ext) !== -1) {
      results.push({ basename: basename(file, ext), fullname: file });
    }
  });
  finder.on('error', () => {
    resolve(results);
  });
  finder.on('end', () => {
    resolve(results);
  });
});

const copySync = (src, dest) => {
  sendToMainWindow('pythonOutput', { line: `Copying ${src}...` });
  cp.sync(src, dest);
};

const getFFmpeg = () => new Promise((resolve) => {
  let platform;
  if (process.platform === 'darwin') {
    platform = 'mac';
  } else if (process.arch === 'x64') {
    platform = 'win64';
  } else if (process.arch === 'ia32') {
    platform = 'win32';
  } else {
    resolve();
  }
  const path = getBuildPath();
  const manifest = {
    win64: {
      url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
      ffmpeg: 'ffmpeg.exe',
      copy: () => copySync(join(path, 'ffmpeg-master-latest-win64-gpl', 'bin', 'ffmpeg.exe'), join(path, 'ffmpeg.exe')),
    },
    win32: {
      url: 'https://github.com/sudo-nautilus/FFmpeg-Builds-Win32/releases/download/latest/ffmpeg-master-latest-win32-gpl.zip',
      ffmpeg: 'ffmpeg.exe',
      copy: () => copySync(join(path, 'ffmpeg-master-latest-win32-gpl', 'bin', 'ffmpeg.exe'), join(path, 'ffmpeg.exe')),
    },
    mac: {
      url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
      ffmpeg: 'ffmpeg',
      copy: () => {},
    },
  };
  // only download ffmpeg if not available
  if (!existsSync(join(path, manifest[platform].ffmpeg))) {
    get(manifest[platform].url, (resp) => {
      const zip = join(path, 'ffmpeg.zip');
      const stream = createWriteStream(zip);
      resp.pipe(stream);
      stream.on('finish', async () => {
        await extract(zip, { dir: path });
        manifest[platform].copy();
        resolve();
      });
    });
  } else {
    resolve();
  }
});

const checkDependencies = async () => {
  sendToMainWindow('installationStatusChanged', { installing: true });
  await getFFmpeg();
  sendToMainWindow('installationStatusChanged', { installing: false });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  const template = [
    {
      label: 'File',
      role: 'filemenu',
    },
    {
      label: 'Edit',
      role: 'editmenu',
    },
    {
      label: 'View',
      role: 'viewmenu',
    },
    {
      label: 'Window',
      role: 'windowmenu',
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'About',
          click: () => openAboutWindow(getAboutWindowOptions()),
        },
        {
          label: 'Quit',
          role: 'quit',
        },
      ],
    },
  ];
  if (process.platform === 'darwin') {
    template.unshift({
      label: 'Keynote notetaker',
      role: 'appmenu',
    });
  }
  app.applicationMenu = Menu.buildFromTemplate(template);
  createAppWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!isMainWindowDefined()) {
    createAppWindow();
  }
});

// Start logging
log.transports.file.level = 'debug';
autoUpdater.logger = log;

log.hooks.push((message, transport) => {
  if (transport !== log.transports.file) {
    return message;
  }
  sendToMainWindow('log', message);
  return message;
});
ipcMain.on('logStored', (event, storedLog) => {
  sendToMainWindow('logStored', storedLog);
});

// After the user logs in to the app and has the token, use it to check for updates
ipcMain.on('checkForUpdates', () => {
  autoUpdater.setFeedURL({
    owner: 'mitin001',
    provider: 'github',
    repo: 'keyframe-notetaker',
  });
  autoUpdater.checkForUpdates();
});

ipcMain.on('openVideo', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
  }) || {};
  const [filePath] = filePaths || [];
  const name = basename(filePath);
  const ffmpeg = JSON.stringify(join(getBuildPath(), 'ffmpeg'));
  const input = JSON.stringify(filePath);
  const databasePath = getDatabasePath();
  if (!existsSync(databasePath)) {
    await mkdir(databasePath);
  }
  const keyframePath = join(databasePath, name);
  if (!existsSync(keyframePath)) {
    await mkdir(keyframePath);
  }
  const output = JSON.stringify(join(keyframePath, '%03d.jpeg'));
  const { stderr } = await execCmd(`${ffmpeg} -skip_frame nokey -i ${input} -vsync vfr -frame_pts true ${output}`);
  log.log(stderr);
});

ipcMain.on('revealInFinder', async (event, { fullname }) => {
  const path = JSON.stringify(fullname);
  await execCmd(`open -R ${path}`);
});

ipcMain.on('copy', async (event, { fullname, text }) => {
  if (text) {
    const quotedText = JSON.stringify(text);
    await execCmd(`echo ${quotedText} | pbcopy`);
    return;
  }
  const file = JSON.stringify(fullname);
  const cmd = JSON.stringify(`set the clipboard to (read (POSIX file ${file}) as JPEG picture)`);
  await execCmd(`osascript -e ${cmd}`);
});

ipcMain.on('listKeyframes', (event, { directory }) => {
  listFiles(directory, '.jpeg').then((files) => {
    sendToMainWindow('keyframesListed', { files });
  });
});

ipcMain.on('listDatabases', () => {
  listDirectories(getDatabasePath()).then((directories) => {
    sendToMainWindow('databasesListed', { directories });
  });
});

ipcMain.on('checkDependencies', () => checkDependencies());

autoUpdater.on('download-progress', (progress) => {
  sendToMainWindow('updateDownloadProgress', progress);
});

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail: 'A new version has been downloaded. Restart the application to apply the updates.',
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

ipcMain.on('quitAndInstall', () => {
  autoUpdater.quitAndInstall();
});
