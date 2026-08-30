"use client";

import { useState, useRef, useEffect } from "react";

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
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <div className={`img-load ${className}`}>
      <img
        ref={imgRef}
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
