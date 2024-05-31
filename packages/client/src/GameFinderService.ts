import fs from 'node:fs';
import path from 'node:path';

import { FunctionUtils, PathUtils } from '@grs/shared';

import { ClientConfigService } from "./ClientConfigService.js";

const nameFileMap = new Map<string, GameData>();
let initialized = false;

/************************************************************************
*  Exported Functions
************************************************************************/

export function init() {
  if(initialized) {
    return;
  }
  const gameLocation = ClientConfigService.getGameLocation();
  fs.readdirSync(gameLocation, {withFileTypes: true})
    .filter(e => e.isFile())
    .map(e => calculateAbsolutePath(e, gameLocation))
    .map(absolutePathToGameData)
    .forEach(e => nameFileMap.set(e.logicalName, e));
  initialized = true;
}

export function getGameForLogicalName(logicalName: string) {
  ensureInitialized();
  return nameFileMap.get(logicalName);
}

/************************************************************************
*  Internal Functions
************************************************************************/

function calculateAbsolutePath(file: fs.Dirent, gameLocation: string) {
  return PathUtils.toAbsolutePath(file.name, gameLocation);
}

function absolutePathToGameData(absolutePath: string): GameData {
  const fileName = path.basename(absolutePath);
  let firstParanthesis = Number.MAX_SAFE_INTEGER;
  let firstBracket = Number.MAX_SAFE_INTEGER;
  let lastDot = Number.MAX_SAFE_INTEGER;
  for(let i = 0; i < fileName.length; i++) {
    const c = fileName[i];
    if(c === '(' && firstParanthesis > i) {
      firstParanthesis = i;
    }
    if(c === '[' && firstBracket > i) {
      firstBracket = i;
    }
    if(c === '.') {
      lastDot = i;
    }
  }
  const gameName = fileName.substring(0, Math.min(firstParanthesis, firstBracket, lastDot) ).trim();
  return {absolutePath, gameName, fileName, logicalName: FunctionUtils.calculateLogicalName(gameName)};
}

function ensureInitialized() {
  if(!initialized) {
    throw new Error("Module is not initialized: " + module.filename);
  }
}
