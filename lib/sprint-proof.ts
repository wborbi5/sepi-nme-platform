/** Proof is required. Photos and PDFs, with room for a phone camera original. */
export const PROOF_MAX_BYTES = 50 * 1024 * 1024;

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "bmp",
  "tif",
  "tiff",
  "avif",
]);

const RESIZE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/avif",
]);

const RESIZE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"]);

export function fileExtension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!ext || ext === name.toLowerCase()) return "";
  return ext;
}

export function sprintProofError(file: { name: string; type: string; size: number }): string | null {
  if (file.size <= 0) return "That proof file is empty. Choose a photo or PDF.";
  if (file.size > PROOF_MAX_BYTES) {
    return "Proof file is too large. Use a photo or PDF under 50MB.";
  }
  const ext = fileExtension(file.name);
  const type = file.type.toLowerCase();
  const isPdf = type === "application/pdf" || ext === "pdf";
  const isImage = type.startsWith("image/") || IMAGE_EXT.has(ext);
  if (!isPdf && !isImage) {
    return "Proof must be a photo (JPG, PNG, HEIC, WebP, GIF) or a PDF.";
  }
  return null;
}

export function proofContentType(file: { name: string; type: string }): string {
  const type = file.type.toLowerCase();
  if (type === "image/jpg" || type === "image/pjpeg") return "image/jpeg";
  if (type && type !== "application/octet-stream") return type;
  const ext = fileExtension(file.name);
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
    avif: "image/avif",
    pdf: "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}

export function proofExtension(file: { name: string; type: string }): string {
  const ext = fileExtension(file.name);
  if (ext === "jpeg") return "jpg";
  if (ext === "tiff") return "tif";
  if (["jpg", "png", "gif", "webp", "heic", "heif", "bmp", "tif", "avif", "pdf"].includes(ext)) {
    return ext;
  }
  const type = proofContentType(file);
  if (type === "application/pdf") return "pdf";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  if (type === "image/avif") return "avif";
  if (type === "image/bmp") return "bmp";
  if (type === "image/tiff") return "tif";
  if (type === "image/jpeg") return "jpg";
  return "bin";
}

export function canResizeProofImage(file: { name: string; type: string }): boolean {
  const type = file.type.toLowerCase();
  if (RESIZE_TYPES.has(type)) return true;
  if (type && type !== "application/octet-stream") return false;
  return RESIZE_EXT.has(fileExtension(file.name));
}
