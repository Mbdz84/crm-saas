-- CreateTable
CREATE TABLE "SmsConversation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientNumber" TEXT NOT NULL,
    "crmNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "box" TEXT NOT NULL DEFAULT 'inbox',
    "unread" INTEGER NOT NULL DEFAULT 0,
    "lastMessageText" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT,
    "mediaUrls" TEXT[],
    "twilioSid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsConversation_companyId_box_lastMessageAt_idx" ON "SmsConversation"("companyId", "box", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsConversation_companyId_clientNumber_crmNumber_key" ON "SmsConversation"("companyId", "clientNumber", "crmNumber");

-- CreateIndex
CREATE INDEX "SmsMessage_conversationId_createdAt_idx" ON "SmsMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "SmsConversation" ADD CONSTRAINT "SmsConversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SmsConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
