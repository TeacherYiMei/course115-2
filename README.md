# 期中考複習關卡｜獨立網站

這是一個完全獨立的 GitHub Pages 網站，不依賴 course-116。

## 功能
- 4 個複習站，共 40 題
- 每題立即顯示正確答案與解析
- 每站第一輪做 10 題
- 答錯後只重練錯題
- 一直重練到 10/10 全對才解鎖下一站
- 四站完成後開啟複習寶箱
- 班級、座號、姓名及複習進度儲存在瀏覽器 localStorage

## GitHub Pages
建立新的 repository，例如：

`midterm-review`

將本 ZIP 解壓後的檔案全部上傳到 repository 根目錄：

- index.html
- review.css
- review.js
- README.md

再到 Settings → Pages：
- Source: Deploy from a branch
- Branch: main
- Folder: /(root)

之後網址會類似：

`https://你的帳號.github.io/midterm-review/`
