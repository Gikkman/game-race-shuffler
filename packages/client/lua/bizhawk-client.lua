local url = "http://127.0.0.1:47911/bizhawk"
local frameCount = 0

function request()
    res = comm.httpGet(url)
    if (res ~= '') then
        action = string.sub(res, 1, 4)
        print("Action: " .. action)

        path = string.sub(res, 6)
        if(path ~= '') then
            print("Path: " .. path)
        end

        comm.httpPost(url, "")
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
    end
end

while true do
    if (math.fmod(frameCount, 6) == 0) then
        request()
    end

    emu.frameadvance()
    frameCount = frameCount + 1
end
