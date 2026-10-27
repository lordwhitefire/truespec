import path from 'node:path';
import { securityHeaders } from './lib/security-headers.ts';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Truth 7's photo cap is 15 MB (`specs/media`, decision 4), and a photo reaches the
  // office through a Server Action — but a Server Action's request body is capped at
  // **1 MB** by default, so an oversized photo would be refused by the framework, before
  // any rule of ours could answer the owner with a reason. 16 MB carries a 15 MB photo
  // and the multipart envelope around it; the 15 MB cap itself stays ours
  // (`lib/photo-rules.ts` — it is checked in the browser and again on the bytes).
  //
  // A file larger than this is refused by Next with its own 413 rather than our message;
  // the browser-side check in `car-client.tsx` is what keeps the owner from ever
  // reaching that, and the server cap is the authority when it does.
  experimental: {
    serverActions: { bodySizeLimit: '16mb' },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  // Register the "@/*" alias here as well as in tsconfig, so resolution does not
  // depend on where the file sits (it is not applied inside dynamic-route folders).
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@': path.resolve(process.cwd()),
    };
    return config;
  },
  // Security headers on every response. Starts report-only (Task 16 exercise phase);
  // flip `useReportOnly` to false to enforce the CSP after the local public +
  // anonymous-office exercise shows no violations.
  async headers() {
    const headers = securityHeaders(false); // enforcing after clean exercise
    return [
      {
        source: '/:path*',
        headers: Object.entries(headers).map(([key, value]) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;
