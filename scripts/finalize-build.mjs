import { cp, mkdir, rename } from 'node:fs/promises';

await mkdir('dist/club', { recursive: true });
await rename('dist/index.html', 'dist/club/index.html');
await rename('dist/landing/index.html', 'dist/index.html');
await cp('public/manifest.webmanifest', 'dist/manifest.webmanifest');
