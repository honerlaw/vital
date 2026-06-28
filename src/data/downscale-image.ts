import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Longest-edge target for an uploaded scan photo. Big enough for the model to read equipment, small
// enough to keep the base64 payload and vision-token cost a fraction of a full-resolution shot.
const MAX_EDGE = 1024;

/**
 * Downscale a picked image to ~1024px on its longest edge and re-encode as JPEG, returning a base64
 * `data:` URL for the equipment photo-scan (042). Run client-side before upload so the request body
 * stays small and the vision model spends far fewer tokens than a raw camera shot would cost. The
 * image is transient — this writes only to the cache, never the media library, and the data URL is
 * discarded after the scan returns.
 */
export async function downscaleImageToDataUrl(
  uri: string,
  width: number,
  height: number,
): Promise<string> {
  const longest = Math.max(width, height);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: Math.round(width * scale), height: Math.round(height * scale) });
  const ref = await context.renderAsync();
  const result = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (typeof result.base64 !== 'string' || result.base64.length === 0) {
    throw new Error('Image encoding produced no base64 data');
  }
  return `data:image/jpeg;base64,${result.base64}`;
}
