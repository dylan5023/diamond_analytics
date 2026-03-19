import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rxwxdmcwqwtfmdauxrim.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// 디버깅: env 로드 확인 (브라우저 콘솔에서 확인)
if (typeof window !== 'undefined') {
  const keyLoaded = !!supabaseAnonKey
  const keyPreview = supabaseAnonKey ? `${supabaseAnonKey.slice(0, 20)}...` : '(empty)'
  console.log('[Supabase] URL:', supabaseUrl)
  console.log('[Supabase] Anon key loaded:', keyLoaded, '| preview:', keyPreview)
}

const customFetch: typeof fetch = (input, init) => {
  const headers = init?.headers as HeadersInit | undefined
  if (typeof window !== 'undefined' && headers) {
    const h = headers instanceof Headers
      ? Object.fromEntries(headers.entries())
      : (Array.isArray(headers) ? Object.fromEntries(headers) : headers) as Record<string, string>
    const apikey = h.apikey ?? h.Apikey
    const auth = h.Authorization ?? h.authorization
    console.log('[Supabase] Request headers:', {
      apikey: apikey ? `${String(apikey).slice(0, 25)}...` : '(missing)',
      Authorization: auth ? 'Bearer ***' : '(missing)',
    })
  }
  return fetch(input, init)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: customFetch },
})
