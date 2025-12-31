/*
  Warnings:

  - You are about to drop the column `item_type` on the `trades` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `trades` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `trades` table. All the data in the column will be lost.
  - You are about to drop the column `seller_id` on the `trades` table. All the data in the column will be lost.
  - You are about to drop the column `server` on the `trades` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `provider_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `email_verifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `favorites` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `user_id` to the `trades` table without a default value. This is not possible if the table is not empty.
  - Made the column `password_hash` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."favorites" DROP CONSTRAINT "favorites_trade_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."favorites" DROP CONSTRAINT "favorites_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."trades" DROP CONSTRAINT "trades_seller_id_fkey";

-- DropIndex
DROP INDEX "public"."trades_seller_id_idx";

-- AlterTable
ALTER TABLE "trades" DROP COLUMN "item_type",
DROP COLUMN "price",
DROP COLUMN "quantity",
DROP COLUMN "seller_id",
DROP COLUMN "server",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "provider",
DROP COLUMN "provider_id",
ALTER COLUMN "password_hash" SET NOT NULL;

-- DropTable
DROP TABLE "public"."email_verifications";

-- DropTable
DROP TABLE "public"."favorites";

-- DropEnum
DROP TYPE "public"."AuthProvider";

-- DropEnum
DROP TYPE "public"."ItemType";

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "trade_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comments_trade_id_idx" ON "comments"("trade_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "comments_created_at_idx" ON "comments"("created_at" DESC);

-- CreateIndex
CREATE INDEX "trades_user_id_idx" ON "trades"("user_id");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
