import * as path from 'path';

export const PDF_FILE_SUB_DIR = 'pdf';
export const PDF_FILE_EXPIRE_IN = 40; // ms

export const getPdfFilesStorageDir = (filename: string) => {
  return path.join(PDF_FILE_SUB_DIR, filename);
};

export const getPdfFileUrl = (baseUrl: string, filename: string) => {
  if (!baseUrl) {
    throw new Error('GOTENBERG_DOCS_URL is not configured.');
  }
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const urlPath = path.posix.join(PDF_FILE_SUB_DIR, filename);

  return new URL(urlPath, normalizedBaseUrl).toString();
};

export const getPdfFilePath = (filename: string) => {
  const storageDir = getPdfFilesStorageDir(filename);
  return path.join(global.__public_dirname, storageDir);
};
