export type RaceGame = {
  name: string,
  completedByParticipant?: string,
}

export type RaceParticipant = {
  name: string,
  score: number,
  leader: boolean,
  status: "DISCONNECTED"|"CONNECTED"
}

export type RacePhase = "NEW"|"ACTIVE"|"ENDED"

export type RaceStateOverview = {
  games: RaceGame[],
  participants: RaceParticipant[],
  phase: RacePhase,
  currentGame?: RaceGame
}

export type RaceStateUpdate = RaceStateOverview & {
  changes: (keyof RaceStateOverview)[]
}


export type CreateRoomRequest = {
  name: string,
  password: string,
  // TODO: Custom games as part of body
}
