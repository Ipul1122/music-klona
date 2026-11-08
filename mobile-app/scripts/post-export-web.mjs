import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(distDir)) {
  console.log('[POST-EXPORT] dist directory does not exist, creating it.');
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Copy public files (manifest.json, sw.js) to dist
if (fs.existsSync(publicDir)) {
  const files = fs.readdirSync(publicDir);
  for (const file of files) {
    fs.copyFileSync(path.join(publicDir, file), path.join(distDir, file));
    console.log(`[POST-EXPORT] Copied ${file} to dist/`);
  }
}

// 2. Ensure assets/icon.png and favicon.png exist in dist/assets
const assetsDir = path.join(rootDir, 'assets');
const distAssetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir, { recursive: true });
}
if (fs.existsSync(assetsDir)) {
  const assetFiles = fs.readdirSync(assetsDir);
  for (const file of assetFiles) {
    fs.copyFileSync(path.join(assetsDir, file), path.join(distAssetsDir, file));
  }
  console.log('[POST-EXPORT] Copied icon assets to dist/assets/');
}

// 3. Inject PWA tags into dist/index.html
const indexHtmlPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf-8');
  
  if (!html.includes('manifest.json')) {
    const headInjection = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#1DB954" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js').catch(function(err) {
            console.log('SW registration error:', err);
          });
        });
      }
    </script>
  </head>`;
    html = html.replace('</head>', headInjection);
    fs.writeFileSync(indexHtmlPath, html, 'utf-8');
    console.log('[POST-EXPORT] Injected PWA tags into dist/index.html');
  }
}

