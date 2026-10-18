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

/** Tipos MIME que Cloudinary va a servir como imagen segura (excluye SVG). */
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Sube una imagen a Cloudinary usando un preset no firmado.
 * Restringe a formatos de imagen raster y 5 MB como máximo.
 */
export async function uploadImage(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !preset) {
    console.error("Faltan NEXT_PUBLIC_CLOUDINARY_* en las variables de entorno.");
    throw new Error("No pudimos subir la imagen. Volvé a intentar en unos minutos.");
  }
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Solo se admiten fotos JPG, PNG o WebP.");
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
    // El cuerpo de Cloudinary puede traer detalles internos: no lo mostramos.
    console.error("Cloudinary rechazó la subida:", response.status, await response.text());
    throw new Error("No se pudo subir la imagen. Revisá el formato y el tamaño e intentá otra vez.");
  }

  const data = (await response.json()) as { secure_url?: string; url?: string };
  const url = data.secure_url ?? data.url;
  if (!url) throw new Error("No se pudo obtener la URL de la imagen. Intentá otra vez.");
  // Seguridad: solo aceptamos URLs de res.cloudinary.com (coincide con next.config.ts).
  if (!url.startsWith("https://res.cloudinary.com/")) {
    console.error("Cloudinary devolvió una URL inesperada:", url);
    throw new Error("No se pudo subir la imagen. Volvé a intentar en unos minutos.");
  }
  return optimized(url);
}
