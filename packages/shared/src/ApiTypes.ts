import { RaceStateOverview } from "./Types.js";

export type StartRaceRequest = {
  roomName: string,
  adminKey: string,
}

export type SwapGameRequest = {
  roomName: string,
  adminKey: string,
}

export type CompleteGameRequest = {
  roomName: string,
  userName: string,
  adminKey: string,
  gameLogicalName: string,
}

export type CreateRoomRequest = {
  roomName: string,
  roomKey: string,
  games: string[],
}

export type RoomOverview = {
  roomId: string,
  roomName: string,
  createdAt: number,
  raceStateData: RaceStateOverview
}

export function isCreateRoomRequest(obj: unknown): obj is CreateRoomRequest {
  if (typeof obj === 'object' && obj !== null
    && 'roomName' in obj && 'roomKey' in obj
    && 'games' in obj
  ) {
    const regex = /^[a-zA-Z0-9_-]+$/;
    const createRoomObj = obj as CreateRoomRequest;
    return (
      typeof createRoomObj.roomName === 'string' &&
      typeof createRoomObj.roomKey === 'string' &&
      regex.test(createRoomObj.roomName) &&
      Array.isArray(createRoomObj.games) &&
      createRoomObj.games.every(e => typeof e === "string" && e.length > 0)
    );
  }
  return false;
}
