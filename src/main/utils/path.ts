import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const getDataPath = () => {
  let userData;
  if (app.isPackaged) {
    userData = app.getPath('userData');
  } else {
    userData = app.getAppPath();
  }

  const dataPath = path.join(userData, 'data');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
};

const getTmpPath = () => {
  const userData = app.getPath('userData');
  return path.join(userData, 'tmp');
};

const rootPath = app.isPackaged ? app.getAppPath() : __dirname;

const getModelsPath = () => {
  let userData;
  if (app.isPackaged) {
    userData = app.getPath('userData');
  } else {
    userData = app.getAppPath();
  }
  const modelPath = path.join(userData, 'models');
  if (!fs.existsSync(modelPath)) {
    fs.mkdirSync(modelPath, { recursive: true });
  }
  return modelPath;
};

const getDefaultFileSavePath = () => {
  let userData;
  if (app.isPackaged) {
    userData = app.getPath('userData');
  } else {
    userData = app.getAppPath();
  }
  const filesPath = path.join(userData, 'data', 'files');
  if (!fs.existsSync(filesPath)) {
    fs.mkdirSync(filesPath, { recursive: true });
  }
  return filesPath;
};

const getAssetsPath = () => {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');
};

export {
  getDataPath,
  getTmpPath,
  getModelsPath,
  rootPath,
  getAssetsPath,
  getDefaultFileSavePath,
};
