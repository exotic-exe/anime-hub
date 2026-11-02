import { createRoute, z } from '@hono/zod-openapi';
import { AnimeWithEpisodesSchema } from '#modules/globalSchema/schema';


const schema = z.object({
  status: z.boolean(),
  data: z.array(
    AnimeWithEpisodesSchema.extend({
      rank: z.number(),
      type: z.string(),
      quality: z.string(),
      duration: z.string(),
      aired: z.string(),
      synopsis: z.string(),
    })
  ),
});

const spotlightSchema = createRoute({
  method: 'get',
  path: '/spotlight',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: schema,
        },
      },
    },
  },
});

export default spotlightSchema;
