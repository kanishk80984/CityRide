import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import { fetchSeoData, resolvePublicAssetUrl } from './src/ssr/fetchSeoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(compression());

const isProd = true;
const PORT = process.env.PORT || 3019;

app.use(express.static(path.resolve(__dirname, 'dist/client'), { index: false }));

app.use(async (req, res, next) => {
  try {
    const url = req.originalUrl;
    const pathPart = url.split('?')[0];

    const isStaticFile = /\.(ico|png|jpg|jpeg|gif|svg|json|xml|txt|css|js|map|woff|woff2|ttf|eot)$/i.test(pathPart);
    if (url.startsWith('/api') || url.startsWith('/assets') || isStaticFile) {
      return next();
    }

    const PRIVATE_PREFIXES = [
      '/dashboard', '/users', '/drivers', '/vehicles', 
      '/popular-locations', '/advertisements', '/withdrawals', 
      '/user-withdrawals', '/help', '/subscriptions', '/ride-config', 
      '/wallet', '/owner', '/login', '/register'
    ];
    if (PRIVATE_PREFIXES.some(p => pathPart.startsWith(p))) {
      return next();
    }

    const ssrData = await fetchSeoData(url);

    if (ssrData && ssrData.status === 301 && ssrData.redirectUrl) {
      return res.redirect(301, ssrData.redirectUrl);
    }

    if (ssrData && ssrData.status === 404) {
      res.status(404);
    }

    let template = fs.readFileSync(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8');
    
    let render;
    if (isProd) {
      const entryServer = await import(`file://${path.resolve(__dirname, 'dist/server/entry-server.js').replace(/\\/g, '/')}`);
      render = entryServer.render;
    } else {
      // In dev, Vite handles it. But if this script is used for dev, it won't work perfectly.
      // Assuming this is just for production start.
      return next();
    }

    globalThis.__SSR_HOST__ = req.get('host');
    globalThis.__SSR_PROTOCOL__ = req.protocol;
    let { html: appHtml } = render(url, ssrData || {});
    
    // React 19 renderToString hoists and prepends <link rel="preload"> tags to the output string.
    // We strip them out to prevent duplicate preloads and unnecessary below-the-fold preloads.
    appHtml = appHtml.replace(/<link rel="preload"[^>]*>/g, '');

    const seoData = ssrData?.seoData || {
      title: 'CityRide - Your City. Your Ride. | Book Bike, Auto and Car Rides',
      description: 'Fast, reliable and affordable rides in your city with CityRide.',
      canonical: (ssrData?.siteUrl || 'http://localhost:3019') + pathPart
    };

    const ogImage = resolvePublicAssetUrl(seoData.image, ssrData?.siteUrl || 'http://localhost:3019');
    const escHtml = (str) => String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let seoHead = `
      <title>${escHtml(seoData.title)}</title>
      <meta name="description" content="${escHtml(seoData.description)}" />
      ${seoData.keywords ? `<meta name="keywords" content="${escHtml(seoData.keywords)}" />` : ''}
      <link rel="canonical" href="${escHtml(seoData.canonical)}" />
      <meta property="og:title" content="${escHtml(seoData.title)}" />
      <meta property="og:description" content="${escHtml(seoData.description)}" />
      <meta property="og:url" content="${escHtml(seoData.canonical)}" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="${ogImage}" />
      <meta property="og:site_name" content="CityRide" />
      <meta name="theme-color" content="#fcc111" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${escHtml(seoData.title)}" />
      <meta name="twitter:description" content="${escHtml(seoData.description)}" />
      <meta name="twitter:image" content="${ogImage}" />
    `;

    if (ssrData?.jsonLd) {
      seoHead += `\n<script type="application/ld+json">\n${JSON.stringify(ssrData.jsonLd)}\n</script>`;
    }

    const safeData = JSON.stringify(ssrData || {}).replace(/</g, '\\u003c');
    seoHead += `\n<script>window.__SSR_DATA__ = ${safeData};</script>`;

    const html = template
      .replace(/<title>.*?<\/title>/gi, '')
      .replace('<!--ssr-head-->', seoHead)
      .replace('<!--ssr-body-->', appHtml);

    res.status(res.statusCode || 200).set({ 'Content-Type': 'text/html' }).end(html);

  } catch (error) {
    console.error('SSR Middleware Error:', error);
    next(error);
  }
});

// Prevent static file requests from falling back to index.html (excluding sitemap and robots)
app.get(/\.(png|jpg|jpeg|gif|svg|json|ico|css|js|map)$/i, (req, res) => {
  res.status(404).send('Not found');
});

app.get('/sitemap.xml', async (req, res) => {
  const ssrData = await fetchSeoData('/');
  const siteUrl = ssrData?.siteUrl || 'http://localhost:3019';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/rides/bike</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/rides/auto</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/rides/car</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/rides/outstation</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

app.get('/robots.txt', async (req, res) => {
  const ssrData = await fetchSeoData('/');
  const siteUrl = ssrData?.siteUrl || 'http://localhost:3019';
  const txt = `User-agent: *
Allow: /

Disallow: /dashboard
Disallow: /users
Disallow: /drivers
Disallow: /vehicles
Disallow: /popular-locations
Disallow: /advertisements
Disallow: /withdrawals
Disallow: /user-withdrawals
Disallow: /help
Disallow: /subscriptions
Disallow: /ride-config
Disallow: /wallet
Disallow: /owner
Disallow: /login
Disallow: /register

Sitemap: ${siteUrl}/sitemap.xml`;
  res.header('Content-Type', 'text/plain');
  res.send(txt);
});

// Prevent API and uploads from returning the HTML fallback if they bypass the reverse proxy
app.use(['/api', '/uploads'], (req, res) => {
  res.status(404).json({ error: 'Not found or reverse proxy misconfigured' });
});

// Fallback for private routes or when SSR fails
app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist/client/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
