-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('PRICE_DRIFT', 'SHARP_MONEY', 'RESOLUTION_BIAS', 'LATE_FADE');

-- CreateEnum
CREATE TYPE "SignalDirection" AS ENUM ('BUY_YES', 'BUY_NO');

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "category" TEXT,
    "endDate" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedYes" BOOLEAN,
    "lastTradePrice" DOUBLE PRECISION,
    "bestBid" DOUBLE PRECISION,
    "bestAsk" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "volume24h" DOUBLE PRECISION,
    "liquidity" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isTracked" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPriceSnapshot" (
    "id" SERIAL NOT NULL,
    "marketId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "spread" DOUBLE PRECISION,
    "volume24h" DOUBLE PRECISION,
    "volumeCumulative" DOUBLE PRECISION,
    "liquidity" DOUBLE PRECISION,
    "liquidityDelta" DOUBLE PRECISION,
    "numTrades" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" SERIAL NOT NULL,
    "marketId" TEXT NOT NULL,
    "signalType" "SignalType" NOT NULL,
    "direction" "SignalDirection" NOT NULL,
    "confidence" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "wasCorrect" BOOLEAN,
    "priceAtDetection" DOUBLE PRECISION,
    "priceAtExpiry" DOUBLE PRECISION,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryBias" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "totalResolved" INTEGER NOT NULL DEFAULT 0,
    "resolvedYesCount" INTEGER NOT NULL DEFAULT 0,
    "resolvedYesPct" DOUBLE PRECISION,
    "avgFinalPriceYes" DOUBLE PRECISION,
    "yesEdge" DOUBLE PRECISION,
    "lateFadeCount" INTEGER NOT NULL DEFAULT 0,
    "lateFadeSampleSize" INTEGER NOT NULL DEFAULT 0,
    "lateFadePct" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryBias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalBacktestResult" (
    "id" SERIAL NOT NULL,
    "signalType" "SignalType" NOT NULL,
    "minConfidence" INTEGER NOT NULL,
    "category" TEXT,
    "totalSignals" INTEGER NOT NULL DEFAULT 0,
    "correctSignals" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalBacktestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" SERIAL NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER,
    "details" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_slug_key" ON "Market"("slug");

-- CreateIndex
CREATE INDEX "Market_category_idx" ON "Market"("category");

-- CreateIndex
CREATE INDEX "Market_active_resolved_idx" ON "Market"("active", "resolved");

-- CreateIndex
CREATE INDEX "Market_isTracked_active_idx" ON "Market"("isTracked", "active");

-- CreateIndex
CREATE INDEX "Market_endDate_idx" ON "Market"("endDate");

-- CreateIndex
CREATE INDEX "MarketPriceSnapshot_marketId_timestamp_idx" ON "MarketPriceSnapshot"("marketId", "timestamp");

-- CreateIndex
CREATE INDEX "MarketPriceSnapshot_timestamp_idx" ON "MarketPriceSnapshot"("timestamp");

-- CreateIndex
CREATE INDEX "Signal_active_confidence_idx" ON "Signal"("active", "confidence");

-- CreateIndex
CREATE INDEX "Signal_signalType_idx" ON "Signal"("signalType");

-- CreateIndex
CREATE UNIQUE INDEX "Signal_marketId_signalType_key" ON "Signal"("marketId", "signalType");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryBias_category_key" ON "CategoryBias"("category");

-- CreateIndex
CREATE INDEX "SignalBacktestResult_signalType_idx" ON "SignalBacktestResult"("signalType");

-- CreateIndex
CREATE UNIQUE INDEX "SignalBacktestResult_signalType_minConfidence_category_key" ON "SignalBacktestResult"("signalType", "minConfidence", "category");

-- CreateIndex
CREATE INDEX "SyncLog_jobName_createdAt_idx" ON "SyncLog"("jobName", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketPriceSnapshot" ADD CONSTRAINT "MarketPriceSnapshot_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
