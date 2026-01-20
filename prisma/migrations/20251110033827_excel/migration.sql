-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_artworks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "museumId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "year" INTEGER,
    "medium" TEXT,
    "dimensions" TEXT,
    "description" TEXT,
    "location" TEXT,
    "provenance" TEXT,
    "image_url" TEXT,
    "gallery" TEXT,
    "accession_number" TEXT,
    "period" TEXT,
    "qrCode" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "artworks_museumId_fkey" FOREIGN KEY ("museumId") REFERENCES "museums" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_artworks" ("accession_number", "artist", "createdAt", "description", "dimensions", "gallery", "id", "image_url", "location", "medium", "museumId", "period", "provenance", "qrCode", "title", "updatedAt", "year") SELECT "accession_number", "artist", "createdAt", "description", "dimensions", "gallery", "id", "image_url", "location", "medium", "museumId", "period", "provenance", "qrCode", "title", "updatedAt", "year" FROM "artworks";
DROP TABLE "artworks";
ALTER TABLE "new_artworks" RENAME TO "artworks";
CREATE UNIQUE INDEX "artworks_qrCode_key" ON "artworks"("qrCode");
CREATE INDEX "artworks_museumId_idx" ON "artworks"("museumId");
CREATE TABLE "new_chat_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "artworkId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_sessions_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "artworks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_chat_sessions" ("artworkId", "createdAt", "id", "title", "updatedAt", "userId") SELECT "artworkId", "createdAt", "id", "title", "updatedAt", "userId" FROM "chat_sessions";
DROP TABLE "chat_sessions";
ALTER TABLE "new_chat_sessions" RENAME TO "chat_sessions";
CREATE TABLE "new_curator_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artworkId" TEXT NOT NULL,
    "museumId" TEXT NOT NULL,
    "curatorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'interpretation',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "curator_notes_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "artworks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "curator_notes_museumId_fkey" FOREIGN KEY ("museumId") REFERENCES "museums" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "curator_notes_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_curator_notes" ("artworkId", "content", "createdAt", "curatorId", "id", "museumId", "type", "updatedAt") SELECT "artworkId", "content", "createdAt", "curatorId", "id", "museumId", "type", "updatedAt" FROM "curator_notes";
DROP TABLE "curator_notes";
ALTER TABLE "new_curator_notes" RENAME TO "curator_notes";
CREATE INDEX "curator_notes_artworkId_idx" ON "curator_notes"("artworkId");
CREATE INDEX "curator_notes_museumId_idx" ON "curator_notes"("museumId");
CREATE TABLE "new_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "artworks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_messages" ("artworkId", "content", "createdAt", "id", "metadata", "role", "sessionId") SELECT "artworkId", "content", "createdAt", "id", "metadata", "role", "sessionId" FROM "messages";
DROP TABLE "messages";
ALTER TABLE "new_messages" RENAME TO "messages";
CREATE TABLE "new_museums" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_museums" ("createdAt", "description", "id", "location", "name", "updatedAt") SELECT "createdAt", "description", "id", "location", "name", "updatedAt" FROM "museums";
DROP TABLE "museums";
ALTER TABLE "new_museums" RENAME TO "museums";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
