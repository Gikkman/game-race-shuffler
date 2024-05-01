import { CreateRoomRequest, RoomOverview, StartRaceRequest, SwapGameRequest } from "@grs/shared";

export async function getRoomList(): Promise<string[]> {
  const res = await fetch("/api/room");
  return res.json();
}

export async function getRoom(roomName: string): Promise<RoomOverview> {
  const res = await fetch("/api/room/"+roomName);
  return res.json();
}

export async function createRoom(data: CreateRoomRequest): Promise<boolean> {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return res.ok;
}

export async function startRace(data: StartRaceRequest): Promise<boolean> {
  const res = await fetch(`/api/room/${data.roomName}/start`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return res.ok;
}

export async function swapGame(data: SwapGameRequest): Promise<boolean> {
  const res = await fetch(`/api/room/${data.roomName}/swap`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return res.ok;
}
