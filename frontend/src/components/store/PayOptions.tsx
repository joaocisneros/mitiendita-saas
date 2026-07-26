"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Medios de pago de la tienda (Yape y/o Plin). Si hay dos, el cliente elige con
 * botones cuál usar y solo se muestra el QR/datos del elegido. Si solo hay uno,
 * se muestra directo. Sirve en el pago del pedido y en la suscripción.
 */
export function PayOptions({
  yapeQrUrl,
  yapeHolderName,
  yapeNumber,
  plinQrUrl,
  plinHolderName,
  plinNumber,
}: {
  yapeQrUrl?: string | null;
  yapeHolderName?: string | null;
  yapeNumber?: string | null;
  plinQrUrl?: string | null;
  plinHolderName?: string | null;
  plinNumber?: string | null;
}) {
  const methods = [
    { key: "yape", label: "Yape", color: "#7c3aed", qrUrl: yapeQrUrl, holder: yapeHolderName, number: yapeNumber },
    { key: "plin", label: "Plin", color: "#0d9488", qrUrl: plinQrUrl, holder: plinHolderName, number: plinNumber },
  ].filter((m) => m.qrUrl || m.number);

  const [active, setActive] = useState(0);
  if (methods.length === 0) return null;

  const current = methods[Math.min(active, methods.length - 1)];

  return (
    <div>
      {methods.length > 1 && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          {methods.map((m, i) => {
            const on = i === active;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setActive(i)}
                style={on ? { backgroundColor: m.color, borderColor: m.color, color: "#fff" } : { borderColor: "#e2e8f0", color: m.color }}
                className="rounded-xl border-2 bg-white py-1.5 text-sm font-black transition"
              >
                {m.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl bg-white p-2.5 text-center ring-1 ring-slate-200">
        {methods.length === 1 && (
          <p className="text-sm font-black" style={{ color: current.color }}>
            {current.label}
          </p>
        )}
        {current.qrUrl && (
          <div className="relative mx-auto h-32 w-32">
            <Image src={current.qrUrl} alt={`QR ${current.label}`} fill sizes="128px" className="object-contain" />
          </div>
        )}
        <div className="mt-1 space-y-0.5 text-sm text-slate-700">
          {current.holder && <p>Titular: <b>{current.holder}</b></p>}
          {current.number && <p>Número: <b>{current.number}</b></p>}
        </div>
      </div>
    </div>
  );
}
