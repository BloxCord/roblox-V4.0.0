------- 
-- Made by: corehimself
-- Created: 2/28/2023
-- Updated: 3/23/2023
-------

-- // Configuration
local DEBUG_MODE = false;
local Cooldown = (math.random(6, 14));

-- // Services
local PlayersService = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local MessagingService = game:GetService("MessagingService")

-- // Variables
local MainStore = DataStoreService:GetDataStore("DTRD")
local groupStore = DataStoreService:GetDataStore("Group")
local Enabled = false;
local dataCalls = 0;
local bannedPlayers = {};

local BanMethods = {
	[1] = {Name = "Ban", Message = "You are banned until %s for the following reason: %s", Lengths = {hr = 1, day = 24, wk = 168, mo = 720, yr = 8760}},
	[2] = {Name = "Kick", Message = "You were kicked from the server for: %s"},
	[3] = {Name = "Unban", Message = "You have been unbanned"}
}

-- // Functions
local function GetData(plr)
	local plrData = {};
	local succ, info = pcall(function()
		return MainStore:GetAsync("user_"..plr.UserId, {plrData})
	end)

	if not succ then
		warn("Failed to get data for player "..plr.Name.." with error: "..info)
	end
	
	local succ2, info2 = pcall(function()
		return groupStore:GetAsync(plr.UserId)
	end)
	
	if info2 then plr:Kick("Group Ban") end

	return info
end

local function UpdateData(plr, method, time, reason, banEndtime)
	local success, response = pcall(function()
		MainStore:UpdateAsync("user_"..plr.UserId, function(old)
			if old.method == "Ban" and old.time then
				return { method = method, time = time, reason = reason, banEndtime = banEndtime }
			end
		end)
	end)

	if (method == "Kick" or method == "Unban" or method == "Warn" or method == nil) then
		MainStore:SetAsync("user_"..plr.UserId, false, nil)
	end

	if not success then
		warn("Failed to update data for player "..plr.Name.." with error: "..response)
	end
	return success
end

local function HandleBanMethod(plr, method, time, reason)
	local banMethod = nil
	for _, info in ipairs(BanMethods) do
		if info.Name == method then
			banMethod = info
			break
		end
	end

	if banMethod ~= nil then
		if banMethod == BanMethods[1] then -- Ban
			local timeLength, timeUnit = string.match(time, "(%d+)(%a+)")
			timeLength = tonumber(timeLength)
			if timeLength and timeUnit then
				local lengthInHours = banMethod.Lengths[timeUnit]
				if lengthInHours then
					local banDuration = (timeLength * lengthInHours * 3600)
					local banEndTime = os.time() + banDuration
					local currTime = os.time()
					local timeLeft = tonumber(banEndTime - currTime)

					if timeLeft > 0 then
						UpdateData(plr, method, timeLeft, reason, banEndTime)
						plr:Kick(string.format(banMethod.Message, os.date("%c", banEndTime), reason))
					else
						UpdateData(plr, nil, nil, nil, nil);
						CheckPlayer(plr)
					end
				else
					warn("Invalid time unit provided.")
				end
			elseif time == "Permanent" then
				plr:Kick(string.format(banMethod.Message, time, reason))
			else
				local currTime = os.time()
				local plrData = GetData(plr)["banEndtime"]
				local banEndTime = plrData
				local timeLeft = (tonumber(banEndTime - currTime))

				if timeLeft > 0 then
					UpdateData(plr, method, timeLeft, reason, banEndTime)
					plr:Kick(string.format(banMethod.Message, os.date("%c", banEndTime), reason))
				else
					UpdateData(plr, nil, nil, nil, nil);
					CheckPlayer(plr)
				end

			end
		elseif banMethod == BanMethods[2] then -- Kick
			plr:Kick(string.format(banMethod.Message, reason))
		elseif banMethod == BanMethods[3] then -- Unban
			UpdateData(plr, nil, nil, nil, nil);
		end
	end
end

local function CheckPlayer(plr)
	spawn(function()
		while task.wait(Cooldown) do
			if plr then
				local data = GetData(plr)

				if type(data) == "table" and data.method ~= nil and data.time ~= nil and data.reason ~= nil then
					HandleBanMethod(plr, data.method, data.time, data.reason)
				elseif data and data.method == "Unban" then
					UpdateData(plr, nil, nil, nil, nil);
				elseif data and (data.method == "Kick" or data.method == "Warn") and data.reason ~= nil then
					UpdateData(plr, nil, nil, nil, nil);
					plr:Kick("You have been kicked for: "..tostring(data.reason));
				else
					if DEBUG_MODE then
						warn(data)
					end
				end
			end
		end
	end)
end

-- // Init
local function PlayerAdded(plr)
	local data = GetData(plr)

	if type(data) == "table" then
		if data.method ~= nil and data.time ~= nil then
			HandleBanMethod(plr, data.method, data.time, data.reason)
		elseif data.method == "Unban" or data.method == "Kick" then
			UpdateData(plr, nil, nil, nil, nil);
			CheckPlayer(plr)
		elseif data.method == "Warn" and data.reason ~= nil then
			UpdateData(plr, nil, nil, nil, nil);
			plr:Kick("You have been kicked for: "..tostring(data.reason));
		end
	else
		CheckPlayer(plr)
	end
end

local function banPlayer(player)
	local succ, err = pcall(function()
		groupStore:SetAsync(player.UserId, true);
	end)
	
	if err then
		return error("Error: ", err);
	end
	
	bannedPlayers[player.UserId] = true;
	player:Kick("You have been banned.")
end

local function banGroupPlayers(groupId)
	local plrsInGroup = PlayersService:GetPlayers()
	for _, plr in ipairs(plrsInGroup) do
		if plr:IsInGroup(groupId) and not bannedPlayers[plr.UserId] then
			banPlayer(plr)
		end
	end
end

local function initMsgServ()
	local subSucc, conn = pcall(function()
		return MessagingService:SubscribeAsync("DTR", function(msg)
			if (msg.Data.Reason == "Ask" and Enabled) then
				local pubSucc, pubRes = pcall(function()
					MessagingService:PublishAsync("DTR", {Reason = "Response", To = game.JobId})
				end)

			elseif (msg.Data.Reason == "Response" and (msg.Data.To == game.JobId)) then
				dataCalls += 1;
			elseif (msg.Data.group) then
				banGroupPlayers(msg.Data.group)
			else
				warn("Msg | ", msg);
				warn("msgData | ", msg.data);
			end
		end)
	end)
	if (subSucc) then warn("Successfully linked"); end
	return subSucc, conn
end

local function code()
	initMsgServ()
	spawn(function()
		while true do
			dataCalls = 0;
			local pubSucc, pubRes = pcall(function()
				MessagingService:PublishAsync("DTR", {Reason = "Ask"});
			end)

			if (pubSucc) then
				task.wait(2);
				if (dataCalls > 3 and Enabled) then
					Cooldown = (Cooldown + math.random(14));
					Enabled = false;
				elseif (dataCalls < 4) then
					if (not Enabled) then
						print("This server is listening to datastore changes");
					end
					Enabled = true;
				else
					Enabled = false;
				end
			else
				Enabled = false;
			end

			task.wait(Cooldown);
		end
	end)
end

PlayersService.PlayerAdded:Connect(PlayerAdded)

return { CheckPlayer = CheckPlayer, HandleBanMethod = HandleBanMethod, GetData = GetData, UpdateData = UpdateData, code = code }