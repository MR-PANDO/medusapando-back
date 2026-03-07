import { z } from "zod"

export const PostAdminGenerateWompiLink = z.object({
  order_id: z.string().min(1),
})

export type PostAdminGenerateWompiLinkType = z.infer<
  typeof PostAdminGenerateWompiLink
>
