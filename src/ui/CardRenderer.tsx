import * as PIXI from 'pixi.js';
import { API_CONFIG } from '../api/api.config';
import type { CardInstance } from '../game/types';

// カードの見た目を作る設定
const STYLES = {
  width: 100,
  height: 140,
  radius: 8,
  border: 2,
  color: 0xFFFFFF,
  textColor: 0x000000,
  bgColor: 0x222222,
};

interface RenderOptions {
  onClick?: () => void;
  isOpponent?: boolean;
  count?: number; // デッキやトラッシュの枚数表示用
}

export const createCardContainer = (
  card: CardInstance | { name: string; card_id?: string; uuid?: string },
  width: number,
  height: number,
  options?: RenderOptions
): PIXI.Container => {
  const container = new PIXI.Container();
  
  // 背景 (枠線)
  const bg = new PIXI.Graphics();
  bg.beginFill(0xFFFFFF);
  bg.drawRoundedRect(0, 0, width, height, STYLES.radius);
  bg.endFill();
  container.addChild(bg);

  // 画像エリア (枠線を引いた内側)
  const innerMask = new PIXI.Graphics();
  innerMask.beginFill(0x000000);
  innerMask.drawRoundedRect(2, 2, width - 4, height - 4, STYLES.radius - 1);
  innerMask.endFill();
  container.addChild(innerMask);

  // 画像URLの決定ロジック
  let imageUrl = '';
  const isFaceUp = (card as any).is_face_up !== false; // デフォルトは表向きとする

  if (!isFaceUp) {
    // 裏向きの場合 (スリーブ画像など。ここでは簡易的に共通裏面)
    imageUrl = `${API_CONFIG.IMAGE_BASE_URL}/card_back.png`; 
  } else {
    // 表向きの場合
    // ★修正ポイント: uuid (ランダムID) ではなく card_id (型番) を優先する
    const cardId = (card as any).card_id || (card as any).uuid;
    
    if (cardId) {
      // "DON" や "DON!!" の表記ゆれに対応
      if (cardId.toUpperCase() === 'DON' || cardId === 'DON!!') {
         // ドンカードの画像IDが決まっている場合はそれを指定（例: "OP01-000"など）。
         // ここでは汎用的なドン画像、なければAPIサーバーの仕様に合わせる
         imageUrl = `${API_CONFIG.IMAGE_BASE_URL}/DON.png`; 
      } else {
         imageUrl = `${API_CONFIG.IMAGE_BASE_URL}/${cardId}.png`;
      }
    }
  }

  // 画像スプライトの読み込み
  if (imageUrl) {
    const sprite = PIXI.Sprite.from(imageUrl);
    sprite.width = width - 4;
    sprite.height = height - 4;
    sprite.x = 2;
    sprite.y = 2;
    sprite.mask = innerMask;
    
    // 読み込みエラー時のフォールバック (テキスト表示)
    sprite.texture.baseTexture.on('error', () => {
        // 画像がなければテキストで名前を表示
        const text = new PIXI.Text(card.name || 'Unknown', {
            fontSize: 14,
            fill: 0xFFFFFF,
            wordWrap: true,
            wordWrapWidth: width - 10,
            align: 'center'
        });
        text.anchor.set(0.5);
        text.x = width / 2;
        text.y = height / 2;
        container.addChild(text);
        container.removeChild(sprite); // エラー画像は消す
    });

    container.addChild(sprite);
  } else {
    // IDがない場合など
    const text = new PIXI.Text(card.name || '?', {
        fontSize: 14, fill: 0xFFFFFF, align: 'center'
    });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2;
    container.addChild(text);
  }

  // レスト状態の表示 (半透明の黒を重ねる、または回転させる)
  // ここでは回転は親コンポーネント(BoardSide)で制御されることが多いため、
  // 視覚効果としての「暗転」などを入れる場合はここに記述
  if ((card as any).is_rest) {
    const restFilter = new PIXI.Graphics();
    restFilter.beginFill(0x000000, 0.3); // 30%黒
    restFilter.drawRoundedRect(0, 0, width, height, STYLES.radius);
    restFilter.endFill();
    container.addChild(restFilter);
  }

  // 枚数バッジ (デッキやトラッシュ用)
  if (options?.count !== undefined && options.count > 1) {
    const badge = new PIXI.Graphics();
    badge.beginFill(0xE74C3C); // 赤
    badge.lineStyle(1, 0xFFFFFF);
    badge.drawCircle(0, 0, 12);
    badge.endFill();
    badge.x = width - 10;
    badge.y = 10;
    
    const countText = new PIXI.Text(options.count.toString(), {
        fontSize: 12,
        fill: 0xFFFFFF,
        fontWeight: 'bold'
    });
    countText.anchor.set(0.5);
    countText.x = 0;
    countText.y = 0;
    
    badge.addChild(countText);
    container.addChild(badge);
  }

  // インタラクション設定
  container.eventMode = 'static';
  container.cursor = 'pointer';
  
  // レスト状態による回転（90度）
  if ((card as any).is_rest) {
      // 90度回転させる場合、中心点を基準に回す必要がある
      container.pivot.set(width / 2, height / 2);
      container.rotation = Math.PI / 2;
      // 回転後の位置ズレ補正は配置側(BoardSide)で行うのが一般的だが、
      // ここで pivot を設定したので配置側で x, y に width/2, height/2 を足す必要があるかもしれない。
      // もし BoardSide.tsx で width/height を入れ替えて配置しているなら、ここでは回転させない方が良い。
      // 現状の BoardSide.tsx は回転させていないようなので、ここで回転を適用するか、
      // 以前の挙動に戻すなら rotation は削除してください。
      
      // ★今回のBoardSide実装に合わせるため、回転はコメントアウトし、
      // 代わりに「レスト」表示は上記の色変え等で表現するか、BoardSide側で制御します。
      // container.rotation = Math.PI / 2; 
  }

  return container;
};
