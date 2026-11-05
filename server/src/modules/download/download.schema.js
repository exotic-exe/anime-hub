import { createRoute, z } from '@hono/zod-openapi';

const downloadQuerySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  episode: z.string().optional().default('1'),
});

const downloadResponseSchema = z.object({
  title: z.string(),
  episode: z.number(),
  torrents: z.array(
    z.object({
      title: z.string(),
      torrentUrl: z.string(),
      magnet: z.string(),
      size: z.string(),
      seeders: z.number(),
    })
  ),
  subsplease: z
    .object({
      releaseTitle: z.string(),
      episode: z.string(),
      downloads: z.array(
        z.object({
          resolution: z.string(),
          magnet: z.string(),
        })
      ),
    })
    .nullable(),
  direct: z.object({
    kayoanime: z.string(),
    animepahe: z.string(),
    nyaa: z.string(),
  }),
});

const downloadSchema = createRoute({
  method: 'get',
  path: '/download',
  request: {
    query: downloadQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: downloadResponseSchema,
          }),
        },
      },
      description: 'Retrieve real episode download links (torrents, magnets, cloud mirrors)',
    },
  },
  description: 'Fetch real episode download links for a given anime and episode number',
});

export default downloadSchema;
