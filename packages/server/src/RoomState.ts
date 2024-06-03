import { FunctionUtils } from "@grs/shared";
import RaceState, { StateUpdateCallback, type RaceStateData } from "./RaceState.js";
import { randomUUID } from "node:crypto";

export type RoomStateData = {
  raceStateData: RaceStateData,
  roomId: string,
  createdAt: number,
  roomName: string,
  roomKey: string,
  adminKey: string,
  userKeys: Record<string, string>,
  gameNameToLogicalName: Record<string, string>,
  logicalNameToGameName: Record<string, string>,
}

type RoomStateArgs = {
  roomName: string,
  roomKey: string,
  adminKey: string,
  games: string[],
}

export default class RoomState {
  readonly raceState: RaceState;
  readonly roomId: string;
  readonly createdAt: number;
  readonly roomName: string;
  readonly roomKey: string;
  readonly adminKey: string;
  readonly userKeys: Record<string, string>;
  readonly gameNameToLogicalName: Record<string, string>;
  readonly logicalNameToGameName: Record<string, string>;

  constructor(args:RoomStateArgs|RoomStateData, stateUpdateCallback: StateUpdateCallback) {
    if("createdAt" in args) {
      this.raceState = new RaceState(args.raceStateData, stateUpdateCallback);
      this.roomId = args.roomId;
      this.createdAt = args.createdAt;
      this.roomName = args.roomName;
      this.roomKey = args.roomKey;
      this.adminKey = args.adminKey;
      this.userKeys = args.userKeys;
      this.gameNameToLogicalName = args.gameNameToLogicalName;
      this.logicalNameToGameName = args.logicalNameToGameName;
    }
    else {
      this.raceState = new RaceState({games: args.games}, stateUpdateCallback);
      this.roomId = randomUUID();
      this.createdAt = Date.now();
      this.roomName = args.roomName;
      this.roomKey = args.roomKey;
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

  serialize(): RoomStateData {
    return {
      raceStateData: this.raceState.serialize(),
      roomId: this.roomId,
      createdAt: this.createdAt,
      roomName: this.roomName,
      roomKey: this.roomKey,
      adminKey: this.adminKey,
      userKeys: this.userKeys,
      gameNameToLogicalName: this.gameNameToLogicalName,
      logicalNameToGameName: this.logicalNameToGameName,
    };
  }
}
