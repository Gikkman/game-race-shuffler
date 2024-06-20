import { randomUUID, createHash } from "crypto";
import { CreateRoomRequest, FunctionUtils, RaceStateUpdate, RoomOverview } from '@grs/shared';
import * as Server from '../Server.js';
import RoomState from "./RoomState.js";
import RoomRepository from "./RoomRepository.js";


/************************************************************************
*  Setup stuff
************************************************************************/
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

  process.on("SIGINT", () => {
    for(const room of rooms.values()) {
      room.raceState.cleanup();
    }
  });
  initialized = true;
}

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
  const stateUpdateCallback = generateStateUpdateCallback(roomName);
  const adminKey = randomUUID();
  const roomState = new RoomState({...data, adminKey}, stateUpdateCallback);

  rooms.set(roomName, roomState);
  RoomRepository.create(roomState.__serialize());

  return {adminKey};
}

export function deleteRoom(room: RoomState) {
  rooms.delete(room.roomId);
  room.raceState.cleanup();
  RoomRepository.remove(room.roomId);
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
  const raceStateData = room.raceState.getStateSummary();
  return {
    roomId: room.roomId,
    roomName: room.roomName,
    createdAt: room.createdAt,
    raceStateData,
  };
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

    const room = rooms.get(roomName);
    if(room) {  // This can't really ever be falsy but I guess you never know
      RoomRepository.update(room.__serialize());
    }
  };
}
