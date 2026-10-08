/**
 * Lightweight in-browser audio metadata and cover art extractor.
 * Supports:
 * - ID3v2.2, ID3v2.3, ID3v2.4 (APIC / PIC frames, TIT2, TPE1, TALB)
 * - FLAC (PICTURE metadata block type 6 & Vorbis comment)
 * - M4A / MP4 (covr atom)
 * Zero external dependencies, produces durable base64 Data URLs.
 */

export interface ParsedAudioMeta {
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
}

/**
 * Converts a Uint8Array slice to a base64 Data URL.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const end = Math.min(i + chunkSize, len);
    const chunk = bytes.subarray(i, end);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

/**
 * Detect image MIME type from magic bytes.
 */
function detectImageMime(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

/**
 * Finds the exact start and mime type of an embedded image by magic bytes.
 */
function findImageMagicBytes(buf: Uint8Array, start: number, end: number): { offset: number; mime: string } | null {
  for (let i = start; i < end - 3; i++) {
    // JPEG: FF D8 FF
    if (buf[i] === 0xff && buf[i + 1] === 0xd8 && buf[i + 2] === 0xff) {
      return { offset: i, mime: 'image/jpeg' };
    }
    // PNG: 89 50 4E 47
    if (i < end - 4 && buf[i] === 0x89 && buf[i + 1] === 0x50 && buf[i + 2] === 0x4e && buf[i + 3] === 0x47) {
      return { offset: i, mime: 'image/png' };
    }
    // GIF: 47 49 46 38
    if (i < end - 4 && buf[i] === 0x47 && buf[i + 1] === 0x49 && buf[i + 2] === 0x46 && buf[i + 3] === 0x38) {
      return { offset: i, mime: 'image/gif' };
    }
    // WebP: RIFF .... WEBP
    if (
      i < end - 12 &&
      buf[i] === 0x52 &&
      buf[i + 1] === 0x49 &&
      buf[i + 2] === 0x46 &&
      buf[i + 3] === 0x46 &&
      buf[i + 8] === 0x57 &&
      buf[i + 9] === 0x45 &&
      buf[i + 10] === 0x42 &&
      buf[i + 11] === 0x50
    ) {
      return { offset: i, mime: 'image/webp' };
    }
  }
  return null;
}

function decodeText(data: Uint8Array, encoding: number): string {
  try {
    if (encoding === 0) {
      return new TextDecoder('utf-8').decode(data).replace(/\0+$/, '').trim();
    } else if (encoding === 1) {
      return new TextDecoder('utf-16').decode(data).replace(/\0+$/, '').trim();
    } else if (encoding === 2) {
      return new TextDecoder('utf-16be').decode(data).replace(/\0+$/, '').trim();
    } else if (encoding === 3) {
      return new TextDecoder('utf-8').decode(data).replace(/\0+$/, '').trim();
    }
  } catch {
    // Fallback: ASCII representation
    let str = '';
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== 0) str += String.fromCharCode(data[i]);
    }
    return str.trim();
  }
  return '';
}

/**
 * Parses ID3v2.3 and ID3v2.4 tags.
 */
function parseID3v23v24(buf: Uint8Array, version: number): ParsedAudioMeta {
  const result: ParsedAudioMeta = {};
  const tagSize = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  const maxOffset = Math.min(buf.length, 10 + tagSize);

  let offset = 10;
  while (offset + 10 < maxOffset) {
    if (buf[offset] === 0) break; // Padding reached

    const frameId = String.fromCharCode(buf[offset], buf[offset + 1], buf[offset + 2], buf[offset + 3]);
    let frameSize = 0;

    if (version === 4) {
      // Synchsafe integer in ID3v2.4
      frameSize =
        ((buf[offset + 4] & 0x7f) << 21) |
        ((buf[offset + 5] & 0x7f) << 14) |
        ((buf[offset + 6] & 0x7f) << 7) |
        (buf[offset + 7] & 0x7f);
    } else {
      // Big-endian 32-bit uint in ID3v2.3
      frameSize =
        (buf[offset + 4] << 24) |
        (buf[offset + 5] << 16) |
        (buf[offset + 6] << 8) |
        buf[offset + 7];
    }

    if (frameSize <= 0 || offset + 10 + frameSize > maxOffset) {
      break;
    }

    const dataStart = offset + 10;
    const dataEnd = dataStart + frameSize;

    if (frameId === 'APIC' && !result.coverUrl) {
      try {
        const found = findImageMagicBytes(buf, dataStart + 1, dataEnd);
        if (found) {
          const imgBytes = buf.subarray(found.offset, dataEnd);
          const b64 = uint8ArrayToBase64(imgBytes);
          result.coverUrl = `data:${found.mime};base64,${b64}`;
        } else {
          const encoding = buf[dataStart];
          let mimeEnd = dataStart + 1;
          while (mimeEnd < dataEnd && buf[mimeEnd] !== 0) mimeEnd++;
          let mime = '';
          for (let i = dataStart + 1; i < mimeEnd; i++) {
            mime += String.fromCharCode(buf[i]);
          }
          let pos = mimeEnd + 2;
          if (encoding === 1 || encoding === 2) {
            while (pos + 1 < dataEnd) {
              if (buf[pos] === 0 && buf[pos + 1] === 0) {
                pos += 2;
                break;
              }
              pos += 2;
            }
          } else {
            while (pos < dataEnd && buf[pos] !== 0) pos++;
            pos += 1;
          }

          if (pos < dataEnd) {
            const imgBytes = buf.subarray(pos, dataEnd);
            const detectedMime = detectImageMime(imgBytes) || (mime.includes('/') ? mime : 'image/jpeg');
            const b64 = uint8ArrayToBase64(imgBytes);
            result.coverUrl = `data:${detectedMime};base64,${b64}`;
          }
        }
      } catch (err) {
        console.warn('Failed parsing APIC frame:', err);
      }
    } else if (frameId === 'TIT2' && !result.title) {
      const text = decodeText(buf.subarray(dataStart + 1, dataEnd), buf[dataStart]);
      if (text) result.title = text;
    } else if (frameId === 'TPE1' && !result.artist) {
      const text = decodeText(buf.subarray(dataStart + 1, dataEnd), buf[dataStart]);
      if (text) result.artist = text;
    } else if (frameId === 'TALB' && !result.album) {
      const text = decodeText(buf.subarray(dataStart + 1, dataEnd), buf[dataStart]);
      if (text) result.album = text;
    }

    offset += 10 + frameSize;
  }

  return result;
}

/**
 * Parses ID3v2.2 tags.
 */
function parseID3v22(buf: Uint8Array): ParsedAudioMeta {
  const result: ParsedAudioMeta = {};
  const tagSize = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  const maxOffset = Math.min(buf.length, 10 + tagSize);

  let offset = 10;
  while (offset + 6 < maxOffset) {
    if (buf[offset] === 0) break;
    const frameId = String.fromCharCode(buf[offset], buf[offset + 1], buf[offset + 2]);
    const frameSize = (buf[offset + 3] << 16) | (buf[offset + 4] << 8) | buf[offset + 5];

    if (frameSize <= 0 || offset + 6 + frameSize > maxOffset) break;

    const dataStart = offset + 6;
    const dataEnd = dataStart + frameSize;

    if (frameId === 'PIC' && !result.coverUrl) {
      try {
        const found = findImageMagicBytes(buf, dataStart + 1, dataEnd);
        if (found) {
          const imgBytes = buf.subarray(found.offset, dataEnd);
          const b64 = uint8ArrayToBase64(imgBytes);
          result.coverUrl = `data:${found.mime};base64,${b64}`;
        } else {
          const encoding = buf[dataStart];
          let pos = dataStart + 5;
          if (encoding === 1 || encoding === 2) {
            while (pos + 1 < dataEnd) {
              if (buf[pos] === 0 && buf[pos + 1] === 0) {
                pos += 2;
                break;
              }
              pos += 2;
            }
          } else {
            while (pos < dataEnd && buf[pos] !== 0) pos++;
            pos += 1;
          }

          if (pos < dataEnd) {
            const imgBytes = buf.subarray(pos, dataEnd);
            const detectedMime = detectImageMime(imgBytes);
            const b64 = uint8ArrayToBase64(imgBytes);
            result.coverUrl = `data:${detectedMime};base64,${b64}`;
          }
        }
      } catch (err) {
        console.warn('Failed parsing PIC frame:', err);
      }
    } else if (frameId === 'TT2' && !result.title) {
      const text = decodeText(buf.subarray(dataStart + 1, dataEnd), buf[dataStart]);
      if (text) result.title = text;
    } else if (frameId === 'TP1' && !result.artist) {
      const text = decodeText(buf.subarray(dataStart + 1, dataEnd), buf[dataStart]);
      if (text) result.artist = text;
    } else if (frameId === 'TAL' && !result.album) {
      const text = decodeText(buf.subarray(dataStart + 1, dataEnd), buf[dataStart]);
      if (text) result.album = text;
    }

    offset += 6 + frameSize;
  }

  return result;
}

/**
 * Parses FLAC PICTURE metadata block.
 */
function parseFlacMetadata(buf: Uint8Array): ParsedAudioMeta {
  const result: ParsedAudioMeta = {};
  if (buf.length < 4 || buf[0] !== 0x66 || buf[1] !== 0x4c || buf[2] !== 0x61 || buf[3] !== 0x43) {
    return result;
  }

  let offset = 4;
  while (offset + 4 < buf.length) {
    const isLast = (buf[offset] & 0x80) !== 0;
    const blockType = buf[offset] & 0x7f;
    const length = (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3];
    const dataStart = offset + 4;
    const dataEnd = dataStart + length;

    if (dataEnd > buf.length) break;

    // Type 6 = PICTURE
    if (blockType === 6 && !result.coverUrl) {
      try {
        let p = dataStart;
        // 4 bytes picture type
        p += 4;
        // 4 bytes MIME length
        const mimeLen = (buf[p] << 24) | (buf[p + 1] << 16) | (buf[p + 2] << 8) | buf[p + 3];
        p += 4;
        let mime = '';
        for (let i = 0; i < mimeLen; i++) mime += String.fromCharCode(buf[p + i]);
        p += mimeLen;
        // 4 bytes description length
        const descLen = (buf[p] << 24) | (buf[p + 1] << 16) | (buf[p + 2] << 8) | buf[p + 3];
        p += 4 + descLen;
        // 16 bytes (width, height, depth, colors)
        p += 16;
        // 4 bytes data length
        const dataLen = (buf[p] << 24) | (buf[p + 1] << 16) | (buf[p + 2] << 8) | buf[p + 3];
        p += 4;

        if (p + dataLen <= dataEnd) {
          const imgBytes = buf.subarray(p, p + dataLen);
          const detectedMime = detectImageMime(imgBytes) || mime || 'image/jpeg';
          const b64 = uint8ArrayToBase64(imgBytes);
          result.coverUrl = `data:${detectedMime};base64,${b64}`;
        }
      } catch (err) {
        console.warn('Failed parsing FLAC picture block:', err);
      }
    }

    offset = dataEnd;
    if (isLast) break;
  }

  return result;
}

/**
 * Searches recursively for 'covr' atom in MP4/M4A.
 */
function findCovrInMp4(buf: Uint8Array): string | undefined {
  let offset = 0;
  while (offset + 8 < buf.length) {
    const size = (buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3];
    if (size <= 0 || offset + size > buf.length) break;

    const atom = String.fromCharCode(buf[offset + 4], buf[offset + 5], buf[offset + 6], buf[offset + 7]);
    if (atom === 'moov' || atom === 'udta' || atom === 'meta' || atom === 'ilst') {
      const start = atom === 'meta' ? offset + 12 : offset + 8;
      const sub = findCovrInMp4(buf.subarray(start, offset + size));
      if (sub) return sub;
    } else if (atom === 'covr') {
      let p = offset + 8;
      while (p + 8 < offset + size) {
        const subSize = (buf[p] << 24) | (buf[p + 1] << 16) | (buf[p + 2] << 8) | buf[p + 3];
        const subAtom = String.fromCharCode(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7]);
        if (subAtom === 'data' && subSize > 16) {
          // Skip header (8) + type/flags (8)
          const imgBytes = buf.subarray(p + 16, p + subSize);
          const mime = detectImageMime(imgBytes);
          return `data:${mime};base64,${uint8ArrayToBase64(imgBytes)}`;
        }
        if (subSize <= 0) break;
        p += subSize;
      }
    }

    offset += size;
  }
  return undefined;
}

/**
 * Extracts metadata and cover art from an audio file (File or Blob).
 * Reads up to 8MB of the header which covers all ID3/FLAC/M4A metadata blocks.
 */
export async function parseAudioMetadata(file: File | Blob): Promise<ParsedAudioMeta> {
  try {
    const sliceSize = Math.min(file.size, 8 * 1024 * 1024);
    const slice = file.slice(0, sliceSize);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // ID3 check ("ID3")
    if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      const version = bytes[3];
      if (version === 2) {
        return parseID3v22(bytes);
      } else if (version === 3 || version === 4) {
        return parseID3v23v24(bytes, version);
      }
    }

    // FLAC check ("fLaC")
    if (bytes.length >= 4 && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
      return parseFlacMetadata(bytes);
    }

    // MP4/M4A check
    const covrUrl = findCovrInMp4(bytes);
    if (covrUrl) {
      return { coverUrl: covrUrl };
    }
  } catch (err) {
    console.error('Error parsing audio metadata:', err);
  }

  return {};
}

/**
 * Helper to get just the cover image Data URL, or null if none found.
 */
export async function extractAudioCover(file: File | Blob): Promise<string | null> {
  const meta = await parseAudioMetadata(file);
  return meta.coverUrl || null;
}
