local DTR = require(script.Parent["DTR v4.0.0"])

local SCRIPT_EXEC = false; -- default to false for performance, use if you need it

function onPlayerAdded(plr)
	DTR.CheckPlayer(plr)
	if (SCRIPT_EXEC) then
		DTR.code() -- [ BETA ]
	end
end

game.Players.PlayerAdded:Connect(onPlayerAdded)