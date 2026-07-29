import { domToPng } from "modern-screenshot";

/** Convierte el recibo (nodo del DOM) en una imagen PNG y dispara la descarga. */
export async function downloadReceiptImage(node: HTMLElement, filename: string) {
  const dataUrl = await domToPng(node, { scale: 2, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
