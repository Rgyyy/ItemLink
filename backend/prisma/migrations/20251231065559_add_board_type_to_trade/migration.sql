-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('TRADE', 'FREE', 'SUGGESTION');

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "board_type" "BoardType" NOT NULL DEFAULT 'TRADE',
ALTER COLUMN "game_category" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "trades_board_type_idx" ON "trades"("board_type");
