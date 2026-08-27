"use client";

import { useState } from "react";

export default function ImageWithLoader({
  src,
  alt,
  className = "",
  imgClassName = "",
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  [key: string]: unknown;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`img-load ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover ${imgClassName} ${loaded ? "loaded" : ""}`}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        {...props}
      />
    </div>
  );
}
