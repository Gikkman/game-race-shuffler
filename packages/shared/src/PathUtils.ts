import fs from 'node:fs';
import path from 'node:path';

/************************************************************************
 *  Module Variable
 ************************************************************************/
let initialized = false;
let projectRoot: string;
let workspaceRoot: string;

/************************************************************************
 *  Exported functions
 ************************************************************************/
export function init(__dirname: string) {
  if (initialized) {
    return;
  }
  initialized = true;

  // The package-lock.json file typically only exists in the project root
  const projectPackageLockJson = findFileUpwards("package-lock.json", __dirname);
  if (!projectPackageLockJson) {
    throw new Error(`Couldn't find a npm project root. Please check your project setup.`);
  }
  projectRoot = path.dirname(projectPackageLockJson);
  console.log("PathUtil set projectRoot to " + projectRoot);

  // Each workspace typically has their own package.json file
  const workspacePackageJson = findFileUpwards("package.json", __dirname);
  if (!workspacePackageJson) {
    throw new Error(`Couldn't find a npm workspace root. Please check your project setup.`);
  }
  workspaceRoot = path.dirname(workspacePackageJson);
  console.log("PathUtil set workspaceRoot to " + workspaceRoot);
}

export function pathRelativeToProjectRoot(...segments: string[]) {
  checkInitialized();
  return path.join(projectRoot, ...segments);
}

export function pathRelativeToWorkspaceRoot(...segments: string[]) {
  checkInitialized();
  return path.join(workspaceRoot, ...segments);
}

export function existsSync(p: string): boolean {
  if(path.isAbsolute(p)) {
    return fs.existsSync(p);
  }
  const relativePath = pathRelativeToProjectRoot(p);
  return fs.existsSync(relativePath);
}

/************************************************************************
 *  Internal functions
 ************************************************************************/
function checkInitialized() {
  if (initialized) {
    return;
  }
  throw new Error(`Module 'PathUtils' was called before it was initialized`);
}

function findFileUpwards(fileName: string, currentDir: string): string | null {
  const filePath = path.join(currentDir, fileName);
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  // Get the parent directory by getting the dir containing the currentDir
  const parentDir = path.dirname(currentDir);

  // If we've reached the root directory, return null
  if (parentDir === currentDir) {
    return null;
  }

  // Recursively search in the parent directory
  return findFileUpwards(fileName, parentDir);
}
