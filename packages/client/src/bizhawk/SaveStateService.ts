import path from "node:path";
import fs from "node:fs/promises";
import { Logger, PathUtils } from "@grs/shared";
import { getRoomConfig, getStateLocation } from "../ClientConfigService.js";

const SAVE_STATE_EXTENTION = "State";
const LOGGER = Logger.getLogger("SaveStateService");

let initialized = false;
let saveStateFolderPath: string;

export async function init() {
  if(initialized) {
    return;
  }

  saveStateFolderPath = path.join(getStateLocation(), getRoomConfig().roomName);
  PathUtils.ensureDir(saveStateFolderPath);

  await cleanOutOldSaveStates(saveStateFolderPath);
  const interval = setInterval(() => cleanOutOldSaveStates(saveStateFolderPath), 2*60*1000); // Every 2 minutes
  process.on("SIGINT", () => clearInterval(interval));

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

export async function clearAllSavestates() {
  LOGGER.warn("Clearing all savestates from %s", saveStateFolderPath);
  (await fs.readdir(saveStateFolderPath))
    .map(fileName => path.join(saveStateFolderPath, fileName))
    .forEach(async file => {
      try {
        await fs.unlink(file);
      }
      catch (ex) {
        LOGGER.debug("Exception when unlinking file %s", file);
      }
    });
}

/************************************************************************
*  Internal helper functions
************************************************************************/
async function cleanOutOldSaveStates(folderPath: string) {
  LOGGER.debug("Cleaning out old savestates");
  const filenames = await fs.readdir(folderPath);
  const groupings = new Map<string, {num: number, filename: string}[]>();

  for(const filename of filenames) {
    const [prefix, number] = filename.split( "." );
    if(typeof prefix !== "string" || typeof number !== "string") {
      LOGGER.debug("Odd file found. Skipping from automated cleanup: %s", filename);
      continue;
    }
    const obj = {num: parseInt(number), filename};

    const group = groupings.get(prefix) ?? [];
    group.push(obj);
    groupings.set(prefix, group);
  }

  for(const [grouping, group] of groupings.entries()) {
    group.sort((a,b) => a.num-b.num);
    let deleted = 0;
    while(group.length > 5) {
      const toDelete = group.shift();
      if(!toDelete) {
        continue; // TS considers the case where the element in the array might be 'undefined' so we gotta filter them
      }
      await fs.unlink( path.join(folderPath, toDelete.filename) );
      deleted++;
    }
    LOGGER.debug("Cleaned out %s states for grouping %s", deleted, grouping);
  }
}

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
