# Works Menu — Design by Shio

designbyshio.com のホームに埋め込む「文章内キーワード → 実績ギャラリー」のインタラクティブセクション。

文章中の「ホームページ」「ランディングページ」をクリックすると、制作実績のギャラリーが開きます。

## Based on

This is a modified version of ["Inline to Menu Link Animation"](https://github.com/codrops/InlineToMenuLink) by [Codrops](https://tympanus.net/codrops) (Manoela Ilic), released under the MIT License.

Main modifications:

- 日本語テキスト対応（1文字分割・行頭禁則・数字/英単語の非分割）
- ノービルド化（Parcel/Splitting.js/imagesloaded を除去、GSAPはCDN）
- ギャラリーを実績写真に差し替え、山型・蛇行のレイアウトを再設計
- モバイル（〜540px）用の縦スクロールギャラリーとスクロール固定UI
- Exploreボタンのカテゴリー別リンク先（`data-url`属性）

## Structure

- `src/` — 公開するサイト本体（Netlifyの Publish directory はここを指定）
- `元画像/` — 写真の原本（デプロイ・Git管理の対象外）

## License

[MIT](LICENSE) — original work © Codrops. Images © Design by Shio (portfolio works, all rights reserved).
