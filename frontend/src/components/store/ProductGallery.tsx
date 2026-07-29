"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({
  images,
  name,
  isFeatured,
  placeholderIcon = "□",
  imageWrapperClassName,
}: {
  images: string[];
  name: string;
  isFeatured?: boolean;
  placeholderIcon?: string;
  imageWrapperClassName?: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  const hasMultiple = images.length > 1;

  return (
    <div>
      <div
        className={
          imageWrapperClassName ??
          "relative aspect-square overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
        }
      >
        {current ? (
          <Image
            src={current}
            alt={name}
            fill
            sizes="(max-width:768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl text-slate-300">
            {placeholderIcon}
          </div>
        )}
        {isFeatured && (
          <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950 shadow-sm">
            Destacado
          </span>
        )}
      </div>

      {hasMultiple && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(index)}
              className={`relative aspect-square overflow-hidden rounded-xl bg-white ring-2 transition ${
                index === active ? "ring-slate-900" : "ring-slate-200 hover:ring-slate-400"
              }`}
              aria-label={`Ver foto ${index + 1} de ${name}`}
            >
              <Image src={url} alt={`${name} - foto ${index + 1}`} fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
