/*
  Warnings:

  - Added the required column `purpose` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "purpose" VARCHAR(140) NOT NULL;
