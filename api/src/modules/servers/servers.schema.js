import { createRoute, z } from '@hono/zod-openapi';
import someAnimes from '#utils/someAnimes';

const schema = z.object({
  sub: z.array(
    z.object({
      name: z.string(),
      serverName: z.string(),
      serverId: z.number(),
    })
  ),
  dub: z.array(z.any()),
  raw: z.array(z.any()),
});

const serversSchema = createRoute({
  method: 'get',
  path: '/servers',
  request: {
    query: z.object({
      id: z.string().openapi({ examples: someAnimes.episodesIds }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: schema,
        },
      },
    },
  },
  description: 'Retrieve The Servers Of An Episode',
});

export default serversSchema;
