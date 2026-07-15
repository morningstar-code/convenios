/**
 * Descarga un .docx desde un endpoint y respeta el nombre de archivo que manda
 * el servidor en Content-Disposition. Solo para el navegador.
 */
export async function downloadDocx(url: string, fallbackName: string): Promise<void> {
  const res = await fetch(url);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Error al generar el documento Word");
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  anchor.download = match ? decodeURIComponent(match[1]) : fallbackName;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
