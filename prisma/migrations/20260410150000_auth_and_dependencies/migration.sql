ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'WAITING';

ALTER TABLE "User"
ADD COLUMN "email" TEXT,
ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

ALTER TABLE "Task"
ADD COLUMN "dependsOnTaskId" TEXT;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_dependsOnTaskId_fkey"
FOREIGN KEY ("dependsOnTaskId") REFERENCES "Task"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
