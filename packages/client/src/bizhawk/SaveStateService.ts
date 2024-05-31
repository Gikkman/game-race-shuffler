import path from "node:path";
import fs from "node:fs/promises";
import { PathUtils } from "@grs/shared";
import { getRoomConfig, getStateLocation } from "../ClientConfigService.js";

const SAVE_STATE_EXTENTION = "State";

let initialized = false;
let saveStateFolderPath: string;

export function init() {
  if(initialized) {
    return;
  }

  saveStateFolderPath = path.join(getStateLocation(), getRoomConfig().roomName);
  PathUtils.ensureDir(saveStateFolderPath);

  initialized = true;
}

export async function getLatestSaveStatePath(game: GameData) {
  const index = await highestIndexForSaveStates(saveStateFolderPath, game);
  if(index === undefined) {
    return undefined;
  }
  return saveStatePath(saveStateFolderPath, index, game);
}

export async function deleteLatestSaveState(game: GameData) {
  const index = await highestIndexForSaveStates(saveStateFolderPath, game);
  if(index === undefined) {
    return;
  }
  const filePath = saveStatePath(saveStateFolderPath, index, game);
  fs.unlink(filePath);
}

export async function getNextSaveStatePath(game: GameData) {
  const index = (await highestIndexForSaveStates(saveStateFolderPath, game)) ?? 0;
  return saveStatePath(saveStateFolderPath, index+1, game);
}

/************************************************************************
*  Internal helper functions
************************************************************************/

async function highestIndexForSaveStates(folderPath: string, game: GameData): Promise<number|undefined> {
  const nameLenght = game.logicalName.length;
  const extensionLenght = SAVE_STATE_EXTENTION.length;
  const highestIndex = (await fs.readdir(saveStateFolderPath))
    .filter(f => f.startsWith(game.logicalName))    // Only keep files with the game's name
    .map(f => f.substring(nameLenght+1))            // Remove the game's name (plus the trailing dot)
    .map(f => f.slice(0, extensionLenght+1))        // Remove the trailing extension (plus the leading dot)
    .map(f => parseInt(f))                          // Make them number
    .reduce((acc, curr) => Math.max(acc, curr), -1);// Find highest number
  return highestIndex >= 0 ? highestIndex : undefined;
}

function saveStatePath(folderPath: string, index: number, game: GameData): string {
  const fileName = `${game.logicalName}.${index}.${SAVE_STATE_EXTENTION}`;
  return path.join(folderPath, fileName);
}
