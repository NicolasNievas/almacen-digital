/** Configuración de Cloudinary para subida no firmada (unsigned upload preset). */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  );
}

/** Devuelve la URL con transformaciones de optimización automática. */
function optimized(url: string): string {
  return url.includes("/upload/") ? url.replace("/upload/", "/upload/f_auto,q_auto/") : url;
}

/**
 * Sube una imagen a Cloudinary usando un preset no firmado.
 * Restringe a archivos de imagen y 5 MB como máximo.
 */
export async function uploadImage(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !preset) {
    throw new Error(
      "Cloudinary no está configurado. Definí NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    );
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se permiten archivos de imagen.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen supera el límite de 5 MB.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo subir la imagen (${response.status}). ${text}`);
  }

  const data = (await response.json()) as { secure_url?: string; url?: string };
  const url = data.secure_url ?? data.url;
  if (!url) throw new Error("Cloudinary no devolvió una URL.");
  return optimized(url);
}
