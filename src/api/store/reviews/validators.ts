import { z } from "zod"

export const PostStoreCreateReview = z.object({
  product_id: z.string().min(1, "product_id is required"),
  rating: z
    .number()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  content: z
    .string()
    .min(1, "Review content is required")
    .max(2000, "Review content must be 2000 characters or less"),
  title: z
    .string()
    .max(200, "Title must be 200 characters or less")
    .optional(),
})
