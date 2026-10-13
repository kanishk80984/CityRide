import axios from 'axios';

let cachedSiteUrl = null;

async function getSiteUrl() {
  if (cachedSiteUrl) return cachedSiteUrl;
  try {
    const configRes = await axios.get('http://localhost:5011/api/public/config');
    if (configRes.data && configRes.data.siteUrl) {
      cachedSiteUrl = configRes.data.siteUrl.replace(/\/+$/, ''); // normalize
      return cachedSiteUrl;
    }
  } catch (error) {
    console.warn('[SSR] Failed to fetch site URL from backend:', error.message);
  }
  // Fallback to local dev if backend config fails
  return 'http://localhost:3019';
}

export const resolvePublicAssetUrl = (img, baseOrigin) => {
  if (!img) return `${baseOrigin}/og-image.webp`;
  const s = String(img).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const idx = s.indexOf('uploads/');
  if (idx !== -1) return `${baseOrigin}/${s.substring(idx)}`;
  return `${baseOrigin}/${s.startsWith('/') ? s.substring(1) : s}`;
};

const seoKeywordMap = {
  '/': {
    title: 'CityRide - Your City. Your Ride. | Book Bike, Auto and Car Rides',
    description: 'Fast, reliable and affordable rides in your city with CityRide. Book a bike, auto, or car instantly.',
    keywords: 'ride booking, bike taxi, auto booking, cab booking, CityRide'
  },
  '/rides/bike': {
    title: 'Book a Bike Ride - CityRide | Fast & Affordable',
    description: 'Beat the traffic with CityRide bike taxis. Fast, reliable, and cheap bike rides in your city.',
    keywords: 'bike taxi, bike ride, book bike, fast ride, affordable commute'
  },
  '/rides/auto': {
    title: 'Book an Auto - CityRide | Convenient Auto Rickshaws',
    description: 'Book auto rickshaws at your doorstep with CityRide. No haggling, transparent pricing.',
    keywords: 'auto booking, book auto, auto rickshaw, local auto, CityRide auto'
  },
  '/rides/car': {
    title: 'Book a Car Cab - CityRide | Comfortable Rides',
    description: 'Comfortable and safe car rides with CityRide. Choose mini, sedan, or SUV for your daily commute.',
    keywords: 'cab booking, book car, car taxi, safe rides, premium cab'
  },
  '/rides/outstation': {
    title: 'Outstation Rides - CityRide | Long Distance Travel',
    description: 'Planning a trip? Book CityRide outstation cabs for comfortable and affordable long-distance travel.',
    keywords: 'outstation cab, long distance ride, outstation taxi, intercity travel, CityRide outstation'
  }
};

export async function fetchSeoData(url) {
  const pathPart = url.split('?')[0].replace(/\/+$/, '') || '/';
  
  const siteUrl = await getSiteUrl();
  const canonicalUrl = `${siteUrl}${pathPart === '/' ? '' : pathPart}`;

  // Find page-specific SEO or fallback to default
  const pageSeo = seoKeywordMap[pathPart] || seoKeywordMap['/'];

  const seoData = {
    title: pageSeo.title,
    description: pageSeo.description,
    keywords: pageSeo.keywords,
    canonical: canonicalUrl,
    image: `${siteUrl}/og-image.webp`
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "CityRide",
    "url": siteUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return {
    pageType: 'generic',
    status: 200,
    siteUrl,
    seoData,
    jsonLd
  };
}
