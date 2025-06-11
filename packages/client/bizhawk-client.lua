local port = comm.httpGetGetUrl()
local url = "http://127.0.0.1:" .. port .. "/bizhawk"
local frameCount = 0
local gameCompleted = false
local gameLoaded = false

event.onframeend( function()
  frameCount = frameCount + 1
end )

function request()
    local res = comm.httpGet(url)
    if (res == '') then
        return false
    end

    local action = string.sub(res, 1, 4)
    print("Action: " .. action .. " at frame " .. frameCount)

    local path = string.sub(res, 6)
    if(path ~= '') then
        print("Path: " .. path)
    end

    comm.httpPost(url .. "/ack", "")
    if (action == 'PAUS') then
        client.SetSoundOn(false)
    elseif (action == 'SAVE') then
        savestate.save(path)
    elseif (action == 'GAME') then
        client.openrom(path)
        gameLoaded = true
        gameCompleted = false
        frameCount = 0
    elseif (action == 'LOAD') then
        savestate.load(path)
    elseif (action == 'CONT') then
        client.SetSoundOn(true)
    elseif (action == 'QUIT') then
        client.exit()
    elseif (action == 'PING') then
        comm.httpPost(url .. '/pong', "")
    end
    emu.frameadvance()
    request()
end

while true do
  if (math.fmod(frameCount, 6) == 0) then
    request()
  end

  if (frameCount > 120 and gameLoaded == true and gameCompleted == false) then
    if (input.get()["Space"]) then
      print("INPUT: Game completed at frame " .. frameCount)
      comm.httpPost(url .. "/complete", "")
      gameCompleted = true
    elseif (input.get()["R"]) then
      print("INPUT: Game reset at frame " .. frameCount)
      client.reboot_core()
      frameCount = 0
    end
  end


  emu.frameadvance()
end
