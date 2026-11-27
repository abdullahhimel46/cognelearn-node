/*
  Warnings:

  - The primary key for the `videos` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "videos" DROP CONSTRAINT "videos_pkey",
ADD COLUMN     "is_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "watched_seconds" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id", "playlist_id");
