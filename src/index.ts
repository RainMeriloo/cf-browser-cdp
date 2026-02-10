import { env } from 'cloudflare:workers'
import { proxyCdp } from './cdp'

function verifyToken(request: Request, url: URL): boolean {
  const token = env.BROWSER_TOKEN
  if (!token) return false

  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ') && auth.slice(7) === token) {
    return true
  }

  return url.searchParams.get('token') === token
}

async function handleFetch(request: Request) {
  const url = new URL(request.url)
  if (!verifyToken(request, url)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const host = request.headers.get('Host') || url.host
  return proxyCdp(env.BROWSER, request, `${url.protocol}//${host}`)
}

export default {
  fetch: handleFetch,
} satisfies ExportedHandler<Cloudflare.Env>
