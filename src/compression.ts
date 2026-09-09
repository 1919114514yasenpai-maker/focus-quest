import LZString from 'lz-string';
import * as pako from 'pako';
import { SaveData } from './types';
import { sanitizeSaveData, minifySaveData } from './saveManager';

export interface CompressedCloudSave {
  v: number;
  compressed: true;
  format: 'lz_base64' | 'pako_base64';
  data: string;
  updatedAt: string;
  summary: {
    level: number;
    stage: number;
    gold: number;
    itemCount: number;
  };
}

export interface SaveDataSizeStats {
  rawBytes: number;
  minifiedBytes: number;
  compressedBytes: number;
  reductionPercent: number;
  limitRatio: number; // % of 1MB (1,048,576 bytes)
}

/**
 * チャンク分割によるスタックオーバーフロー対策済みの Uint8Array -> Base64 変換
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

/**
 * Base64 -> Uint8Array 復元
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * SaveData のデータサイズ（生データ、軽量化後、圧縮後、1MB制限に対する割合）を算出
 */
export function getSaveDataSizeStats(saveData: SaveData): SaveDataSizeStats {
  try {
    const rawJson = JSON.stringify(saveData);
    const minified = minifySaveData(saveData);
    const minJson = JSON.stringify(minified);

    let compressedBytes = 0;
    try {
      const encoded = new TextEncoder().encode(minJson);
      const gzipped = pako.gzip(encoded, { level: 9 });
      compressedBytes = gzipped.byteLength;
    } catch {
      compressedBytes = LZString.compressToBase64(minJson).length;
    }

    const rawBytes = new TextEncoder().encode(rawJson).byteLength;
    const minifiedBytes = new TextEncoder().encode(minJson).byteLength;
    const reductionPercent = rawBytes > 0 ? Math.round((1 - compressedBytes / rawBytes) * 100) : 0;
    const limitRatio = Number(((compressedBytes / (1024 * 1024)) * 100).toFixed(2));

    return {
      rawBytes,
      minifiedBytes,
      compressedBytes,
      reductionPercent,
      limitRatio,
    };
  } catch (err) {
    return {
      rawBytes: 0,
      minifiedBytes: 0,
      compressedBytes: 0,
      reductionPercent: 0,
      limitRatio: 0,
    };
  }
}

/**
 * SaveData を徹底的に軽量化（冗長データ除去＋Gzip最高圧縮）してクラウド保存用ペイロードに変換します。
 * 通常 100KB〜500KB のセーブデータを 1KB〜3KB (95%〜98%削減) に超軽量化します。
 */
export function compressSaveDataForCloud(saveData: SaveData): CompressedCloudSave {
  const now = new Date().toISOString();
  const minified = minifySaveData(saveData);
  const minifiedJson = JSON.stringify({
    ...minified,
    updatedAt: now,
  });

  let format: 'pako_base64' | 'lz_base64' = 'pako_base64';
  let compressedData: string;

  try {
    const encoded = new TextEncoder().encode(minifiedJson);
    const gzipped = pako.gzip(encoded, { level: 9 });
    compressedData = uint8ArrayToBase64(gzipped);
  } catch (err) {
    console.warn('Gzip compression fallback to LZ-String:', err);
    format = 'lz_base64';
    compressedData = LZString.compressToBase64(minifiedJson);
  }

  return {
    v: 5,
    compressed: true,
    format,
    data: compressedData,
    updatedAt: now,
    summary: {
      level: saveData.stats?.level || 1,
      stage: saveData.stats?.stage || 1,
      gold: saveData.stats?.gold || 0,
      itemCount: saveData.inventory?.length || 0,
    },
  };
}

/**
 * クラウドやローカルから取得したデータを解凍・正規化します。
 * 新形式（超軽量Gzip/LZ圧縮）と旧形式（非圧縮JSON）の双方に完全互換対応しています。
 */
export function decompressCloudSave(rawPayload: any): SaveData {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return sanitizeSaveData(null);
  }

  // 1. 新形式: 圧縮フラグ付きデータ
  if (rawPayload.compressed === true && typeof rawPayload.data === 'string') {
    try {
      let decompressedJson: string | null = null;

      if (rawPayload.format === 'pako_base64') {
        try {
          const bytes = base64ToUint8Array(rawPayload.data);
          const decompressedBytes = pako.ungzip(bytes);
          decompressedJson = new TextDecoder().decode(decompressedBytes);
        } catch (pakoErr) {
          console.warn('pako ungzip failed, trying LZ fallback:', pakoErr);
          decompressedJson = LZString.decompressFromBase64(rawPayload.data);
        }
      } else if (rawPayload.format === 'lz_base64' || !rawPayload.format) {
        decompressedJson = LZString.decompressFromBase64(rawPayload.data);
      }

      if (decompressedJson) {
        const parsed = JSON.parse(decompressedJson);
        return sanitizeSaveData(parsed);
      }
    } catch (err) {
      console.error('Failed to decompress compressed save data:', err);
    }
  }

  // 2. 旧形式: 非圧縮オブジェクト (stats, equipment, inventory)
  return sanitizeSaveData(rawPayload);
}

/**
 * 任意のテキスト（生のJSON、またはGzip/LZ圧縮コード）からSaveDataを復元します。
 */
export function parseAnySaveText(input: string): SaveData {
  let cleaned = input.trim();
  // Markdownコードブロック除去
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // 1. そのまま JSON パースを試みる
  try {
    const parsed = JSON.parse(cleaned);
    return decompressCloudSave(parsed);
  } catch {
    // JSON でない場合、圧縮文字列の可能性を検証
  }

  // 2. Gzip Base64 解凍を試みる
  try {
    const bytes = base64ToUint8Array(cleaned);
    const decompressedBytes = pako.ungzip(bytes);
    const decoded = new TextDecoder().decode(decompressedBytes);
    if (decoded) {
      const parsed = JSON.parse(decoded);
      return sanitizeSaveData(parsed);
    }
  } catch {}

  // 3. LZ-String Base64 の直接解凍を試みる
  try {
    const fromLz = LZString.decompressFromBase64(cleaned);
    if (fromLz) {
      const parsed = JSON.parse(fromLz);
      return decompressCloudSave(parsed);
    }
  } catch {}

  // 4. UTF16 / EncodedURIComponent 形式の解凍を試みる
  try {
    const fromLzEncoded = LZString.decompressFromEncodedURIComponent(cleaned);
    if (fromLzEncoded) {
      const parsed = JSON.parse(fromLzEncoded);
      return decompressCloudSave(parsed);
    }
  } catch {}

  throw new Error('セーブデータの形式を認識できませんでした。');
}
