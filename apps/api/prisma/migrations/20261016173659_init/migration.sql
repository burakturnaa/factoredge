-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'viewer');

-- CreateEnum
CREATE TYPE "DeviceProtocol" AS ENUM ('modbus', 'mqtt');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('connected', 'disconnected', 'error');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('production_count', 'motor_temp', 'motor_current', 'line_status', 'scrap_count');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "protocol" "DeviceProtocol" NOT NULL,
    "config" JSONB NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'disconnected',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_readings" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "signalType" "SignalType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signal_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "signal_readings_deviceId_signalType_timestamp_idx" ON "signal_readings"("deviceId", "signalType", "timestamp");

-- AddForeignKey
ALTER TABLE "signal_readings" ADD CONSTRAINT "signal_readings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
