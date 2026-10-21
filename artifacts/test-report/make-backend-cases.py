import json, re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
out = root / 'artifacts/test-report'
cases = []

def add(suite, title, preconditions, data, steps, expected):
    source = root / f'server/tests/{suite}.test.ts'
    text = source.read_text(encoding='utf-8')
    tests = list(re.finditer(r"\bit\('([^']+)'", text))
    index = len([x for x in cases if x['suite'] == suite])
    test = tests[index]
    line = text.count('\n', 0, test.start()) + 1
    cases.append(dict(id=f'BE-{len(cases)+1:03}', suite=suite,
        module={'upgrades':'Đọc truyện, bộ sưu tập và phiên bản chương','security':'Bảo mật production','hardening':'Quyền riêng tư, phiên đăng nhập và chống lạm dụng'}[suite],
        title=title, testTitle=test.group(1), source=f'server/tests/{suite}.test.ts', sourceLine=line,
        preconditions=preconditions, testData=data, steps=steps, expected=expected))

base = ['Fixture khởi tạo MySQL tạm, Express tại 127.0.0.1 với cổng ngẫu nhiên; không gọi SMTP.', 'user 2 = reader + author, user 3 = reader; user 1 = admin seed. Truyện 1 có chương 1, 2 đã xuất bản; truyện 2 của user 3 chỉ có chương 3 nháp.']

add('upgrades','Xác thực và kiểm tra dữ liệu tiến độ đọc',base,
    'Guest; chapterId=1; scrollRatio=2; novelId=2 với chapterId=1.',
    ['GET /api/reader/progress không token.', 'PUT /api/reader/progress/1 với scrollRatio=2.', 'PUT /api/reader/progress/2 với chapterId=1, scrollRatio=0.4, paragraphIndex=2, paragraphOffset=0.5.'],
    'Lần lượt trả HTTP 401, 400 và 404; chương không thuộc truyện không được ghi tiến độ.')
add('upgrades','Lưu neo đoạn theo tài khoản và ngăn dữ liệu cũ ghi đè',base,
    'Token user 2; payload userId=3, chapterId=1, scrollRatio=0.55, paragraphIndex=22, paragraphOffset=0.3, updatedAt=t; bản cũ t−1000 ms.',
    ['PUT tiến độ truyện 1 với payload mới.', 'PUT lại với paragraphIndex=2 và updatedAt cũ hơn 1000 ms.', 'GET tiến độ lần lượt bằng token user 2 và user 3.'],
    'Lưu mới trả 200; bản cũ vẫn trả paragraphIndex=22; user 2 đọc lại offset=0.3, user 3 nhận []; userId giả trong payload không đổi chủ sở hữu.')
add('upgrades','Hoàn tất chương đúng điều kiện và cộng XP duy nhất khi đồng thời',base,
    'chapterId=1; scrollRatio=0.95; xp giả=50000; reading session được đặt đã bắt đầu 20 giây.',
    ['POST /reader/sessions và hoàn tất ngay.', 'Đặt thời điểm phiên lùi 20 giây; hoàn tất với scrollRatio=0.2.', 'Gửi đồng thời 2 yêu cầu hoàn tất với scrollRatio=0.95.', 'Đọc XP, danh sách chương hoàn tất; gọi /auth/add-xp với xp=50000.'],
    'Hoàn tất sớm trả 409; cuộn chưa đủ trả 400; hai yêu cầu hợp lệ đều 200 nhưng tổng xpAwarded=50, XP DB=50, completedChapterIds=[1]; API cộng XP cũ trả 410.')
add('upgrades','Bộ sưu tập riêng tư, công khai và quyền chủ sở hữu',base,
    'name=Để dành cuối tuần; description=Những câu chuyện yên bình; isPublic=false; coverNovelId=1.',
    ['User 2 tạo bộ sưu tập; thêm truyện 1, thử thêm truyện riêng tư 2.', 'User 3 thử sửa và xóa truyện khỏi bộ sưu tập.', 'Guest mở shareId khi riêng tư, sau bật công khai, sau chuyển riêng tư.', 'User 2 xóa bộ sưu tập.'],
    'Tạo trả 201; thêm truyện 1 trả 200, thêm truyện 2 trả 404; user 3 sửa/xóa trả 404; novelIds=[1]; link lần lượt 404/200/404, bản công khai chứa truyện 1; xóa trả 200.')
add('upgrades','Phiên bản chương: autosave, khôi phục và bảo vệ bản chưa lưu',base,
    'Chương 1, title=Bản chỉnh sửa, source=autosave, content=<p>Nội dung mới</p>; currentDraft title=Chưa bấm lưu.',
    ['User 2 lưu chỉnh sửa chương 1 hai lần cùng nội dung.', 'User 3 thử đọc versions; user 2 thử sửa chương 3.', 'Khôi phục phiên bản initial kèm currentDraft chưa lưu.', 'Đọc danh sách và xem trước phiên bản bản nháp chưa lưu.'],
    'Lưu trả 200; lần đầu có 2 phiên bản, lưu trùng vẫn 2; truy cập chéo trả 404; khôi phục 200 với status=draft và nội dung gốc Đoạn 1; có 5 phiên bản và giữ lại nội dung chưa lưu.')

add('security','Chống giả danh người yêu cầu và sửa hồ sơ chéo tài khoản',base,
    'requesterId=1 giả; userId=3; roles=[reader,admin]; displayname=hacked hoặc Updated reader.',
    ['Guest và user 2 gọi update-roles với requesterId=1.', 'User 2 sửa hồ sơ user 3, sau đó sửa hồ sơ chính mình.', 'Guest/user 2 tạo event; user 3 đăng announcement truyện 1; user 2 refresh user 3.', 'Guest đọc hồ sơ upgrade_reader.'],
    'Update roles guest 401/user 2 403; sửa chéo 403/sửa mình 200; tạo event 401/403; announcement trái quyền và refresh chéo 403; hồ sơ công khai không có email/password.')
add('security','Quyền hiện tại, admin cuối cùng và lỗi DB',base,
    'userId=99999 không tồn tại; user 3 suspended/active; gán rồi thu hồi role admin; lỗi DB mô phỏng.',
    ['Refresh tài khoản không tồn tại và tài khoản suspended.', 'Admin 1 thử tự bỏ role admin cuối cùng.', 'Gán admin cho user 3 trong DB, tạo event rồi thu hồi role và thử lại.', 'Thay query bằng hàm ném lỗi, refresh user 2 và phục hồi query.'],
    'Refresh không hợp lệ/suspended trả 403; bỏ admin cuối cùng 409; quyền gán mới có hiệu lực 200 và thu hồi có hiệu lực 403; lỗi DB trả 503.')
add('security','Ẩn bản nháp và khóa kiểm duyệt truyện',base,
    'Chương nháp 3 của user 3; truyện 1 chuyển suspended; limit=1 và limit=100000.',
    ['Guest/user 2/chủ user 3 lần lượt đọc chương 3.', 'Đọc danh sách truyện limit=1 và trang 2; thử limit=100000.', 'Đặt truyện 1 suspended; guest đọc chương 1, chủ truyện thử đổi status=active.', 'Đặt lại ongoing rồi thử tạo truyện với status=suspended; đếm bản ghi.'],
    'Chương nháp: 404/404/200; guest chỉ thấy truyện 1; chủ truyện 2 có X-Next-Page=2 và thấy truyện 2 tại trang 2; limit quá lớn 400; truyện suspended bị ẩn 404, tự mở khóa 403; tạo trạng thái cấm 403 và số truyện không tăng.')
add('security','Chống tăng lượt đọc đồng thời và giả IP',base,
    '10 POST đồng thời từ guest; X-Forwarded-For=203.0.113.123.',
    ['Đọc bộ đếm reads ban đầu của truyện 1.', 'Gửi 10 POST /novels/1/read-increment đồng thời.', 'Gửi tiếp với header X-Forwarded-For giả; kiểm tra DB.', 'Thử tăng lượt đọc truyện riêng tư 2.'],
    '10 phản hồi đều 200 nhưng chỉ 1 có cooldown=false; IP giả vẫn cooldown=true; DB tăng đúng 1; truyện riêng tư trả 404.')
add('security','Phân trang diễn đàn và gắn bình luận đúng bài',base,
    '3 forum_posts: Post 0..2; Post 2 có Root và Reply; limit=1.',
    ['Chèn 3 bài và luồng bình luận con tại bài mới nhất.', 'Guest GET /forum/posts?limit=1.', 'Guest GET trang 2 cùng limit.'],
    'Trang 1 có X-Next-Page=2, đúng 1 bài mới nhất và Reply lồng trong Root; trang 2 là bài liền trước, comments=[].')
add('security','Lọc HTML thực thi và giữ định dạng nội dung',base,
    'HTML chứa <strong>text</strong>, <script>alert(1)</script>, img onerror, link javascript:.',
    ['Admin tạo event active với HTML thử nghiệm.', 'Guest đọc event đã công bố.', 'Ghi cùng HTML vào chương 1, guest đọc chương.'],
    'Có 1 event công khai; nội dung event và chương giữ <strong>text</strong>, không chứa script/onerror/javascript:.')
add('security','OTP băm, giới hạn thử và chống sử dụng lại',base,
    'otp-test@example.test; replay@example.test; mã sai 000000 thử 5 lần; SMTP không cấu hình.',
    ['Gửi OTP và đọc devOtp cùng bản ghi DB.', 'Gửi lại ngay; thử mã sai 5 lần rồi mã đúng.', 'Phát mã mới cho replay@example.test và xác minh consume hai lần.', 'Tắt DEV_OTP, gửi OTP không SMTP, rồi khôi phục cấu hình.'],
    'Gửi đầu 200 với mã 6 số; code_hash dài 64 và khác mã rõ; gửi lại 429; 5 lần sai và mã đúng sau khóa đều false; mã mới dùng lần đầu true/lần hai false; không SMTP trả 503 và không lộ devOtp.')
add('security','Upload an toàn, giới hạn payload và CORS',base,
    'PNG 1×1 hợp lệ; type=../../escape; bytes <script>bad</script> giả PNG; displayname dài 1.100.000 ký tự; Origin=https://untrusted.example.',
    ['Upload ảnh không token, type traversal, bytes giả.', 'Upload PNG hợp lệ với type=cover; kiểm tra thư mục upload.', 'Gửi profile quá lớn; gọi novels với Origin không tin cậy.'],
    'Ba upload đầu trả 401/400/400; PNG hợp lệ 200 với URL UUID .png và đúng 1 file; payload lớn 413; Origin lạ 403; response không có X-Powered-By.')
add('security','Tin nhắn yêu cầu kết bạn, phân trang và trạng thái tài khoản',base,
    'User 2 gửi user 3; friendship accepted sau lần từ chối; 105 Message 0..104; page size=100.',
    ['Gửi tin REST và socket khi chưa kết bạn.', 'Thêm friendship accepted, gửi socket lần nữa.', 'Suspend người nhận, thử REST rồi phục hồi; chèn 105 tin.', 'Lấy trang mới nhất rồi trang before; suspend người gửi, emit kiểm tra online và chờ disconnect.'],
    'REST 403/socket success=false trước kết bạn; socket success=true sau kết bạn; người nhận suspended bị chặn 403; trang mới nhất 100 tin kết thúc Message 104, trang trước 6 tin có id nhỏ hơn; socket người gửi suspended ngắt trong 3 giây.')
add('security','Từ chối JWT secret yếu ở production',base,
    'NODE_ENV=production; JWT_SECRET=short; PUBLIC_URL/FRONTEND_URL=https://example.test.',
    ['Chạy Node child process import server/dist/config.js trong cấu hình production yếu.', 'Kiểm tra exit code và stderr.'],
    'Tiến trình thoát khác 0; stderr chứa strong JWT_SECRET, ngăn khởi động với secret yếu.')
add('security','Migration production và tài khoản DB chỉ có quyền DML',base,
    'DB/account có hậu tố hex ngẫu nhiên; JWT_SECRET 48 bytes; DB user chỉ SELECT, INSERT, UPDATE, DELETE; SMTP tắt.',
    ['Chạy migrateProduction trên DB tạm và đếm users DB mới/fixture.', 'Tạo tài khoản tạm, chỉ GRANT DML, chạy server production bằng tài khoản đó.', 'GET /healthz, kiểm tra CSP; gọi send-otp; thử CREATE TABLE bằng app DB user.', 'Dừng server và xóa account/DB tạm bằng tên đã kiểm tra.'],
    'Migration exit 0; DB production mới không seed users (0), fixture vẫn 3 users; runtime exit 0 và RESTRICTED_STARTUP_OK; /healthz 200, CSP script-src self; OTP 503 không devOtp; CREATE TABLE bị từ chối.')

add('hardening','Bảo mật đánh giá, bình luận và thông báo truyện riêng tư',base,
    'Review/comment/announcement legacy gắn novelId=2; stars=5; text=Forbidden.',
    ['Chèn dữ liệu legacy cho truyện riêng tư 2.', 'Guest/user 2/user 3 đọc reviews và comments của truyện 2.', 'Guest đọc global latest reviews/comments và announcements.', 'User 2 thử ghi review/comment cho truyện 2.'],
    'Guest/người khác đọc trả 404, chủ user 3 đọc 200; danh sách công khai không có novel 2; ghi review/comment trái quyền 404.')
add('hardening','Điều kiện đọc trước đánh giá và thưởng XP đồng thời duy nhất',base,
    'Truyện series 1 chưa đọc rồi đọc 2 chương; oneshot có 1 chương đã đọc; 4 review đồng thời stars=4.',
    ['User 2 review series khi chưa đọc, rồi sau khi ghi chapter_reads của 2 chương.', 'Tạo oneshot, chương published và chapter_reads tương ứng.', 'Gửi 4 review đồng thời; đếm XP và bản ghi; sửa review stars=5.'],
    'Series chưa đủ điều kiện đều trả 403; 4 review oneshot đều 200, XP chỉ tăng 50 và chỉ 1 review; sửa review 200 nhưng không thêm XP.')
add('hardening','Dữ liệu phản hồi sai, bình luận chéo truyện và giả người nhận',base + ['Bản ghi comment private novel 2 do test trước tạo.'],
    'stars=6 hoặc 1.5; text={} hoặc khoảng trắng; comment dài 5001; parentId từ novel 2; replyToUserId=3 giả.',
    ['Thử 5 payload review sai và 4 payload comment sai.', 'Gửi comment novel 1 với parentId từ novel 2.', 'Tạo Public root; chụp số notification user 3 rồi reply giả replyToUserId=3.', 'Report không lý do; đọc comments/0; đọc danh sách novels.'],
    'Mọi payload sai, parent chéo truyện và người nhận giả trả 400; Public root trả 200; số notification user 3 không tăng; report rỗng/comments/0 trả 400; novels vẫn 200.')
add('hardening','Chống giả thông báo hệ thống và trả lời chéo bài diễn đàn',base,
    'User 3 category=Thông báo; title={} sai kiểu; hai bài First/Second; category=announcement của admin.',
    ['User 3 tạo bài thuộc Thông báo; user 2 tạo bài title object.', 'Tạo hai bài general và comment Root của bài First.', 'Reply tại Second với parentId Root của First; reply giả người nhận user 3.', 'Admin tạo Real notice thuộc announcement.'],
    'Thông báo giả 403; title sai kiểu 400; Root 200; reply chéo bài và người nhận giả 400; thông báo admin hợp lệ 200.')
add('hardening','Quyền tác giả và không rò ảnh bìa truyện riêng tư',base,
    'User 3 chỉ reader; coverNovelId=2; legacy public shelf trỏ ảnh https://example.test/private-cover.png.',
    ['User 3 thử tạo truyện và chương mới.', 'User 2 tạo public collection với coverNovelId=2.', 'Chèn legacy public collection trỏ truyện 2 và mở shareId bằng guest.'],
    'Reader tạo truyện/chương trả 403; chọn bìa riêng tư trả 400; legacy share trả 200 nhưng cover=null, novels=[].')
add('hardening','Cookie an toàn, CSRF, logout thu hồi HTTP/socket và native token',base,
    'username=upgrade_reader; password=SecurityTestPassword123! (bcrypt cost 4); Origin=https://evil.example; X-Mugen-Client=native.',
    ['Đặt hash mật khẩu test, đăng nhập web và đọc Set-Cookie/Cache-Control.', 'Refresh bằng cookie; logout không Origin và Origin lạ.', 'Kết nối socket bằng token; logout với Origin fixture; thử token/cookie cũ.', 'Đăng nhập lại, refresh token mới; đăng nhập/refresh native.'],
    'Login 200; cookie HttpOnly, SameSite=Strict; Cache-Control no-store; refresh cookie 200; CSRF 403/403; logout đúng Origin 200 và socket ngắt trong 3 giây; token/cookie cũ 401; token mới khác token cũ và refresh 200; native login/refresh 200 và không tạo Set-Cookie.')
add('hardening','Ẩn tiêu đề và lý do gỡ qua tombstone legacy',base,
    'deleted_novels id=999999; title=Private unpublished title; reason=Private removal reason; DELETE reason={}.',
    ['Chèn tombstone với dữ liệu riêng tư.', 'Guest và admin đọc /novels/deleted/999999.', 'User 3 DELETE truyện 2 với reason object.'],
    'Guest nhận 200 nhưng title/reason khác dữ liệu riêng tư; admin đọc được title gốc; reason sai kiểu trả 400.')
add('hardening','Socket nhàn rỗi tự ngắt khi token hết hạn',base,
    'JWT user 2 expiresIn=2 giây, jwtid ngẫu nhiên.',
    ['Tạo token hạn 2 giây và kết nối socket websocket không tự reconnect.', 'Không gửi hoạt động, đợi disconnect với timeout 4 giây.'],
    'Kết nối thành công; nhận disconnect trước timeout 4 giây.')
add('hardening','Giới hạn ghi nội dung lặp theo tài khoản',base,
    'User 3; text=Rate limit fixture 0..30; tối đa 31 lần POST /comments/1.',
    ['Gửi tuần tự tối đa 31 bình luận bằng user 3.', 'Dừng khi gặp 429; xác minh các lần trước đó đều 200.'],
    'Có ít nhất một phản hồi 429 trong chuỗi; các lần trước ngưỡng trả 200.')

suite_data=[]
def read_evidence(path):
    raw = path.read_bytes()
    return raw.decode('utf-16') if raw.startswith((b'\xff\xfe', b'\xfe\xff')) else raw.decode('utf-8-sig')

for suite in ['upgrades','security','hardening']:
    log_path=out / f'evidence/backend-{suite}.log'
    raw=read_evidence(log_path) if log_path.exists() else ''
    run_path=out / f'evidence/backend-{suite}.json'
    run=json.loads(run_path.read_text(encoding='utf-8-sig')) if run_path.exists() else {}
    for case in [x for x in cases if x['suite']==suite]:
        title=re.escape(case['testTitle'])
        match=re.search(r'^\s*(not ok|ok) \d+ - '+title+r'\s*\n\s*---\s*\n\s*duration_ms: ([\d.]+)([\s\S]*?)(?:\n\s*\.\.\.)',raw,re.M)
        case['evidence']=f'artifacts/test-report/evidence/backend-{suite}.log'
        if match:
            case['durationMs']=float(match.group(2))
            case['status']='PASS' if match.group(1)=='ok' else ('BLOCKED' if 'cancelledByParent' in match.group(3) or 'hookFailed' in raw else 'FAIL')
            case['actual']='Các assertion của ca kiểm thử đều đạt trong lần chạy thực tế.' if case['status']=='PASS' else match.group(3).strip()
        else:
            case['status']='NOT_RUN'
            case['actual']='Chưa có kết quả test hoàn chỉnh trong log.'
    suite_data.append(dict(name=suite,**run))

report=dict(tester='Nguyễn Hoàng Việt', reportDate='2026-10-22', scope='Backend integration và security regression hiện có',
    environment='Windows; Node.js node:test; TypeScript build; MySQL local; Express/Socket.IO fixture cổng ngẫu nhiên.',
    safety='Mỗi suite tạo database mugenbunko_test_<16 hex> riêng; SMTP_USER và SMTP_PASS bị xóa, DEV_OTP bật; database/upload tạm được cleanup có kiểm tra tên.',
    note='Một ca trong báo cáo tương ứng một it(...) hiện có. Kết quả chỉ áp dụng cho assertion được tự động chạy; không suy ra kiểm thử UI thủ công hay production.',
    builds=[json.loads((out/'evidence/backend-build.json').read_text(encoding='utf-8-sig'))],
    suites=suite_data,summary={status:sum(x['status']==status for x in cases) for status in ['PASS','FAIL','BLOCKED','NOT_RUN']},cases=cases)
(out/'backend-cases.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report['summary'],ensure_ascii=False))
