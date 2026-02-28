import { z } from "zod"

const VALID_ENTITY_TYPES = ["product", "category"] as const

export const PostAdminCreateTranslation = z.object({
  entity_type: z.enum(VALID_ENTITY_TYPES),
  entity_id: z.string().min(1),
  locale: z.string().min(2).max(10),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

export const PostAdminBatchTranslations = z.object({
  translations: z.array(
    z.object({
      entity_type: z.enum(VALID_ENTITY_TYPES),
      entity_id: z.string().min(1),
      locale: z.string().min(2).max(10),
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    })
  ).min(1).max(500),
})

export type PostAdminCreateTranslationType = z.infer<typeof PostAdminCreateTranslation>
export type PostAdminBatchTranslationsType = z.infer<typeof PostAdminBatchTranslations>
