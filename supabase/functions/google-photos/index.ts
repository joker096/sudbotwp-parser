import { corsHeaders } from '../_shared/cors.ts'

// Проверка, является ли URL прямой ссылкой на изображение Google
function isDirectGoogleImageUrl(url: string): boolean {
  return url.includes('lh3.googleusercontent.com') && 
         (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || 
          url.includes('.gif') || url.includes('.webp') || url.includes('photo') || url.includes('img'))
}

// Очистка и валидация прямой ссылки на изображение
function cleanGoogleImageUrl(url: string): string | null {
  try {
    // Убираем лишние параметры
    let cleanUrl = url.split('&')[0]
    
    // Проверяем, что это Google Photos URL
    if (!cleanUrl.includes('lh3.googleusercontent.com')) {
      return null
    }
    
    // Добавляем =s0 для оригинального размера, если нужно
    if (!cleanUrl.includes('=s') && !cleanUrl.includes('=w') && !cleanUrl.includes('=h')) {
      cleanUrl = cleanUrl + '=s0'
    } else if (cleanUrl.includes('=s') && !cleanUrl.includes('=s0')) {
      cleanUrl = cleanUrl.replace(/=s\d+/, '=s0')
    }
    
    return cleanUrl
  } catch {
    return null
  }
}

interface GooglePhotoResult {
  success: boolean
  images?: string[]
  error?: string
}

interface FetchResponse {
  images: string[]
  error?: string
}

// Простой fetch без ScrapingBee
async function fetchGooglePhoto(url: string): Promise<FetchResponse> {
  try {
    // Сначала проверяем, это ли короткая ссылка photos.app.goo.gl
    const isShortLink = url.includes('photos.app.goo.gl')
    
    let finalUrl = url
    
    // Для коротких ссылок сначала получаем реальный URL через HEAD redirect
    if (isShortLink) {
      try {
        // Пытаемся получить заголовок Location через HEAD запрос
        const headResponse = await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'manual'
        })
        
        // Проверяем статус и заголовок Location
        const location = headResponse.headers.get('Location')
        if (location) {
          finalUrl = location
          console.log('Short link resolved to:', finalUrl)
        } else if (headResponse.status === 302 || headResponse.status === 301 || headResponse.status === 303 || headResponse.status === 307 || headResponse.status === 308) {
          // Если manual redirect не сработал, пробуем follow
          const followResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            }
          })
          
          if (followResponse.redirected) {
            finalUrl = followResponse.url
            console.log('Short link redirected to:', finalUrl)
          }
        }
      } catch (e) {
        console.log('Redirect resolution error:', e.message)
      }
    }

    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })

    if (!response.ok) {
      return { images: [], error: `HTTP error: ${response.status}` }
    }

    const body = await response.text()

    // Находим все ссылки на изображения lh3.googleusercontent.com
    const imageUrls = new Set<string>()
    const regex = /https:\/\/lh3\.googleusercontent\.com\/[^\s"\'<>]+/g
    const matches = body.match(regex)

    if (matches) {
      for (const url of matches) {
        // Очищаем URL от лишних параметров
        let cleanUrl = url.split('&')[0]
        
        // Проверяем, что это действительно изображение
        if (cleanUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) || cleanUrl.includes('photo')) {
          // Добавляем =s0 для оригинального размера
          if (!cleanUrl.includes('=s') && !cleanUrl.includes('=w') && !cleanUrl.includes('=h')) {
            cleanUrl = cleanUrl + '=s0'
          } else if (cleanUrl.includes('=s')) {
            cleanUrl = cleanUrl.replace(/=s\d+/, '=s0')
          }
          imageUrls.add(cleanUrl)
        }
      }
    }

    // Также ищем в JSON данных
    const jsonRegex = /"url"\s*:\s*"([^"]+lh3\.googleusercontent\.com[^"]+)"/g
    const jsonMatches = body.match(jsonRegex)
    if (jsonMatches) {
      for (const match of jsonMatches) {
        const urlMatch = match.match(/"url"\s*:\s*"([^"]+)"/)
        if (urlMatch && urlMatch[1]) {
          let cleanUrl = urlMatch[1]
          if (cleanUrl.includes('=s') && !cleanUrl.includes('=s0')) {
            cleanUrl = cleanUrl.replace(/=s\d+/, '=s0')
          }
          imageUrls.add(cleanUrl)
        }
      }
    }

    // Ищем изображения в различных форматах данных Google Photos
    // Формат 1: AF_initDataCallback с photos藻
    const dataCallbackRegex = /AF_initDataCallback\s*\([^)]*data\s*:\s*\[([^\]]+)\]/g
    let dataMatch
    while ((dataMatch = dataCallbackRegex.exec(body)) !== null) {
      const dataContent = dataMatch[1]
      const imgUrls = dataContent.match(/https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>]+/g)
      if (imgUrls) {
        for (const imgUrl of imgUrls) {
          let cleanUrl = imgUrl.split('&')[0]
          if (cleanUrl.includes('=s') && !cleanUrl.includes('=s0')) {
            cleanUrl = cleanUrl.replace(/=s\d+/, '=s0')
          } else if (!cleanUrl.includes('=s') && !cleanUrl.includes('=w') && !cleanUrl.includes('=h')) {
            cleanUrl = cleanUrl + '=s0'
          }
          imageUrls.add(cleanUrl)
        }
      }
    }

    // Формат 2: Ищем в массивах URL с lh3.googleusercontent.com
    const arrayUrlsRegex = /\[\s*"(https:\/\/lh3\.googleusercontent\.com[^"]+)"\s*\]/g
    let arrayMatch
    while ((arrayMatch = arrayUrlsRegex.exec(body)) !== null) {
      let cleanUrl = arrayMatch[1]
      if (cleanUrl.includes('=s') && !cleanUrl.includes('=s0')) {
        cleanUrl = cleanUrl.replace(/=s\d+/, '=s0')
      } else if (!cleanUrl.includes('=s') && !cleanUrl.includes('=w') && !cleanUrl.includes('=h')) {
        cleanUrl = cleanUrl + '=s0'
      }
      imageUrls.add(cleanUrl)
    }

    // Формат 3: photoURL в JavaScript переменных
    const photoUrlRegex = /photoURL\s*[:=]\s*["']([^"']+lh3\.googleusercontent\.com[^"']+)["']/g
    let photoMatch
    while ((photoMatch = photoUrlRegex.exec(body)) !== null) {
      let cleanUrl = photoMatch[1]
      if (cleanUrl.includes('=s') && !cleanUrl.includes('=s0')) {
        cleanUrl = cleanUrl.replace(/=s\d+/, '=s0')
      } else if (!cleanUrl.includes('=s') && !cleanUrl.includes('=w') && !cleanUrl.includes('=h')) {
        cleanUrl = cleanUrl + '=s0'
      }
      imageUrls.add(cleanUrl)
    }

    // Формат 4: ICS (Image Content Service) ссылки
    const icsRegex = /https:\/\/photos\.google\.com\/share\/[^\s"'<>]+/g
    const icsMatches = body.match(icsRegex)
    if (icsMatches && icsMatches.length > 0) {
      // Если нашли ссылку на альбом, пробуем получить фото из него
      console.log('Found Google Photos share link, trying to extract from there')
    }

    return { images: Array.from(imageUrls) }
  } catch (error) {
    return { images: [], error: `Fetch error: ${error.message}` }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url, mode = 'single' } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let result: GooglePhotoResult

    // Проверяем, это прямая ссылка на изображение Google
    const isDirectImage = isDirectGoogleImageUrl(url)
    
    // Если это прямая ссылка на изображение, сразу возвращаем её
    if (isDirectImage) {
      const cleanedUrl = cleanGoogleImageUrl(url)
      if (cleanedUrl) {
        result = { success: true, images: [cleanedUrl] }
      } else {
        result = { success: false, error: 'Неверный формат ссылки на изображение' }
      }
    } else {
      // Проверяем, это альбом или одиночное фото
      const isAlbum = url.includes('photos.app.goo.gl') || url.includes('photos.google.com/u')
      const isMultiple = mode === 'multiple'

      if (isAlbum || isMultiple) {
        // Для альбома получаем все изображения
        const fetchResult = await fetchGooglePhoto(url)
        
        if (fetchResult.error) {
          result = { success: false, error: fetchResult.error }
        } else if (fetchResult.images.length === 0) {
          result = { success: false, error: 'Не удалось найти изображения. Проверьте, что ссылка публичная.' }
        } else {
          result = { success: true, images: fetchResult.images }
        }
      } else {
        // Для одиночного изображения
        const fetchResult = await fetchGooglePhoto(url)
        
        if (fetchResult.error) {
          result = { success: false, error: fetchResult.error }
        } else if (fetchResult.images.length === 0) {
          result = { success: false, error: 'Не удалось получить изображение. Проверьте, что ссылка публичная.' }
        } else {
          // Берем первое изображение (обычно это оригинал)
          result = { success: true, images: [fetchResult.images[0]] }
        }
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
