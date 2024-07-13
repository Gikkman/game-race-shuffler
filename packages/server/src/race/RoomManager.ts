import { randomUUID, createHash, randomBytes } from "crypto";
import { CreateRoomRequest, FunctionUtils, Logger, RacePhase, RaceStateUpdate, RoomOverview } from '@grs/shared';
import * as Server from '../Server.js';
import RoomState from "./RoomState.js";
import RoomRepository from "./RoomRepository.js";
import RoomArchive from "./RoomArchive.js";
import InternalMessages from "../InternalMessages.js";


/************************************************************************
*  Setup stuff
************************************************************************/
const LOGGER = Logger.getLogger("RoomManager");
const rooms = new Map<string, RoomState>();
let initialized = false;

export async function init() {
  if(initialized) {
    return;
  }
  const data = await RoomRepository.getAll();
  data.forEach(elem => {
    const room = new RoomState(elem, generateStateUpdateCallback(elem.roomName));
    rooms.set(room.roomName, room);
  });

  /*
  TODO: Re-enable the automated room archival after ESA

  InternalMessages().addListener("cleanupCron", () => {
    const now = Date.now();
    for(const room of rooms.values()) {
      const state = room.getStateSummary();
      if(now > state.liveUntil) {
        LOGGER.info("Archiving room %s (%s) due to age", room.roomId, room.roomName);
        deleteRoom(room);
      }
    }
  });
  */

  InternalMessages().addListener("shutdown", () => {
    LOGGER.info("Calling cleanup on each room");
    for(const room of rooms.values()) {
      LOGGER.info("Calling cleanup on room %s", room.roomName);
      room.raceState.cleanup();
    }
  });
  initialized = true;
}

/************************************************************************
*  Exported function
************************************************************************/
export function createRoom(data: CreateRoomRequest) {
  const {roomName} = data;
  const stateUpdateCallback = generateStateUpdateCallback(roomName);
  const adminKey = randomUUID();
  const {saltedRoomKey, roomKeySalt} = generateRoomKey(data);
  const roomState = new RoomState({...data, saltedRoomKey, roomKeySalt, adminKey}, stateUpdateCallback);

  rooms.set(roomName, roomState);
  RoomRepository.create(roomState.__serialize());

  return {adminKey};
}

export function deleteRoom(room: RoomState) {
  rooms.delete(room.roomId);
  room.raceState.cleanup();
  RoomArchive.create(room.__serialize());
  RoomRepository.remove(room.roomId);
  rooms.delete(room.roomName);
}

export function roomNameInUse(roomName: string) {
  return rooms.has(roomName);
}

export function listRooms() {
  const roomList = [...rooms.values()];
  roomList.sort((a,b) => {
    return a.createdAt - b.createdAt;
  });
  return roomList.map(e => e.roomName);
}

export function getRoomOverview(room: RoomState): RoomOverview {
  return room.getStateSummary();
}

export function joinRace(room: RoomState, userName: string): string {
  room.raceState.addParticipant(userName);
  const userKey = generateUserKey(userName);
  room.userKeys[userName] = userKey;
  return userKey;
}

export function rejoinRace(room: RoomState, userName: string): string {
  const userKey = room.userKeys[userName];
  if(!userKey) {
    throw new Error("Cannot rejoin room " + room.roomName + ". No user key exists for userName " + userName);
  }
  return userKey;
}

export function completeGame(room: RoomState, userName: string, gameName: string) {
  room.raceState.completeGame(gameName, userName);
}

export function roomExists(roomName: string): Readonly<RoomState>|undefined {
  return rooms.get(roomName);
}

export function usernameIsAvailable(room: RoomState, userName: string) {
  return room.userKeys[userName] === undefined;
}

export function hasAdminAccess(room: RoomState, adminKey: string) {
  return room.adminKey === adminKey;
}

export function hasRoomAccess(room: RoomState, roomKey: string) {
  const saltedRoomKey = hashRoomKey(roomKey, room.roomKeySalt);
  return room.saltedRoomKey === saltedRoomKey;
}

export function hasUserAccess(room: RoomState, userName: string, userKey: string) {
  return room.userKeys[userName] === userKey;
}

export function getGameNameForRace(room: RoomState, gameLogicalName: string) {
  return room.logicalNameToGameName[gameLogicalName];
}

/************************************************************************
*  Admin functions
************************************************************************/

export function adminControl_changePhase(room: RoomState, phase: RacePhase) {
  room.raceState.adminControl_changePhase(phase);
}

export function adminControl_manualSwapRandom(room: RoomState) {
  room.raceState.adminControl_manualSwapRandom();
}

export function adminControl_manualSwapToGame(room: RoomState, gameName: string) {
  room.raceState.adminControl_manualSwapToGame(gameName);
}

export function adminControl_markGameAsCompleted(room: RoomState, gameName: string, participantName: string) {
  room.raceState.adminControl_markGameAsCompleted(gameName, participantName);
}

export function adminControl_markGameAsUncompleted(room: RoomState, gameName: string) {
  room.raceState.adminControl_markGameAsUncompleted(gameName);
}

export function adminControl_clearSwapQueue(room: RoomState) {
  room.raceState.adminControl_clearSwapQueue();
}

export function adminControl_clearBlockTimer(room: RoomState) {
  room.raceState.adminControl_clearBlockTimer();
}

export function adminControl_setBlockTimer(room: RoomState) {
  room.raceState.adminControl_setBlockTimer();
}

/************************************************************************
*  Internal functions
************************************************************************/

function generateUserKey(userName: string): string {
  const sha = createHash('sha256');
  return sha.update(userName+generateRandomString(20)).digest('hex');
}

function generateRoomKey(data: CreateRoomRequest) {
  const roomKeySalt = generateRandomString(8);
  const saltedRoomKey = hashRoomKey(data.roomKey, roomKeySalt);
  return {saltedRoomKey, roomKeySalt};
}

function hashRoomKey(roomKey: string, roomKeySalt: string) {
  return createHash('sha256').update(roomKeySalt+roomKey).digest('hex');
}

function generateStateUpdateCallback(roomName: string) {
  return (update: RaceStateUpdate) => {

    Server.tipc().send("raceStateUpdate", {...update, roomName});

    if(update.changes.includes("currentGame") && update.currentGame) {
      const gameLogicalName = FunctionUtils.calculateLogicalName(update.currentGame.gameName);
      Server.tipc().send("loadGame", {roomName, gameLogicalName});
    }

    if(update.changes.includes("phase") && update.phase === "ENDED") {
      const participants = update.participants;
      Server.tipc().send("raceEnded", {roomName, participants});
    }

    // If the only updated field is swapEventData, don't trigger an update
    // This is because swapEventData isn't persisted to disc, and the only case where
    // it is the only updated field is when a race is paused, but a swap is triggered anyway
    if(update.changes.length === 1 && update.changes.includes("swapEventData")) {
      return;
    }

    const room = rooms.get(roomName);
    if(room) {  // This can't really ever be falsy but I guess you never know
      RoomRepository.update(room.__serialize());
    }
  };
}

function generateRandomString(length:number) {
  return randomBytes(length/2+1).toString('base64url').slice(0,length);
}
