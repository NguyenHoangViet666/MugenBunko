# Expo / React Native

Chỉ đọc khi task liên quan `mobile/` hoặc cần đồng bộ trải nghiệm giữa hai frontend. Snapshot 2026-10-21; xác minh package và code hiện tại.

## Kiến trúc và theme

Mobile là ứng dụng Expo Router/React Native riêng. Dùng native primitives, `StyleSheet`, platform file và route hiện có. `mobile/tsconfig.json` khai báo alias `@/*` tới `mobile/src/*` rồi `mobile/*`.

Palette nguồn: `mobile/constants/Colors.ts`; truy cập qua `useColorScheme()` hoặc `usePalette()` sẵn có.

| Vai trò | Light | Dark |
| --- | --- | --- |
| Background | `#FAF8F5` | `#121214` |
| Text | `#2A2E30` | `#E2E2E7` |
| Border | `#EAE5DC` | `#2E2E33` |
| Card | `#FFFFFF` | `#1C1C1F` |
| Sakura accent | `#E05275` | `#E05275` |

`PreferencesContext.tsx` hỗ trợ global `system/light/dark`, lưu ở `mugen_appearance`. Dù Colors có record sepia, đây chưa phải lựa chọn appearance toàn app. Reader có theme riêng bên dưới.

## Tái sử dụng thành phần native

- `mobile/src/components/common/Screen.tsx`: `Screen`, `Sheet`, `Card`, `Label`, `Button`, `Field`, `Row`, `ErrorNotice`, `useTask`, `useResource`. Có safe area, keyboard avoidance, refresh/error và khóa submit; đọc props/export trước khi dùng.
- Baseline hiện có: button min-height 44, field min-height 48/font 16, radius 8 cho input/button, radius 12 cho card, padding/gap 16. Không suy ra mọi icon action hiện đã có target đủ lớn.
- `HeaderBar.tsx`: dấu `無限`, MUGENBUNKO, chấm Sakura, border mảnh, optional back/search. `MonochromeIcon.tsx` là hệ SVG icon hiện có, stroke tròn 2px.
- `NovelCard`, `NovelSlider`, `QuickResumeCard`: giữ bìa tỷ lệ `1 / 1.42`, title hai dòng, author một dòng, layout dọc/ngang và CTA resume. Dùng `resolveCoverUrl` cho URL cover upload.
- Home có featured showcase tối và các khối discovery dày hơn; đây là composition riêng của Home, không bắt mọi màn hình thêm glass/bento/hero.

## Điều hướng và responsive

Giữ năm tab: Trang chủ / Khám phá / Tủ sách / Diễn đàn / Cá nhân. Tab bar dùng safe-area bottom và ẩn khi bàn phím mở; root `mobile/app/_layout.tsx` có auth gate bắt buộc. Không giả định mobile đang hỗ trợ guest giống web.

`mobile/app/(tabs)/explore.tsx` có precedent `useWindowDimensions`, grid 2–4 cột với outer padding 32px và gap 12px, FlatList. Tính lại chiều rộng khi xoay/resize; tránh lấy `Dimensions.get` một lần cho grid mới. Giữ scroll/virtualization, nút dễ chạm và input không bị keyboard che. Kiểm tra phone 320/390 và tablet 768px khi liên quan layout.

## Reader và editor

Reader: `mobile/app/reader/[novelId]/[chapterIndex].tsx`. Theme riêng gồm `washi/charcoal/sepia/white`; cỡ chữ 14–30, mặc định 18; serif/sans; line spacing 1.25–2.5, mặc định 1.75. Giữ các preference đang lưu.

Tái sử dụng `RichContent` và callback layout theo block, vì paragraph index/offset dùng để restore. Giữ persistence khi AppState đổi/unmount cùng completion/session logic; kiểm tra quay lại từ background và đổi thiết bị thay vì chỉ đọc screenshot.

`RichEditor.tsx` dùng WebView; `RichEditor.web.tsx` dùng iframe sandbox, chia sẻ `editorDocument`. Không gộp chúng thành một implementation DOM-only. `ImageUpload` đã có chọn ảnh, nén, preview, tiến độ/lỗi; tái sử dụng trước khi tạo flow upload khác.

## Kiểm tra phù hợp

Đọc scripts trong `mobile/package.json`, thường dùng:

```powershell
npm --prefix mobile run typecheck
npm --prefix mobile run export:web
```

Nếu đổi navigation hoặc luồng chính và môi trường MySQL fixture sẵn sàng: `npm run test:mobile:browser`. Test hiện có kiểm tra profile, collections, Studio draft, forum, chat, moderation, reader sync/restore, overflow 320/390/768 và runtime exceptions; ảnh ghi vào `artifacts/mobile/`.

Expo web export/browser smoke không chứng minh hành vi Android/iOS. Với thay đổi keyboard, image picker, editor, gesture hoặc AppState, kiểm tra thiết bị/emulator phù hợp nếu có; báo rõ khi chưa kiểm tra native.
