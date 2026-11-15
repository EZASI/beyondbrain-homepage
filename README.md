# BeyondBrain — 3Dバーチャルショールームのコーポレートサイト

株式会社BeyondBrainのコーポレートホームページです。八角形のショールームの壁ごとに事業を一つずつ展示し、下部のナビゲーションで壁から壁へカメラが移動します。展示物を選ぶと手前に取り出され、説明カードと問い合わせリストへの追加ボタンが出ます。

## 起動

```bash
npm install
npm run dev
```

## 本番ビルド

```bash
npm run build
npm run preview
```

## 主な実装

- React + TypeScript + Vite
- Three.jsによる手続き生成のショールーム（部屋、什器、23点の展示物、キャンバス描画のテクスチャ）。外部の3Dモデルや画像は使っていません
- 壁ごとのカメラ位置は画面の縦横比から計算。縦長の画面では什器を2列に組み替えます
- 描画は動きがあるときだけ行い、影も光源が動いたときだけ更新します
- 問い合わせリストはブラウザ内に保存し、メール本文（`mailto:`）またはコピーで送れます
- `#fa-parts` などのハッシュで各壁に直接リンクできます（旧サイトの `#about` `#company` `#contact` は会社情報シートを開きます）
- WebGL2が使えない環境では、同じ内容の通常ページを表示します
- キーボード操作（←→で移動、Escで閉じる）、スワイプ、`prefers-reduced-motion`への対応
- Google Fontsの日本語・英語フォント（OFLライセンスは`public/fonts/`に同梱）

## 構成

- `src/showroom/content.ts` — 事業・展示物・会社情報の文言。内容の変更はここだけで足ります
- `src/showroom/ShowroomScene.ts` — 3Dシーン、カメラ移動、展示物の選択、描画
- `src/showroom/fixtures.ts` / `items.ts` — 什器と展示物の形
- `src/showroom/kit.ts` / `parts.ts` — マテリアル、テクスチャ、形状の組み立て
- `src/components/Showroom.tsx` — ナビゲーション、カード、問い合わせリスト、会社情報シート
- `src/showroom.css` / `src/index.css` — スタイル
- `public/` — ロゴ、favicon、フォントライセンス

## 展示物を増やす

1. `content.ts` の該当事業の `items` に項目を追加する
2. `items.ts` の `builders` に `事業ID/項目ID` のキーで形を追加する（未登録の項目は仮の箱で表示されます）
