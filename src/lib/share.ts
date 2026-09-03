import type { SegmentDto, TranscriptionResponseDto } from "../types/api";

/**
 * Packs a whole result into a link, so opening a shared transcript costs the recipient nothing.
 *
 * The alternative -- linking by video id and re-running -- spends one of the recipient's three
 * hourly attempts on work that has already been done, and fails outright once their budget is out.
 * The payload rides in the URL fragment, which browsers never send to a server, so a shared link
 * stays as private as the page it came from.
 */

const HASH_KEY = "d";

// Chrome and Firefox handle megabyte-long URLs, but they get unwieldy to paste and some chat apps
// truncate silently. Past this the caller falls back to a plain by-id link rather than hand out
// something that may arrive cut in half.
const MAX_ENCODED_LENGTH = 60_000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

// Allocates its own ArrayBuffer rather than using Uint8Array.from, so the result is typed as
// backed by a real buffer and can be handed straight to Response as a body.
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

// Response is the shortest route from a value to a byte stream and back, and unlike Blob.stream()
// it exists in every environment this runs in, test harness included.
async function compress(text: string): Promise<Uint8Array> {
  const stream = new Response(text).body!.pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const stream = new Response(bytes).body!.pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

/**
 * Returns null when the result is too big to travel in a link, or the browser can't compress.
 *
 * Per-word timings are stripped before packing. They roughly double the payload on a long
 * transcript, which is the difference between a link that works and one that exceeds the cap and
 * falls back to costing the recipient a transcription. The recipient loses word-exact karaoke and
 * gets the estimate instead -- a fair trade for the link working at all.
 */
export async function encodeResult(result: TranscriptionResponseDto): Promise<string | null> {
  try {
    const withoutWords: TranscriptionResponseDto = {
      ...result,
      segments: result.segments.map(({ words, ...segment }) => segment),
    };
    const encoded = toBase64Url(await compress(JSON.stringify(withoutWords)));
    return encoded.length > MAX_ENCODED_LENGTH ? null : encoded;
  } catch {
    return null;
  }
}

function isSegment(value: unknown): value is SegmentDto {
  const segment = value as SegmentDto;
  return (
    typeof segment === "object" &&
    segment !== null &&
    typeof segment.sequence === "number" &&
    typeof segment.startMs === "number" &&
    typeof segment.endMs === "number" &&
    typeof segment.sourceText === "string" &&
    typeof segment.translatedText === "string"
  );
}

/**
 * Anything reaching this came out of a URL someone else wrote, so it is validated field by field
 * before it is treated as a result. React escapes the text it renders, so the risk isn't injection
 * -- it's a malformed payload crashing the view halfway through drawing it.
 */
function isResult(value: unknown): value is TranscriptionResponseDto {
  const result = value as TranscriptionResponseDto;
  return (
    typeof result === "object" &&
    result !== null &&
    typeof result.video === "object" &&
    result.video !== null &&
    typeof result.video.id === "string" &&
    typeof result.video.title === "string" &&
    typeof result.video.durationSeconds === "number" &&
    typeof result.sourceLanguage === "string" &&
    typeof result.targetLanguage === "string" &&
    Array.isArray(result.segments) &&
    result.segments.every(isSegment)
  );
}

/** Reads a result out of a URL fragment, or null if there isn't a valid one there. */
export async function decodeResultFromHash(hash: string): Promise<TranscriptionResponseDto | null> {
  const encoded = new URLSearchParams(hash.replace(/^#/, "")).get(HASH_KEY);
  if (!encoded) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(await decompress(fromBase64Url(encoded)));
    return isResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Builds the shareable link. The by-id query parameters are kept alongside the payload so a
 * recipient whose browser can't unpack it still lands on the right video at the right moment.
 */
export async function buildShareUrl(
  baseUrl: string,
  result: TranscriptionResponseDto,
  atSeconds: number,
): Promise<string> {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("v", result.video.id);
  url.searchParams.set("t", String(atSeconds));
  url.searchParams.set("lang", result.targetLanguage);

  const encoded = await encodeResult(result);
  if (encoded) {
    url.hash = `${HASH_KEY}=${encoded}`;
  }
  return url.toString();
}
