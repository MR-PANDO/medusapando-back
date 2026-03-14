import { z } from "zod"

export const PostStoreWishlistItem = z.object({
  variant_id: z.string(),
})
