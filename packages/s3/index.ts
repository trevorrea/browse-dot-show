// Re-export all functions from the client module
export {
  fileExists,
  directoryExists,
  createDirectory,
  getFile,
  listFiles,
  getDirectorySize,
  saveFile,
  deleteFile,
  getSignedUrl,
  listDirectories,
  // Export internal functions for testing
  getBucketName,
  getLocalFilePath,
  getFileStorageEnv,
  LOCAL_S3_PATH
} from './client.js'; 