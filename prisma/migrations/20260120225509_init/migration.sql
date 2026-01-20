-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'visitor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "museums" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "museums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artworks" (
    "museumId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "year" INTEGER,
    "medium" TEXT,
    "dimensions" TEXT,
    "description" TEXT,
    "provenance" TEXT,
    "imageUrl" TEXT,
    "gallery" TEXT,
    "accessionNumber" TEXT,
    "period" TEXT,
    "tags" TEXT,
    "qrCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artworks_pkey" PRIMARY KEY ("museumId","id")
);

-- CreateTable
CREATE TABLE "curator_notes" (
    "id" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "museumId" TEXT NOT NULL,
    "curatorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'interpretation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curator_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artwork_embeddings" (
    "id" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "museumId" TEXT NOT NULL,
    "chunkType" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "sourceId" TEXT,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artwork_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "artworkId" TEXT NOT NULL,
    "museumId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "museumId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "artworks_qrCode_key" ON "artworks"("qrCode");

-- CreateIndex
CREATE INDEX "artworks_museumId_idx" ON "artworks"("museumId");

-- CreateIndex
CREATE INDEX "artworks_artist_idx" ON "artworks"("artist");

-- CreateIndex
CREATE INDEX "artworks_isActive_idx" ON "artworks"("isActive");

-- CreateIndex
CREATE INDEX "curator_notes_museumId_artworkId_idx" ON "curator_notes"("museumId", "artworkId");

-- CreateIndex
CREATE INDEX "curator_notes_curatorId_idx" ON "curator_notes"("curatorId");

-- CreateIndex
CREATE INDEX "artwork_embeddings_museumId_artworkId_idx" ON "artwork_embeddings"("museumId", "artworkId");

-- CreateIndex
CREATE INDEX "artwork_embeddings_chunkType_idx" ON "artwork_embeddings"("chunkType");

-- CreateIndex
CREATE INDEX "artwork_embeddings_sourceId_idx" ON "artwork_embeddings"("sourceId");

-- CreateIndex
CREATE INDEX "chat_sessions_museumId_artworkId_idx" ON "chat_sessions"("museumId", "artworkId");

-- CreateIndex
CREATE INDEX "messages_sessionId_idx" ON "messages"("sessionId");

-- CreateIndex
CREATE INDEX "messages_museumId_artworkId_idx" ON "messages"("museumId", "artworkId");

-- AddForeignKey
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_museumId_fkey" FOREIGN KEY ("museumId") REFERENCES "museums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curator_notes" ADD CONSTRAINT "curator_notes_museumId_fkey" FOREIGN KEY ("museumId") REFERENCES "museums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curator_notes" ADD CONSTRAINT "curator_notes_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artwork_embeddings" ADD CONSTRAINT "artwork_embeddings_museumId_fkey" FOREIGN KEY ("museumId") REFERENCES "museums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_museumId_fkey" FOREIGN KEY ("museumId") REFERENCES "museums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_museumId_fkey" FOREIGN KEY ("museumId") REFERENCES "museums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
