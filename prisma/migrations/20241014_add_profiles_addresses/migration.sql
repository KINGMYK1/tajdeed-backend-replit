-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SELLER';

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "zip" TEXT,
    "label" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "addresses_profileId_idx" ON "addresses"("profileId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_public"
  ON "profiles"
  FOR SELECT
  USING (true);

CREATE POLICY "profiles_manage_own"
  ON "profiles"
  FOR ALL
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

-- Addresses policies
CREATE POLICY "addresses_owner_select"
  ON "addresses"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "profiles" p
      WHERE p."id" = "addresses"."profileId" AND p."userId" = auth.uid()
    )
  );

CREATE POLICY "addresses_owner_modify"
  ON "addresses"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "profiles" p
      WHERE p."id" = "addresses"."profileId" AND p."userId" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "profiles" p
      WHERE p."id" = "addresses"."profileId" AND p."userId" = auth.uid()
    )
  );
