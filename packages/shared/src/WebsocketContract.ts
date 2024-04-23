import { RaceParticipant, RaceStateUpdate } from "./Types";

export interface WebsocketContract {
  loadGame: string,
  raceStateUpdate: RaceStateUpdate,
  raceEnded: RaceParticipant[]
  completeGame: (participantName: string, gameLogicalName: string) => boolean,
}
