import * as path from 'path';

export const APP_DATA_PATH = 'data';
const LOCAL_STORAGE_DIR = `${APP_DATA_PATH}/storage`;

/**
 * 获取本地存储路径
 * 如果设置了环境变量 LOCAL_STORAGE_PATH，则使用该路径
 * 否则使用默认路径：项目根目录的上一级目录下的 data/storage
 */
export function getLocalStoragePath(): string {
  // 优先使用环境变量
  const envPath = process.env.LOCAL_STORAGE_PATH;
  if (envPath) {
    return path.resolve(envPath);
  }

  // 默认路径：项目根目录的上一级目录下的 data/storage
  return path.resolve(
    process.cwd(),
    '..',
    '..',
    LOCAL_STORAGE_DIR,
  );
}

// 保持向后兼容
export const LOCAL_STORAGE_PATH = getLocalStoragePath();
