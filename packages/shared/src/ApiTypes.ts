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
  swapModeConfig: SwapModeConfig,
}

export type DeleteRoomRequest = {
  roomName: string,
  adminKey: string,
}

export type RoomOverview = {
  roomId: string,
  roomName: string,
  createdAt: number,
  raceStateData: RaceStateOverview
}

export type SwapModeConfig = {
  swapMode: "manual"|"tiltify",
  swapModeExtraData: string,
}

export function isCreateRoomRequest(obj: unknown): obj is CreateRoomRequest {
  if (typeof obj === 'object' && obj !== null
    && 'roomName' in obj && 'roomKey' in obj
    && 'games' in obj
  ) {

    const regex = /^[a-zA-Z0-9_-]+$/;
    const createRoomObj = obj as CreateRoomRequest;

    if(typeof createRoomObj.roomName !== 'string') {
      throw "Property 'roomName' required";
    }
    if(typeof createRoomObj.roomKey !== 'string') {
      throw "Property 'roomKey' required";
    }
    if(!regex.test(createRoomObj.roomName)) {
      throw "Invalid 'roomName' format. Only letters, number or underscores allowed";
    }
    if(!Array.isArray(createRoomObj.games)) {
      throw "Invalid 'games' format. Should be an array";
    }
    if(!createRoomObj.games.every(e => typeof e === "string" && e.length > 0)) {
      throw "Invalid 'games' format. Every element should be a string and be longer than 0 characters";
    }
    if(typeof createRoomObj.swapModeConfig !== 'object' || createRoomObj.swapModeConfig === null) {
      throw "Invalid 'swapModeConfig' format. Should be an object";
    }
    if(createRoomObj.swapModeConfig.swapMode === "tiltify" && !createRoomObj.swapModeConfig.swapModeExtraData) {
      throw "Invalid 'swapModeConfig' format. Mode 'tiltify' requires a campaign-id";
    }

    return true;
  }
  return false;
}
