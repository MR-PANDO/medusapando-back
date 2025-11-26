import { z } from "zod"

export const PostAdminCreateBrand = z.object({
  name: z.string().min(1),
})

export const PostAdminUpdateBrand = z.object({
  name: z.string().min(1).optional(),
})

export type PostAdminCreateBrandType = z.infer<typeof PostAdminCreateBrand>
export type PostAdminUpdateBrandType = z.infer<typeof PostAdminUpdateBrand>
