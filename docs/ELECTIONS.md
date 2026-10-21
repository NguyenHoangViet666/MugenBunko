# Bầu chọn và bổ nhiệm kiểm duyệt viên

Trang web công khai: `#/elections`, liên kết từng kỳ: `#/elections/:id`.
Admin: Trang quản trị → Bầu chọn mod. Mod: Bảng kiểm duyệt → Hội đồng bầu chọn.
Mobile: Cá nhân → Bầu chọn kiểm duyệt viên, hoặc Quản trị / kiểm duyệt → Bầu chọn & hội đồng mod.

## Quy trình

1. Admin tạo bản nháp, cấu hình thể lệ, số ghế và hai thời hạn. Chỉ bản nháp được sửa thể lệ.
2. Admin mở ứng cử. Thành viên tự nộp hồ sơ hoặc đề cử tài khoản khác. Người được đề cử phải tự đồng ý và hoàn thiện hồ sơ. Lời mời chưa đồng ý chỉ người được mời và nhân sự thấy.
3. Admin kiểm tra hồ sơ, ghi nhận xét và xác nhận đủ/chưa đủ điều kiện. Hồ sơ sửa lại cần được kiểm tra lại. Sau hạn ứng cử, admin mở bỏ phiếu khi không còn hồ sơ đã nộp chưa được kiểm tra.
4. Danh sách cử tri và hội đồng được chốt lúc mở phiếu. Cộng đồng chọn tối đa số lựa chọn được cấu hình; phiếu có thể sửa hoặc xóa toàn bộ trước hạn. Mod đánh giá riêng: đạt/chưa đạt/không tham gia, ba tiêu chí và nhận xét. Admin không mặc nhiên có lá phiếu hội đồng; phải là mod trong danh sách chốt và còn quyền mod hiện hành. Không tự bầu/tự đánh giá.
5. Hết hạn, API từ chối nhận phiếu dù admin chưa chốt. Admin chốt kết quả; hệ thống đối soát trạng thái tài khoản, quyền mod hiện hành, email và trạng thái ứng viên, rồi lưu snapshot cố định. Tài khoản bị khóa khi chốt có phiếu bị loại; ứng viên rút không còn trong bảng xếp hạng.
6. Admin xem hai luồng phiếu riêng, xử lý khiếu nại và chọn bổ nhiệm/không bổ nhiệm/yêu cầu bổ sung. Bổ sung nằm riêng, không ghi đè hồ sơ mà cử tri đã đọc. Quyết định cuối không được ghi đè bằng thao tác gửi lặp.
7. Bổ nhiệm cấp quyền mod ngay và bắt đầu thử việc/nhiệm kỳ. Nếu không đạt ngưỡng đề xuất hoặc xếp sau số ghế, bắt buộc thêm giải trình tối thiểu 30 ký tự. Admin vẫn không thể vượt số ghế, tự bổ nhiệm, bổ nhiệm tài khoản khóa hay hồ sơ không đủ điều kiện.
8. Công bố sau khi tất cả hồ sơ đã có quyết định cuối và không còn khiếu nại mở. Người dùng thấy bảng kết quả, quyết định và lý do công khai. Admin có thể công bố không bổ nhiệm ai.
9. Sau thời gian thử việc, admin xác nhận hoàn tất hoặc kết thúc nhiệm kỳ có lý do. Hết nhiệm kỳ, quyền mod bị vô hiệu ngay khi xác thực và được dọn bởi scheduler. Bỏ quyền mod bằng công cụ phân quyền cũ cũng kết thúc nhiệm kỳ và ghi nhật ký.

Các giai đoạn là thao tác chủ động của admin; thời hạn được backend kiểm tra. Hệ thống không tự rút ngắn thời gian ứng cử/bỏ phiếu. Có thể hủy trước khi bổ nhiệm ai; lý do hủy công khai. Kỳ không có ứng viên vẫn có thể hoàn tất và công bố.

## Thể lệ mặc định

| Điều kiện                        | Mặc định      |
| -------------------------------- | ------------- |
| Số ghế / lựa chọn                | 2 / 2         |
| Tuổi tài khoản cử tri / ứng viên | 7 / 30 ngày   |
| Email đã xác thực                | Bắt buộc      |
| Phiếu cộng đồng tối thiểu        | 3             |
| Số mod đánh giá tối thiểu        | 2             |
| Tỷ lệ mod đồng ý                 | 60%           |
| Thử việc / nhiệm kỳ              | 14 / 180 ngày |

Đây là mặc định có thể cấu hình trên bản nháp, không phải điều kiện cố định của sản phẩm. Phiếu không tham gia đánh giá không tính vào mẫu số hoặc quorum; 1 đồng ý/1 tham gia không đủ nếu thể lệ yêu cầu 2 người. Thứ hạng cộng đồng giữ đồng hạng khi bằng phiếu; admin quyết định với lý do. Không có hội đồng đủ số người thì hồ sơ chưa đạt ngưỡng đề xuất, admin chỉ có thể bổ nhiệm bằng giải trình ngoại lệ rõ ràng.

## Dữ liệu và tính toàn vẹn

Migration cộng thêm trong `server/electionSchema.ts`: elections, election_candidates, election_voters, election_ballots, election_reviews, election_complaints, election_audit. Không seed kỳ tuyển hoặc cấp quyền cho tài khoản thật.

Mỗi write khóa dòng kỳ bầu chọn trong transaction, nên lưu phiếu, đóng kỳ và quyết định không thể xen nhau làm sai snapshot hoặc vượt số ghế. Khóa duy nhất chặn phiếu trùng. Cấp quyền, quyết định, nhật ký và thông báo cùng transaction. Thao tác bổ nhiệm khóa cả tài khoản để phối hợp với phân quyền thủ công và các kỳ khác.

Thời gian lưu bằng UTC epoch milliseconds, giao diện hiển thị theo múi giờ thiết bị. Quyền mod được kiểm tra từ database ở từng request, gồm cả hạn nhiệm kỳ. Scheduler xử lý hết hạn khi khởi động và mỗi 30 giây; chạy lặp không tạo lại thông báo hết hạn.

Kết quả đang mở bỏ phiếu không trả về cho cộng đồng/mod. Trong giai đoạn admin xét, kết quả chốt chỉ nhân sự thấy. Sau công bố trả kết quả tổng hợp, không trả danh tính cử tri. Admin được kiểm tra nhật ký thao tác gồm chủ thể phiếu; vì vậy đây là phiếu kín với cộng đồng, không phải hệ thống bỏ phiếu ẩn danh với quản trị viên.

Nhận xét chi tiết của hội đồng chỉ người viết và admin thấy. Ghi chú/giải trình nội bộ của admin chỉ admin thấy. Người gửi và admin thấy khiếu nại; chỉ chủ hồ sơ/nhân sự thấy giải trình bổ sung và nhận xét kiểm tra chưa công khai. Snapshot không bị tính lại khi tài khoản đổi trạng thái sau khi chốt.

Phạm vi chống gian lận hiện gồm danh sách đủ điều kiện, email/tuổi tài khoản, quyền hiện hành, chống tự bầu, ràng buộc phiếu, đối soát và khiếu nại. Một tài khoản không chứng minh một con người duy nhất; hệ thống chưa triển khai nhận diện đa tài khoản bằng đồ thị/thiết bị hoặc kiểm chứng danh tính ngoài nền tảng.

## Migration và vận hành

Development tự tạo bảng còn thiếu lúc backend khởi động. Với production, chạy migration bằng tài khoản quản trị DB trước khi chạy bản server mới, theo hướng dẫn production hiện có:

```sh
npm --prefix server run build
npm --prefix server run migrate:production
```

Production chỉ kiểm tra schema, không tự tạo bảng. Không import lại `server/schema.sql` vào database đang có dữ liệu vì file đó chứa seed/reset development.

## Kiểm tra

```sh
npm run typecheck
npm run lint
npm --prefix mobile run typecheck
npm run test:elections
npm run test:elections:browser
npm run test:elections:mobile
```

Test integration/browser dùng DB MySQL tạm `mugenbunko_test_*`, tắt SMTP và tự dọn dữ liệu; tài khoản DB test cần quyền tạo/xóa database. Browser dùng Edge headless hoặc `UPGRADE_BROWSER_PATH`. Ảnh kiểm tra ở `artifacts/elections/` (Git ignore). Mobile browser export Expo với API URL của fixture và cache sạch, sau đó kiểm tra UI; kết quả không thay thế thử nghiệm Android/iOS trên thiết bị thật.

`shared/elections.ts` là hợp đồng/nhãn thuần TypeScript dùng cho hai frontend. Metro chỉ thêm thư mục shared vào watchFolders, giữ cấu hình Expo mặc định và hai hệ React riêng.
