-- CreateTable
CREATE TABLE "ConversationMute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationMute_conversationId_idx" ON "ConversationMute"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationMute_userId_idx" ON "ConversationMute"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMute_userId_conversationId_key" ON "ConversationMute"("userId", "conversationId");

-- AddForeignKey
ALTER TABLE "ConversationMute" ADD CONSTRAINT "ConversationMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMute" ADD CONSTRAINT "ConversationMute_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SmsConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
