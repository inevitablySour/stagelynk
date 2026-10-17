"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProfileArtwork({
  src,
  alt,
  className,
  children,
  sizes,
}: {
  src?: string;
  alt: string;
  className?: string;
  children?: ReactNode;
  sizes: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      {children}
      {src && failedSrc !== src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      )}
    </div>
  );
}
