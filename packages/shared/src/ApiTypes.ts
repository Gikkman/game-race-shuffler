import { RacePhase, RaceStateOverview } from "./Types.js";

export type RaceAdminAction = {
  roomName: string,
  adminKey: string,
}
export type RaceAdminSwapToGame = {
  gameName: string,
} & RaceAdminAction;
export type RaceAdminChangeRacePhase = {
  phase: RacePhase,
} & RaceAdminAction;
export type RaceAdminCompleteGame = {
  gameName: string,
  participantName: string,
} & RaceAdminAction;
export type RaceAdminUncompleteGame = {
  gameName: string,
} & RaceAdminAction;

export type CreateRoomRequest = {
  roomName: string,
  roomKey: string,
  games: string[],
  swapModeConfig: SwapModeConfig,
  swapMinCooldown: number,
  swapMaxCooldown: number,
}

export type DeleteRoomRequest = {
  roomName: string,
  adminKey: string,
}

export type RoomOverview = {
  roomId: string,
  roomName: string,
  createdAt: number,
  liveUntil: number,
  archivedAt?: number,
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
    if(typeof createRoomObj.swapMinCooldown !== "number") {
      throw "Property 'swapMinCooldown' required";
    }
    if(typeof createRoomObj.swapMaxCooldown !== "number") {
      throw "Property 'swapMaxCooldown' required";
    }
    if(createRoomObj.swapMinCooldown > createRoomObj.swapMaxCooldown) {
      throw "Property 'swapMinCooldown' may not be a larger number than 'swapMaxCooldown'";
    }
    if(createRoomObj.swapMaxCooldown < createRoomObj.swapMinCooldown) {
      throw "Property 'swapMaxCooldown' may not be a lesser number than 'swapMinCooldown'";
    }
    if(!regex.test(createRoomObj.roomName)) {
      throw "Invalid 'roomName' format. Only letters, number or underscores allowed";
    }
    if(createRoomObj.roomName.length > 60) {
      throw "Invalid 'roomName' length. At most 60 characters allowed.";
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
