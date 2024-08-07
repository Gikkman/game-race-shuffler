import { FunctionUtils, RaceGame, RoomOverview, SwapModeConfig } from "@grs/shared";
import RaceState, { StateUpdateCallback, type RaceStateData } from "./RaceState.js";
import { randomUUID } from "node:crypto";

const ROOM_MILLIS_TO_EXIST = 24 * 60 * 60 * 1000; // 24 hours

export type RoomStateData = {
  raceStateData: RaceStateData,
  _id: string,
  createdAt: number,
  roomName: string,
  saltedRoomKey: string,
  roomKeySalt: string,
  adminKey: string,
  userKeys: Record<string, string>,
}

type RoomStateArgs = {
  roomName: string,
  saltedRoomKey: string,
  roomKeySalt: string,
  adminKey: string,
  games: string[],
  swapMinCooldown: number,
  swapMaxCooldown: number,
  swapModeConfig: SwapModeConfig,
}

export default class RoomState {
  readonly raceState: RaceState;
  readonly roomId: string;
  readonly createdAt: number;
  readonly roomName: string;
  readonly saltedRoomKey: string;
  readonly roomKeySalt: string;
  readonly adminKey: string;
  readonly userKeys: Record<string, string>;
  readonly gameNameToLogicalName: Record<string, string>;
  readonly logicalNameToGameName: Record<string, string>;

  constructor(args:RoomStateArgs|RoomStateData, stateUpdateCallback: StateUpdateCallback) {
    if("createdAt" in args) {
      this.raceState = new RaceState(args.raceStateData, stateUpdateCallback);
      this.roomId = args._id;
      this.createdAt = args.createdAt;
      this.roomName = args.roomName;
      this.saltedRoomKey = args.saltedRoomKey;
      this.roomKeySalt = args.roomKeySalt;
      this.adminKey = args.adminKey;
      this.userKeys = args.userKeys;
      this.gameNameToLogicalName = toRecord(args.raceStateData.games, "gameName", "logicalName");
      this.logicalNameToGameName = toRecord(args.raceStateData.games, "logicalName", "gameName");
    }
    else {
      this.raceState = new RaceState(args, stateUpdateCallback);
      this.roomId = randomUUID();
      this.createdAt = Date.now();
      this.roomName = args.roomName;
      this.saltedRoomKey = args.saltedRoomKey;
      this.roomKeySalt = args.roomKeySalt;
      this.adminKey = args.adminKey;
      this.userKeys = {};

      this.gameNameToLogicalName= {};
      this.logicalNameToGameName = {};
      for(const gameName of args.games) {
        const logicalName = FunctionUtils.calculateLogicalName(gameName);
        this.logicalNameToGameName[logicalName] = gameName;
        this.gameNameToLogicalName[gameName] = logicalName;
      }
    }
  }

  getStateSummary(): RoomOverview {
    return {
      createdAt: this.createdAt,
      liveUntil: this.createdAt + ROOM_MILLIS_TO_EXIST,
      roomId: this.roomId,
      roomName: this.roomName,
      raceStateData: this.raceState.getStateSummary(),
    };
  }

  __serialize(): RoomStateData {
    return {
      raceStateData: this.raceState.__serialize(),
      _id: this.roomId,
      createdAt: this.createdAt,
      roomName: this.roomName,
      saltedRoomKey: this.saltedRoomKey,
      roomKeySalt: this.roomKeySalt,
      adminKey: this.adminKey,
      userKeys: this.userKeys,
    };
  }
}

function toRecord(games: RaceGame[], key: "gameName"|"logicalName", value: "gameName"|"logicalName"): Record<string, string> {
  return games.reduce((record, currentEntity) => {
    const val = currentEntity[value];
    record[currentEntity[key]] = val;
    return record;
  }, {} as Record<string, string>);
}
