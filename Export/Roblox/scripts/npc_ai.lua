--[[
    PacAI v5 Generated NPC AI Controller
    Handles behavior trees, patrol systems, and combat logic
]]

local NPCAIController = {}
NPCAIController.__index = NPCAIController

-- Behavior states
local BehaviorState = {
    IDLE = "idle",
    PATROL = "patrol",
    ALERT = "alert",
    COMBAT = "combat",
    FLEE = "flee",
    SEARCH = "search"
}

-- Create new NPC AI instance
function NPCAIController.new(npcModel, config)
    local self = setmetatable({}, NPCAIController)
    
    self.model = npcModel
    self.humanoid = npcModel:FindFirstChild("Humanoid")
    self.rootPart = npcModel:FindFirstChild("HumanoidRootPart")
    
    self.state = BehaviorState.IDLE
    self.awareness = config.awareness or 0.5
    self.aggression = config.aggression or 0.5
    self.patrolPoints = config.patrolPoints or {}
    self.currentPatrolIndex = 1
    self.target = nil
    self.lastKnownPosition = nil
    
    self.detectionRadius = 50
    self.attackRadius = 10
    self.fleeHealthThreshold = 0.2
    
    return self
end

-- Set behavior state
function NPCAIController:setBehavior(behavior, params)
    params = params or {}
    
    if behavior == "patrol" then
        self.state = BehaviorState.PATROL
        if params.points then
            self.patrolPoints = params.points
        end
    elseif behavior == "alert" then
        self.state = BehaviorState.ALERT
        self:triggerAlert(params.level or 1)
    elseif behavior == "combat" then
        self.state = BehaviorState.COMBAT
        if params.target then
            self.target = params.target
        end
    elseif behavior == "flee" then
        self.state = BehaviorState.FLEE
    elseif behavior == "idle" then
        self.state = BehaviorState.IDLE
    end
    
    self:onBehaviorChanged(behavior)
end

-- Get next patrol point
function NPCAIController:getNextPatrolPoint()
    if #self.patrolPoints == 0 then
        return nil
    end
    
    local point = self.patrolPoints[self.currentPatrolIndex]
    self.currentPatrolIndex = (self.currentPatrolIndex % #self.patrolPoints) + 1
    return point
end

-- Move to position
function NPCAIController:moveTo(position)
    if not self.humanoid then return end
    self.humanoid:MoveTo(position)
end

-- Detect threats in range
function NPCAIController:detectThreats()
    local threats = {}
    local position = self.rootPart.Position
    
    for _, player in ipairs(game.Players:GetPlayers()) do
        local character = player.Character
        if character and character:FindFirstChild("HumanoidRootPart") then
            local distance = (character.HumanoidRootPart.Position - position).Magnitude
            if distance <= self.detectionRadius * self.awareness then
                table.insert(threats, {
                    target = character,
                    distance = distance,
                    threatLevel = 1 - (distance / self.detectionRadius)
                })
            end
        end
    end
    
    return threats
end

-- Calculate threat response
function NPCAIController:calculateThreatResponse(threatLevel)
    local responseThreshold = self.aggression * self.awareness
    
    if threatLevel > responseThreshold * 1.5 then
        if self.aggression < 0.3 then
            return BehaviorState.FLEE
        else
            return BehaviorState.COMBAT
        end
    elseif threatLevel > responseThreshold then
        return BehaviorState.ALERT
    else
        return self.state
    end
end

-- Trigger alert
function NPCAIController:triggerAlert(level)
    print(string.format("[PacAI] NPC %s triggered alert level %d", self.model.Name, level))
end

-- Behavior changed callback
function NPCAIController:onBehaviorChanged(behavior)
    print(string.format("[PacAI] NPC %s behavior changed to: %s", self.model.Name, behavior))
end

-- Apply override from PacAI system
function NPCAIController:applyOverride(overrideType, value)
    if overrideType == "awareness" then
        self.awareness = math.clamp(value, 0, 1)
    elseif overrideType == "aggression" then
        self.aggression = math.clamp(value, 0, 1)
    elseif overrideType == "freeze" then
        self.state = BehaviorState.IDLE
    elseif overrideType == "alert_all" then
        self.state = BehaviorState.ALERT
    end
end

-- Main update loop
function NPCAIController:update(dt)
    if self.state == BehaviorState.PATROL then
        local point = self:getNextPatrolPoint()
        if point then
            self:moveTo(point)
        end
    elseif self.state == BehaviorState.ALERT then
        local threats = self:detectThreats()
        if #threats > 0 then
            local highestThreat = threats[1]
            local response = self:calculateThreatResponse(highestThreat.threatLevel)
            if response ~= self.state then
                self:setBehavior(response, { target = highestThreat.target })
            end
        end
    elseif self.state == BehaviorState.COMBAT then
        if self.target then
            local targetRoot = self.target:FindFirstChild("HumanoidRootPart")
            if targetRoot then
                local distance = (targetRoot.Position - self.rootPart.Position).Magnitude
                if distance <= self.attackRadius then
                    -- Attack logic here
                else
                    self:moveTo(targetRoot.Position)
                end
            end
        end
    end
end

return NPCAIController
