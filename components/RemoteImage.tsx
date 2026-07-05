"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A hotlinked Unsplash/Wikimedia image rendered through `next/image` (lazy,
 * correctly sized → no layout shift). It always fills a positioned parent
 * (`.imgwrap`, `.banner`, `.focus-hero`, …). If the remote URL or the optimizer
 * fails, it renders nothing so the parent's gradient placeholder shows through —
 * preserving the app's original graceful-degradation behavior.
 */
export function RemoteImage({
  src,
  alt = "",
  sizes = "100vw",
  className = "ph",
  priority = false,
  unoptimized = false,
}: {
  src: string;
  alt?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  /**
   * Skip Next's server-side re-encode and let the browser hotlink the source
   * directly. Wikimedia rate-limits repeated same-IP thumbnail requests, which
   * the optimizer's single dev/prod server IP trips as soon as more than a
   * handful of distinct portraits are cycled — each visitor's own browser
   * fetching the CDN directly doesn't hit that limit.
   */
  unoptimized?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      className={className}
      style={{ objectFit: "cover" }}
      onError={() => setFailed(true)}
    />
  );
}
