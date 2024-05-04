import { RaceStateOverview } from "./Types.js";

export type StartRaceRequest = {
  roomName: string,
  adminKey: string,
}

export type SwapGameRequest = {
  roomName: string,
  adminKey: string,
}

export type JoinRaceRequest = {
  roomName: string,
  roomKey: string,
  userName: string,
}

export type CreateRoomRequest = {
  roomName: string,
  roomKey: string,
  adminKey: string,
  games: string[],
}

export type RoomOverview = {
  roomName: string,
  created: number,
  raceState: RaceStateOverview
}

export function isCreateRoomRequest(obj: unknown): obj is CreateRoomRequest {
  if (typeof obj === 'object' && obj !== null
    && 'roomName' in obj && 'roomKey' in obj
    && 'adminKey' in obj && 'games' in obj
  ) {
    const regex = /^[a-zA-Z0-9_-]+$/;
    const createRoomObj = obj as CreateRoomRequest;
    return (
      typeof createRoomObj.roomName === 'string' &&
      typeof createRoomObj.roomKey === 'string' &&
      typeof createRoomObj.adminKey === 'string' &&
      regex.test(createRoomObj.roomName) &&
      Array.isArray(createRoomObj.games) &&
      createRoomObj.games.every(e => typeof e === "string" && e.length > 0)
    );
  }
  return false;
}
