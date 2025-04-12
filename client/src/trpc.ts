import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
// @ts-ignore
import type { AppRouter } from '@server/shared/trpc'
import { apiBase } from '@/config'
import SuperJSON from 'superjson'

export const trpc = createTRPCProxyClient<AppRouter>({
  transformer: SuperJSON,
  links: [
    httpBatchLink({
      url: apiBase,
    }),
  ],
})
