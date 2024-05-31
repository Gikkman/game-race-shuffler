import { Logger, PathUtils } from "@grs/shared";
import { ClientConfigService } from "./ClientConfigService.js";
import fs from "node:fs/promises";
import path from "node:path";
import { tipc } from "./WebServer.js";
import { getGameForLogicalName } from "./GameFinderService.js";
import { loadGame } from "./bizhawk/BizhawkService.js";

const LOGGER = Logger.getLogger("RaceService");
let initialized = false;

let userKey: string;
let raceDataFileLocation: string;

/************************************************************************
*  Init
************************************************************************/

export async function init() {
  if(initialized) {
    return;
  }
  const {roomName, roomKey, userName} = ClientConfigService.getRoomConfig();

  raceDataFileLocation = path.join(ClientConfigService.getStateLocation(), roomName+".txt");

  let gameLogicalName: string|undefined;
  if(PathUtils.existsSync(raceDataFileLocation)) {
    LOGGER.info(`Attempting to rejoin room %s with name %s`, roomName, userName);
    userKey = await fs.readFile(raceDataFileLocation, {encoding: "utf8"});
    gameLogicalName = (await rejoinRace( {roomName, userKey, userName} )).gameLogicalName;
    LOGGER.info(`Rejoin requiest successful`);
  }
  else {
    LOGGER.info(`Attempting to join room %s with name %s`, roomName, userName);
    const response = await joinRace({roomKey, roomName, userName});
    writeUserKey(raceDataFileLocation, response.userKey);
    userKey = response.userKey;
    gameLogicalName = response.gameLogicalName;
    LOGGER.info(`Join requiest successful`);
  }

  if(gameLogicalName) {
    LOGGER.info(`A game was loaded when we joined. Attempting to load game from logical name %s`, gameLogicalName);
    const game = getGameForLogicalName(gameLogicalName);
    if(game) {
      loadGame(game);
    }
    else {
      LOGGER.warn(`Initial game load failed. No game found mapping to logical name %s`, gameLogicalName);
    }
  }

  initialized = true;
}


/************************************************************************
*  Exported functions
*  For knowing stuff about the current race
************************************************************************/

export function getUserKey() {
  return userKey;
}


function writeUserKey(where: string, userKey: string){
  fs.writeFile(where, userKey, "utf8");
}

/************************************************************************
*  Internal functions for (re)joining a race
************************************************************************/
async function joinRace(args: {roomName: string, userName: string, roomKey: string}) {
  const {roomName, roomKey, userName} = args;
  try {
    const res = await tipc().invoke("joinRace", { roomName, roomKey, userName });
    LOGGER.info("Successfully joined room " + roomName + " as user " + userName);
    return res;
  }
  catch (e) {
    LOGGER.error("The server rejected our join request");
    process.exit(1);
  }
}

async function rejoinRace(args: {roomName: string, userName: string, userKey: string}) {
  const {roomName, userName, userKey} = args;
  try {
    const res = await tipc().invoke("rejoinRace", { roomName, userName, userKey });
    LOGGER.info("Successfully rejoined room " + roomName + " as user " + userName);
    return res;
  }
  catch (e) {
    LOGGER.error("The server rejected our rejoin request");
    process.exit(1);
  }
}
