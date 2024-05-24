import { RaceParticipant, RaceStateOverview, RaceStateUpdate } from "./Types.js";

export interface WebsocketContract {
  loadGame: {gameLogicalName: string, roomName: string},
  raceStateUpdate: RaceStateUpdate & {roomName: string},
  raceEnded: {participants: RaceParticipant[], roomName: string}
  completeGame: (data: CompleteGameRequest) => boolean,
  joinRace: (data: JoinRaceRequest) => ({userKey: string, raceState: RaceStateOverview}),
  rejoinRace: (data: ReJoinRaceRequest) => ({raceState: RaceStateOverview}),
}

type JoinRaceRequest = {
  roomName: string,
  roomKey: string,
  userName: string,
}

type ReJoinRaceRequest = {
  roomName: string,
  userName: string,
  userKey: string,
}

type CompleteGameRequest = {
  roomName: string,
  userName: string,
  userKey: string,
  gameLogicalName: string,
}
