-- CreateEnum
CREATE TYPE "LoginOutcome" AS ENUM ('SUCCESS', 'INVALID_CREDENTIALS', 'INACTIVE_ACCOUNT');

-- CreateTable
CREATE TABLE "st_login_events" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "username" VARCHAR(50) NOT NULL,
    "outcome" "LoginOutcome" NOT NULL,
    "ipAddress" VARCHAR(60),
    "userAgent" VARCHAR(400),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "st_login_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "st_login_events_date_idx" ON "st_login_events"("date");

-- CreateIndex
CREATE INDEX "st_login_events_userId_idx" ON "st_login_events"("userId");

-- CreateIndex
CREATE INDEX "st_login_events_outcome_date_idx" ON "st_login_events"("outcome", "date");

-- AddForeignKey
ALTER TABLE "st_login_events" ADD CONSTRAINT "st_login_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "st_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

