import { randomUUID, createHash } from "crypto";
import { CreateRoomRequest, RoomOverview } from '@grs/shared';
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
  userKeys: Map<string, string>,
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
  const raceState = new RaceState({
    games: data.games,
    onStateUpdate(update) {
      Server.tipc().send("raceStateUpdate", {...update, roomName: data.roomName});
    },
  });
  rooms.set(data.roomName, {
    raceState,
    name: data.roomName,
    created: Date.now(),
    key: data.roomKey,
    adminKey: data.adminKey,
    userKeys: new Map()
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
  room.userKeys.set(userName, userKey);
  return {userKey};
}

export function roomExists(roomName: string) {
  return rooms.has(roomName);
}

export function usernameIsAvailable(roomName: string, userName: string) {
  return rooms.get(roomName)?.userKeys.has(userName) === false;
}

export function hasAdminAccess(roomName: string, adminKey: string) {
  return rooms.get(roomName)?.adminKey === adminKey;
}

export function hasRoomAccess(roomName: string, roomKey: string) {
  return rooms.get(roomName)?.key === roomKey;
}

export function hasUserAccess(roomName: string, userName: string, userKey: string) {
  return rooms.get(roomName)?.userKeys.get(userName) === userKey;
}

function generateUserKey(userName: string): string {
  const sha = createHash('sha1');
  const uuid = randomUUID();
  return sha.update(userName+uuid).digest('hex');
}
