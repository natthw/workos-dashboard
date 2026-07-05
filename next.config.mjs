/** @type {import('next').NextConfig} */
const nextConfig = {
  // The dashboard reads/writes markdown in the WorkOS vault on the server only;
  // no special config needed there. Kept minimal on purpose.
  //
  // Imagery (rotating figure portraits + project/domain scenes) is hotlinked from
  // Unsplash and Wikimedia. Allowing those hosts lets us serve them through
  // `next/image` (lazy, sized, no layout shift). A dead URL still degrades to the
  // gradient placeholder via the <RemoteImage> error fallback.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default nextConfig;
