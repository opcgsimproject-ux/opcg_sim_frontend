import { API_CONFIG } from '../api/api.config';
import { logger } from './logger';

// カードIDから画像URLを取得する統一関数
export const getCardImageUrl = (cardId: string): string => {
  if (!cardId) return '';
  return `${API_CONFIG.IMAGE_BASE_URL}/${cardId}.png`;
};

// 特定のキー（Deck, Life, Don!! Deck）用の裏面画像URL
export const getBackImageUrl = (type: 'DON' | 'MAIN' = 'MAIN'): string => {
  if (type === 'DON') return `${API_CONFIG.IMAGE_BASE_URL}/DON_back.png`;
  return `${API_CONFIG.IMAGE_BASE_URL}/OPCG_back.png`;
};

// 全カードの画像をプリフェッチ（キャッシュ）する関数
export const prefetchAllCardImages = async (cards: { uuid: string; card_id?: string }[], onProgress?: (current: number, total: number) => void) => {
  logger.log({ level: 'info', action: 'assets.prefetch_start', msg: 'Starting image prefetch', payload: { count: cards.length } });
  
  // card_idの重複を除去（同じカードが複数あっても画像は1つでいいため）
  const uniqueIds = Array.from(new Set(cards.map(c => {
    // uuidが "OP01-001-xxxx" のような形式の場合、先頭の "OP01-001" 部分をIDとして抽出する処理が必要な場合への備え
    // 現状は card_id プロパティを優先し、なければ uuid をそのまま使う（DeckBuilderの実装に合わせる）
    return c.card_id || c.uuid;
  }).filter(id => id)));

  let loaded = 0;
  const total = uniqueIds.length;

  // 並列処理数を制限しつつダウンロード（ブラウザの負荷軽減）
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (id) => {
      const url = getCardImageUrl(id);
      try {
        // fetchするだけでService Workerがキャッシュしてくれる
        await fetch(url, { mode: 'cors', cache: 'reload' }); 
      } catch (e) {
        console.warn(`Failed to fetch image for ${id}`, e);
      }
    }));
    
    loaded += batch.length;
    if (onProgress) onProgress(Math.min(loaded, total), total);
  }

  logger.log({ level: 'info', action: 'assets.prefetch_complete', msg: 'Image prefetch completed' });
};
