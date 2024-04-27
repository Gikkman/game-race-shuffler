import { FunctionUtils } from "../../shared/dist/_index.js";

export * as ServerConfigService from "./ServerConfigService.js";

let initialized = false;

const games = [
  "Super Mario Bros.",
  "StarTropics",
  "Chip n Dale - Rescue Rangers",
  "Snake Rattle n Roll"
];

const logicalGameNames: string[] = [];

export function init() {
  if(initialized) {
    return;
  }
  games.forEach(s => {
    const logicalName = FunctionUtils.calculateLogicalName(s);
    logicalGameNames.push(logicalName);
  });
  initialized = true;
}

export function getGamesList() {
  ensureInitialized();
  return {games, logicalGameNames};
}

export function getConnectionKey() {
  ensureInitialized();
  return "KEY-HERE";
}

function ensureInitialized() {
  if(!initialized) {
    throw new Error("Module is not initialized: " + module.filename);
  }
}
