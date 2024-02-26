local url = "http://127.0.0.1:47911/bizhawk"
local frameCount = 0

function request()
    local res = comm.httpGet(url)
    if (res == '') then
        return false
    end

    local action = string.sub(res, 1, 4)
    print("Action: " .. action)

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
        frameCount = 0
        request()
    end

    emu.frameadvance()
    frameCount = frameCount + 1
end
