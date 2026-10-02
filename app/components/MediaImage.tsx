"use client";

import Image from "next/image";
import { ReactNode, useState } from "react";

type MediaImageProps = {
  src?: string | null;
  alt: string;
  className: string;
  imageClassName?: string;
  fallback?: ReactNode;
  sizes?: string;
  objectPosition?: string;
};

export default function MediaImage({
  src,
  alt,
  className,
  imageClassName = "object-cover",
  fallback,
  sizes = "100vw",
  objectPosition,
}: MediaImageProps) {
  const [failedImage, setFailedImage] = useState<{ src: string; failed: boolean }>({ src: "", failed: false });
  const hasImage = Boolean(src && (failedImage.src !== src || !failedImage.failed));

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#eee8ff] via-[#f8e8f5] to-[#f3f0ee] ${className}`}>
      {hasImage && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          className={imageClassName}
          style={objectPosition ? { objectPosition } : undefined}
          onError={() => setFailedImage({ src, failed: true })}
        />
      ) : src && failedImage.src === src && failedImage.failed ? (
        <span role="status" className="absolute inset-0 grid place-items-center p-3 text-center text-xs font-semibold text-[#746e80]">
          Imagem não carregada
        </span>
      ) : (
        fallback
      )}
    </div>
  );
}
