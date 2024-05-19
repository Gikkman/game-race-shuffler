import { FunctionUtils } from "@grs/shared";
import RaceState, { StateUpdateCallback, type RaceStateData } from "./RaceState.js";

export type RoomStateData = {
  raceStateData: RaceStateData,
  created: number,
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
  readonly created: number;
  readonly roomName: string;
  readonly roomKey: string;
  readonly adminKey: string;
  readonly userKeys: Record<string, string>;
  readonly gameNameToLogicalName: Record<string, string>;
  readonly logicalNameToGameName: Record<string, string>;

  constructor(args:RoomStateArgs|RoomStateData, stateUpdateCallback: StateUpdateCallback) {
    if("created" in args) {
      this.raceState = new RaceState(args.raceStateData, stateUpdateCallback);
      this.created = args.created;
      this.roomName = args.roomName;
      this.roomKey = args.roomKey;
      this.adminKey = args.adminKey;
      this.userKeys = args.userKeys;
      this.gameNameToLogicalName = args.gameNameToLogicalName;
      this.logicalNameToGameName = args.logicalNameToGameName;
    }
    else {
      this.raceState = new RaceState({games: args.games}, stateUpdateCallback);
      this.created = Date.now();
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
      created: this.created,
      roomName: this.roomName,
      roomKey: this.roomKey,
      adminKey: this.adminKey,
      userKeys: this.userKeys,
      gameNameToLogicalName: this.gameNameToLogicalName,
      logicalNameToGameName: this.logicalNameToGameName,
    };
  }
}
