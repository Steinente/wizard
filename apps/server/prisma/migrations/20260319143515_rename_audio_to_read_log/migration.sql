-- Rename audioEnabledByDefault to readLogEnabledByDefault on Lobby
ALTER TABLE "Lobby" RENAME COLUMN "audioEnabledByDefault" TO "readLogEnabledByDefault";

-- Rename audioEnabled to readLogEnabled on Player
ALTER TABLE "Player" RENAME COLUMN "audioEnabled" TO "readLogEnabled";
