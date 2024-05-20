import { randomUUID, createHash } from "crypto";
import { CreateRoomRequest, FunctionUtils, RaceStateUpdate, RoomOverview } from '@grs/shared';
import * as Server from './Server.js';
import RoomState from "./RoomState.js";


/************************************************************************
*  Setup stuff
************************************************************************/

const rooms = new Map<string, RoomState>();

/************************************************************************
*  Exported function
************************************************************************/

export function startRace(room: RoomState) {
  room.raceState.startRace();
}

export function swapGame(room: RoomState) {
  room.raceState.swapGameIfPossible();
}

export function createRoom(data: CreateRoomRequest) {
  const {roomName} = data;
  const stateUpdateCallback = (update: RaceStateUpdate) => {
    Server.tipc().send("raceStateUpdate", {...update, roomName});
    if(update.changes.includes("currentGame") && update.currentGame) {
      const gameLogicalName = FunctionUtils.calculateLogicalName(update.currentGame.gameName);
      Server.tipc().send("loadGame", {roomName, gameLogicalName});
    }
    if(update.changes.includes("phase") && update.phase === "ENDED") {
      const participants = update.participants;
      Server.tipc().send("raceEnded", {roomName, participants});
    }
  };
  const adminKey = randomUUID();
  const roomState = new RoomState({...data, adminKey}, stateUpdateCallback);
  rooms.set(roomName, roomState);
  return {adminKey};
}

export function roomNameInUse(roomName: string) {
  return rooms.has(roomName);
}

export function listRooms() {
  const roomList = [...rooms.values()];
  roomList.sort((a,b) => {
    return a.created - b.created;
  });
  return roomList.map(e => e.roomName);
}

export function getRoomOverview(room: RoomState): RoomOverview {
  const raceState = room.raceState.getStateSummary();
  return {
    roomName: room.roomName,
    created: room.created,
    raceState: raceState,
  };
}

export function joinRace(room: RoomState, userName: string): {userKey: string} {
  room.raceState.addParticipant(userName);
  const userKey = generateUserKey(userName);
  room.userKeys[userName] = userKey;
  return {userKey};
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
  return room.roomKey === roomKey;
}

export function hasUserAccess(room: RoomState, userName: string, userKey: string) {
  return room.userKeys[userName] === userKey;
}

export function getGameNameForRace(room: RoomState, gameLogicalName: string) {
  return room.logicalNameToGameName[gameLogicalName];
}

function generateUserKey(userName: string): string {
  const sha = createHash('sha1');
  const uuid = randomUUID();
  return sha.update(userName+uuid).digest('hex');
}
