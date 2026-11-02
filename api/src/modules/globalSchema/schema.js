import { z } from '@hono/zod-openapi';

export const EpisodesSchema = z.object({
  sub: z.number().nullable(),
  dub: z.number().nullable(),
  eps: z.number().nullable(),
}).nullable();

export const BasicAnimeSchema = z.object({
  name: z.string(),
  alternativeTitle: z.string().nullable(),
  id: z.string(),
  poster: z.string().nullable(),
});

export const AnimeWithEpisodesSchema = z.object({
  ...BasicAnimeSchema.shape,
  episodes: z.object({ ...EpisodesSchema.shape }),
});

export const pageInfoSchema = z.object({
  currentPage: z.number().default(1),
  hasNextPage: z.boolean().default(false),
  totalPages: z.number().default(1),
});

export const explorePageSchema = z.object({
  success: z.boolean(),
  data: z.object({
    results: z.array(
      BasicAnimeSchema.extend({
        aired: z.string().nullable(),
        type: z.string().nullable(),
        duration: z.string().nullable(),
        episodes: z.object({
          sub: z.number().nullable(),
          dub: z.number().nullable()
        }).nullable()
      }).nullable()
    ),
    currentPage: z.number(),
    hasNextPage: z.boolean(),
    totalPages: z.number(),
  }),
});

export const pageParamsSchema = z.coerce.number().default(1).openapi({ example: 1 });
