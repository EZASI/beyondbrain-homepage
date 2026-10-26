# BeyondBrain — 和×近未来の3Dコーポレートサイト

株式会社BeyondBrainのコーポレートホームページです。会社情報、5つの事業領域、お問い合わせ導線を、スクロール連動の3Dニューラルコアと和の幾何学で構成しています。

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
- Three.jsによる手続き生成の脳型オブジェクト、組子文様、パーティクル、金属質感
- GSAPによるスクロール連動とページ内ナビゲーション
- 3D読み込み中・非対応時の静的フォールバック
- キーボード操作、モバイルメニュー、`prefers-reduced-motion`への対応
- Google Fontsの日本語・英語フォント（OFLライセンスは`public/fonts/`に同梱）

## 構成

- `src/pages/Home.tsx` — ページコンテンツとナビゲーション
- `src/components/NeuralCanvas.tsx` — 3Dの読み込み、操作、スクロール連携
- `src/three/NeuralScene.ts` — 3Dシーン、アニメーション、描画最適化
- `src/App.css` / `src/index.css` — デザイントークンとレスポンシブスタイル
- `public/` — ロゴ、 favicon、フォント
