-- CreateEnum
CREATE TYPE "KYCLevel" AS ENUM ('NONE', 'BASIC', 'VERIFIED', 'ACCREDITED');

-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL', 'RENT_DISTRIBUTION', 'BORROW', 'REPAY', 'INTEREST', 'FEE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'FUNDING', 'FUNDED', 'ACTIVE', 'SOLD', 'DELISTED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'MIXED_USE', 'LAND');

-- CreateEnum
CREATE TYPE "BorrowStatus" AS ENUM ('ACTIVE', 'REPAID', 'LIQUIDATED', 'DEFAULTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kycStatus" "KYCLevel" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KYCVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "level" "KYCLevel" NOT NULL DEFAULT 'NONE',
    "documentType" TEXT,
    "documentNumber" TEXT,
    "documentCountry" TEXT,
    "verificationDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "providerRef" TEXT,
    "providerData" JSONB,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KYCVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "zipCode" TEXT,
    "propertyType" "PropertyType" NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "totalValue" DECIMAL(18,2) NOT NULL,
    "tokenPrice" DECIMAL(18,6) NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "availableTokens" INTEGER NOT NULL,
    "annualYield" DECIMAL(5,2) NOT NULL,
    "monthlyRent" DECIMAL(18,2),
    "imageUrl" TEXT,
    "images" TEXT[],
    "documents" TEXT[],
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "squareFeet" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(3,1),
    "yearBuilt" INTEGER,
    "fundingDeadline" TIMESTAMP(3),
    "fundingStartDate" TIMESTAMP(3),
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contractAddress" TEXT,
    "tokenId" TEXT,
    "chainId" INTEGER NOT NULL DEFAULT 137,
    "standard" TEXT NOT NULL DEFAULT 'ERC1155',
    "totalSupply" INTEGER NOT NULL,
    "circulatingSupply" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "deployedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "averageCost" DECIMAL(18,6) NOT NULL,
    "totalInvested" DECIMAL(18,2) NOT NULL,
    "rentEarned" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lastRentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT,
    "custodianRef" TEXT,
    "usdcBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "lockedBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "totalDeposited" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vaultAccountId" TEXT NOT NULL,
    "principal" DECIMAL(18,2) NOT NULL,
    "interestRate" DECIMAL(5,4) NOT NULL,
    "accruedInterest" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "collateralValue" DECIMAL(18,2) NOT NULL,
    "collateralRatio" DECIMAL(5,4) NOT NULL,
    "liquidationThreshold" DECIMAL(5,4) NOT NULL DEFAULT 0.75,
    "status" "BorrowStatus" NOT NULL DEFAULT 'ACTIVE',
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "repaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "propertyId" TEXT,
    "tokenQuantity" INTEGER,
    "tokenPrice" DECIMAL(18,6),
    "fee" DECIMAL(18,6),
    "txHash" TEXT,
    "blockNumber" INTEGER,
    "chainId" INTEGER,
    "reference" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentPayment" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "managementFee" DECIMAL(18,2) NOT NULL,
    "perTokenAmount" DECIMAL(18,6) NOT NULL,
    "distributedAt" TIMESTAMP(3),
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KYCVerification_userId_key" ON "KYCVerification"("userId");

-- CreateIndex
CREATE INDEX "KYCVerification_userId_idx" ON "KYCVerification"("userId");

-- CreateIndex
CREATE INDEX "KYCVerification_status_idx" ON "KYCVerification"("status");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

-- CreateIndex
CREATE INDEX "Property_city_state_idx" ON "Property"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Token_propertyId_key" ON "Token"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Token_contractAddress_key" ON "Token"("contractAddress");

-- CreateIndex
CREATE INDEX "Token_contractAddress_idx" ON "Token"("contractAddress");

-- CreateIndex
CREATE INDEX "Token_chainId_idx" ON "Token"("chainId");

-- CreateIndex
CREATE INDEX "Holding_userId_idx" ON "Holding"("userId");

-- CreateIndex
CREATE INDEX "Holding_propertyId_idx" ON "Holding"("propertyId");

-- CreateIndex
CREATE INDEX "Holding_tokenId_idx" ON "Holding"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_userId_propertyId_key" ON "Holding"("userId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultAccount_userId_key" ON "VaultAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultAccount_walletAddress_key" ON "VaultAccount"("walletAddress");

-- CreateIndex
CREATE INDEX "VaultAccount_walletAddress_idx" ON "VaultAccount"("walletAddress");

-- CreateIndex
CREATE INDEX "BorrowPosition_userId_idx" ON "BorrowPosition"("userId");

-- CreateIndex
CREATE INDEX "BorrowPosition_vaultAccountId_idx" ON "BorrowPosition"("vaultAccountId");

-- CreateIndex
CREATE INDEX "BorrowPosition_status_idx" ON "BorrowPosition"("status");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_propertyId_idx" ON "Transaction"("propertyId");

-- CreateIndex
CREATE INDEX "Transaction_txHash_idx" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "RentPayment_propertyId_idx" ON "RentPayment"("propertyId");

-- CreateIndex
CREATE INDEX "RentPayment_periodStart_periodEnd_idx" ON "RentPayment"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "RentPayment_status_idx" ON "RentPayment"("status");

-- AddForeignKey
ALTER TABLE "KYCVerification" ADD CONSTRAINT "KYCVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAccount" ADD CONSTRAINT "VaultAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowPosition" ADD CONSTRAINT "BorrowPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowPosition" ADD CONSTRAINT "BorrowPosition_vaultAccountId_fkey" FOREIGN KEY ("vaultAccountId") REFERENCES "VaultAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
