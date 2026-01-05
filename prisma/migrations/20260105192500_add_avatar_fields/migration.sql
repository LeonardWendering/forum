-- CreateEnum
CREATE TYPE "AvatarBodyType" AS ENUM ('MALE', 'NEUTRAL', 'FEMALE');

-- CreateEnum
CREATE TYPE "AvatarSkinColor" AS ENUM ('LIGHT', 'MEDIUM', 'DARK');

-- CreateEnum
CREATE TYPE "AvatarHairstyle" AS ENUM ('MALE_SHORT', 'MALE_SPIKY', 'NEUTRAL_BOB', 'NEUTRAL_CURLY', 'FEMALE_LONG', 'FEMALE_PONYTAIL');

-- CreateEnum
CREATE TYPE "AvatarAccessory" AS ENUM ('NONE', 'EARRING', 'SUNGLASSES', 'PARROT');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "avatar_body_type" "AvatarBodyType",
ADD COLUMN "avatar_skin_color" "AvatarSkinColor",
ADD COLUMN "avatar_hairstyle" "AvatarHairstyle",
ADD COLUMN "avatar_accessory" "AvatarAccessory";
