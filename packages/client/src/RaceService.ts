import fs from "node:fs/promises";
import path from "node:path";
import { FunctionUtils, Logger, PathUtils, RoomOverview } from "@grs/shared";
import { ClientConfigService } from "./ClientConfigService.js";
import { tipc } from "./WebServer.js";
import { getGameForLogicalName } from "./GameFinderService.js";
import { loadGame } from "./bizhawk/BizhawkService.js";
import { clearAllSavestates } from "./bizhawk/SaveStateService.js";

const LOGGER = Logger.getLogger("RaceService");
let initialized = false;

let userKey: string;
let roomId: string;

/************************************************************************
*  Init
************************************************************************/

export async function init() {
  if(initialized) {
    return;
  }
  const serverHost = ClientConfigService.getServerHost();
  const {roomName, roomKey, userName} = ClientConfigService.getRoomConfig();

  const roomData = await queryRoom(serverHost, roomName);

  let gameLogicalName: string|undefined;
  const raceDataFileLocation = path.join(ClientConfigService.getStateLocation(), roomName+".json");
  if(PathUtils.existsSync(raceDataFileLocation)) {
    const roomDataFile = await readRoomDataFile(raceDataFileLocation);
    if(roomDataFile.roomId === roomData.roomId) {
      LOGGER.info(`Attempting to rejoin room %s with name %s`, roomName, userName);
      userKey = roomDataFile.userKey;
      roomId = roomDataFile.roomId;
      gameLogicalName = (await rejoinRace( {roomName, userKey, userName} )).gameLogicalName;
      LOGGER.info(`Rejoin requiest successful`);
    }
    else {
      LOGGER.debug(`There existed a data file for room %s, but the roomId didn't match with the server. We assume this is another room that just shares name, and tries to join normally`, roomName);
      clearAllSavestates();
    }
  }
  if(userKey === undefined) {
    LOGGER.info(`Attempting to join room %s with name %s`, roomName, userName);
    const response = await joinRace({roomKey, roomName, userName});
    writeRoomDataFile(raceDataFileLocation, response);
    userKey = response.userKey;
    roomId = response.roomId;
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

export function getRoomId() {
  return roomId;
}

/************************************************************************
*  Internal functions for (re)joining a race
************************************************************************/
async function queryRoom(serverHost: string, roomName: string): Promise<RoomOverview> {
  const url = `${FunctionUtils.isSecureHost(serverHost) ? "https://" : "http://"}${serverHost}/api/room/${roomName}`;
  try {
    const res = await fetch(url);
    return res.json();
  }
  catch(ex) {
    LOGGER.error("Failed to query for room %s", roomName);
    LOGGER.error(ex as Error);
    process.exit(1);
  }
}

async function readRoomDataFile(filePath: string) {
  const content = await fs.readFile(filePath, {encoding: "utf8"});
  const json = JSON.parse(content);
  const {userKey, roomId} = json;
  if(typeof userKey === "string" && typeof roomId === "string") {
    return {userKey, roomId};
  }
  return {userKey: undefined, roomId: undefined};
}

async function writeRoomDataFile(where: string, data: {roomId: string, userKey: string}){
  return fs.writeFile(where, JSON.stringify(data), "utf8");
}

async function joinRace(args: {roomName: string, userName: string, roomKey: string}) {
  const {roomName, roomKey, userName} = args;
  try {
    const res = await tipc().invoke("joinRace", { roomName, roomKey, userName });
    LOGGER.info("Successfully joined room " + roomName + " as user " + userName);
    return res;
  }
  catch (e) {
    LOGGER.error("The server rejected our join request");
    LOGGER.error(e as Error);
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
    LOGGER.error(e as Error);
    process.exit(1);
  }
}
