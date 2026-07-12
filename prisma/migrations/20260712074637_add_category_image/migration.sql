-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "file_manager_id" INTEGER,
ADD COLUMN     "image_url" TEXT;

-- CreateIndex
CREATE INDEX "Category_file_manager_id_idx" ON "Category"("file_manager_id");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_file_manager_id_fkey" FOREIGN KEY ("file_manager_id") REFERENCES "file_manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
