# 期中考複習關卡 v2｜Firebase＋教師端版

## 網頁
- 學生端：`index.html`
- 教師端：`teacher.html`

## 學生端
- 4 個複習站、40 題
- 每題立即顯示正確答案與解析
- 每站先做 10 題，答錯後只重練錯題
- 一直重練到 10/10 全對才解鎖下一站
- 使用「班級＋座號＋學習密碼」登入
- 沿用既有 Python 學習帳號識別；以前建立過 Python 帳號，可使用同一組密碼
- 期中複習資料寫入 Firestore：`midtermStudents/{uid}`

## 教師端
- 沿用既有 `teachers/{teacherUid}` 教師帳號與班級授權
- 查看 R1～R4 完成情形
- 查看第一輪答對題數、重練輪數、累計錯題與弱點主題
- 班級篩選
- 匯出 Excel
- 重設學生「期中複習」進度
- 刪除學生「期中複習紀錄」
- 刪除紀錄不會刪除 Firebase Authentication 帳號

## 必做：更新 Firestore Rules
本 ZIP 內含 `firestore.rules`。它保留原本 `students` / `teachers` 規則，並新增 `midtermStudents`。

若未更新 Rules，學生可能無法上傳期中複習進度，教師端也無法讀取資料。

## GitHub Pages
將本 ZIP 解壓後所有檔案上傳至獨立 repository，例如：

`midterm-review`

Pages 設定：
- Source: Deploy from a branch
- Branch: main
- Folder: /(root)

學生網址：
`https://teacheryimei.github.io/midterm-review/`

教師網址：
`https://teacheryimei.github.io/midterm-review/teacher.html`
