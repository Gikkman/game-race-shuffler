import { randomUUID, createHash } from "crypto";
import { CreateRoomRequest, FunctionUtils, RoomOverview } from '@grs/shared';
import * as Server from './Server.js';
import RaceState from './RaceState.js';


/************************************************************************
*  Setup stuff
************************************************************************/

type RoomState = {
  raceState: RaceState,
  created: number,
  name: string,
  key: string,
  adminKey: string,
  userKeys: Record<string, string>,
  gameNameToLogicalName: Record<string, string>,
  logicalNameToGameName: Record<string, string>,
}

const rooms = new Map<string, RoomState>();

/************************************************************************
*  Exported function
************************************************************************/

export function startRace(roomName: string) {
  rooms.get(roomName)?.raceState.startRace();
}

export function swapGame(roomName: string) {
  rooms.get(roomName)?.raceState.swapGameIfPossible();
}

export function createRoom(data: CreateRoomRequest) {
  const {roomName} = data;
  const raceState = new RaceState({
    games: data.games,
    onStateUpdate(update) {
      Server.tipc().send("raceStateUpdate", {...update, roomName});
      if(update.changes.includes("currentGame") && update.currentGame) {
        const gameLogicalName = FunctionUtils.calculateLogicalName(update.currentGame.gameName);
        Server.tipc().send("loadGame", {roomName, gameLogicalName});
      }
      if(update.changes.includes("phase") && update.phase === "ENDED") {
        const participants = update.participants;
        Server.tipc().send("raceEnded", {roomName, participants});
      }
    },
  });

  const gameNameToLogicalName: Record<string,string> = {};
  const logicalNameToGameName: Record<string,string> = {};
  for(const gameName of data.games) {
    const logicalName = FunctionUtils.calculateLogicalName(gameName);
    logicalNameToGameName[logicalName] = gameName;
    gameNameToLogicalName[gameName] = logicalName;
  }

  rooms.set(data.roomName, {
    raceState,
    name: data.roomName,
    created: Date.now(),
    key: data.roomKey,
    adminKey: data.adminKey,
    userKeys: {},
    gameNameToLogicalName,
    logicalNameToGameName,
  });
}

export function roomNameInUse(roomName: string) {
  return rooms.has(roomName);
}

export function listRooms() {
  const roomList = [...rooms.values()];
  roomList.sort((a,b) => {
    return a.created - b.created;
  });
  return roomList.map(e => e.name);
}

export function getRoom(roomName: string|undefined): RoomOverview|undefined {
  const room = rooms.get(roomName ?? "");
  if(!room) {
    return;
  }
  const raceState = room.raceState.getStateSummary();
  return {
    roomName: room.name,
    created: room.created,
    raceState: raceState,
  };
}

export function joinRace(roomName: string, userName: string): {userKey: string}|undefined {
  const room = rooms.get(roomName ?? "");
  if(!room) {
    return;
  }
  room.raceState.addParticipant(userName);
  const userKey = generateUserKey(userName);
  room.userKeys[userName] = userKey;
  return {userKey};
}

export function completeGame(roomName: string, userName: string, gameName: string) {
  const room = rooms.get(roomName);
  if(!room) {
    return;
  }
  room.raceState.completeGame(gameName, userName);
}

export function roomExists(roomName: string) {
  return rooms.has(roomName);
}

export function usernameIsAvailable(roomName: string, userName: string) {
  return rooms.get(roomName)?.userKeys[userName] === undefined;
}

export function hasAdminAccess(roomName: string, adminKey: string) {
  return rooms.get(roomName)?.adminKey === adminKey;
}

export function hasRoomAccess(roomName: string, roomKey: string) {
  return rooms.get(roomName)?.key === roomKey;
}

export function hasUserAccess(args: {roomName: string, userName: string, userKey: string}) {
  return rooms.get(args.roomName)?.userKeys[args.userName] === args.userKey;
}

export function getGameNameForRace(args: {roomName: string, gameLogicalName: string}) {
  return rooms.get(args.roomName)?.logicalNameToGameName[args.gameLogicalName];
}

function generateUserKey(userName: string): string {
  const sha = createHash('sha1');
  const uuid = randomUUID();
  return sha.update(userName+uuid).digest('hex');
}
