-- CreateEnum
CREATE TYPE "AvatarBodyType" AS ENUM ('MASCULINE', 'NEUTRAL', 'FEMININE');

-- CreateEnum
CREATE TYPE "AvatarSkinTone" AS ENUM ('LIGHT', 'MEDIUM', 'DARK');

-- CreateEnum
CREATE TYPE "AvatarAccessory" AS ENUM ('NONE', 'EARRINGS', 'SUNGLASSES', 'PARROT');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "avatar_body_type" "AvatarBodyType",
ADD COLUMN "avatar_skin_tone" "AvatarSkinTone",
ADD COLUMN "avatar_hairstyle" INTEGER,
ADD COLUMN "avatar_accessory" "AvatarAccessory";
