// supabase/functions/detect-track/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { encode as encodeBase64 } from 'https://deno.land/std@0.114.0/encoding/base64.ts'

const ACR_HOST = 'identify-ap-southeast-1.acrcloud.com'
const ACR_ACCESS_KEY = '0bea425cd026dbb75b2cb8278c95a696'
const ACR_SECRET_KEY = '7yu8Ff7P29tIV9bqmTL3Wdo0cgk7n6nKsqgFz08r'
const ACR_ENDPOINT = '/v1/identify'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { clip_id, video_url } = await req.json()

    if (!clip_id || !video_url) {
      return new Response(JSON.stringify({ error: 'clip_id and video_url required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Download first ~512KB of audio (covers the ACRCloud fingerprint window)
    const videoResponse = await fetch(video_url, {
      headers: { 'Range': 'bytes=0-524287' }, // first 512KB
    })

    if (!videoResponse.ok && videoResponse.status !== 206) {
      throw new Error(`Failed to fetch video: ${videoResponse.status}`)
    }

    const audioBytes = new Uint8Array(await videoResponse.arrayBuffer())

    // Build ACRCloud HMAC-SHA1 signature
    const timestamp = Math.floor(Date.now() / 1000)
    const httpMethod = 'POST'
    const httpUri = ACR_ENDPOINT
    const dataType = 'audio'
    const signatureVersion = '1'

    const sigString = [httpMethod, httpUri, ACR_ACCESS_KEY, dataType, signatureVersion, timestamp].join('\n')

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ACR_SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    )
    const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sigString))
    const signature = encodeBase64(new Uint8Array(sigBytes))

    // Build multipart form data
    const formData = new FormData()
    formData.append('sample', new Blob([audioBytes], { type: 'audio/mpeg' }), 'sample.mp3')
    formData.append('access_key', ACR_ACCESS_KEY)
    formData.append('data_type', dataType)
    formData.append('signature_version', signatureVersion)
    formData.append('signature', signature)
    formData.append('sample_bytes', audioBytes.length.toString())
    formData.append('timestamp', timestamp.toString())

    // Call ACRCloud
    const acrResponse = await fetch(`https://${ACR_HOST}${ACR_ENDPOINT}`, {
      method: 'POST',
      body: formData,
    })

    if (!acrResponse.ok) {
      throw new Error(`ACRCloud request failed: ${acrResponse.status}`)
    }

    const acrResult = await acrResponse.json()

    // Parse result — status code 0 means match found
    if (acrResult.status?.code === 0) {
      const music = acrResult.metadata?.music?.[0]
      if (music) {
        const trackName = music.title as string
        const trackArtist = (music.artists?.[0]?.name ?? '') as string

        const spotifyTrackId = music.external_metadata?.spotify?.track?.id
        const spotifyUrl = spotifyTrackId
          ? `https://open.spotify.com/track/${spotifyTrackId}`
          : null

        const appleMusicUrl = (music.external_metadata?.apple_music?.previews?.[0]?.url ?? null) as string | null

        const streamingUrl = spotifyUrl ?? appleMusicUrl ?? null

        await supabase.from('clips').update({
          track_name: trackName,
          track_artist: trackArtist,
          track_streaming_url: streamingUrl,
          track_id_status: 'confirmed',
        }).eq('id', clip_id)

        return new Response(JSON.stringify({
          matched: true,
          track_name: trackName,
          track_artist: trackArtist,
          streaming_url: streamingUrl,
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        })
      }
    }

    // No match found
    return new Response(JSON.stringify({
      matched: false,
      acr_code: acrResult.status?.code,
      acr_msg: acrResult.status?.msg,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (err) {
    console.error('detect-track error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
