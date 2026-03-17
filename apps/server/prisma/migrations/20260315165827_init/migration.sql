-- CreateEnum
CREATE TYPE "LobbyStatus" AS ENUM ('WAITING', 'RUNNING', 'FINISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PredictionVisibility" AS ENUM ('OPEN', 'HIDDEN', 'SECRET');

-- CreateEnum
CREATE TYPE "OpenPredictionRestriction" AS ENUM ('NONE', 'MUST_EQUAL_TRICKS', 'MUST_NOT_EQUAL_TRICKS');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('HOST', 'PLAYER');

-- CreateTable
CREATE TABLE "Lobby" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "LobbyStatus" NOT NULL DEFAULT 'WAITING',
    "hostPlayerId" TEXT,
    "predictionVisibility" "PredictionVisibility" NOT NULL DEFAULT 'OPEN',
    "openPredictionRestriction" "OpenPredictionRestriction" NOT NULL DEFAULT 'NONE',
    "audioEnabledByDefault" BOOLEAN NOT NULL DEFAULT false,
    "languageDefault" TEXT NOT NULL DEFAULT 'en',
    "allowIncludedSpecialCards" BOOLEAN NOT NULL DEFAULT true,
    "hostDisconnectedAt" TIMESTAMP(3),
    "hostDisconnectDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PlayerRole" NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameState" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL DEFAULT 0,
    "dealerIndex" INTEGER NOT NULL DEFAULT 0,
    "currentPlayerId" TEXT,
    "phase" TEXT NOT NULL DEFAULT 'waiting',
    "stateJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lobby_code_key" ON "Lobby"("code");

-- CreateIndex
CREATE INDEX "Lobby_code_idx" ON "Lobby"("code");

-- CreateIndex
CREATE INDEX "Player_lobbyId_idx" ON "Player"("lobbyId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_lobbyId_name_key" ON "Player"("lobbyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_lobbyId_sessionToken_key" ON "Player"("lobbyId", "sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "GameState_lobbyId_key" ON "GameState"("lobbyId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
