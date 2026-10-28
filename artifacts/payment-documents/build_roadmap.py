"""Build the five calendar month technical roadmap using the document set style."""
from datetime import date, timedelta
from pathlib import Path
import json
import sys

from PIL import Image, ImageDraw, ImageFont
import build_documents as builder

sys.stdout.reconfigure(encoding='utf-8')
START=date(2026,10,28)
DEADLINE=date(2027,3,28)
ROOT=Path(__file__).resolve().parents[2]
QA=ROOT/'.cache/payment-roadmap-qa'
builder.QA=QA
FILENAME='10_Roadmap_5_thang_28-10-2026_den_28-03-2027.docx'

WEEKS=[
('Khởi động và baseline', 'Commit kế hoạch; kiểm kê writer coins; chốt DTO và giới hạn; gửi đăng ký merchant sandbox.', 'Baseline Git và checklist merchant; chưa thay số dư đang có.',8),
('Schema và startup', 'DB01: thêm bảng gói, đơn, ledger, events, audit; tích hợp migration và kiểm tra startup.', 'DB mới tạo đúng bảng và thiếu schema được phát hiện trước khi phục vụ.',10),
('Migration dữ liệu cũ', 'DB02: opening balance theo batch; giữ coins cũ; chuẩn hóa mặc định đăng ký; cập nhật seed.', 'Chạy migration hai lần không tăng số dư hoặc nhân đôi opening entry.',12),
('Ràng buộc và nghiệm thu DB', 'DB03: unique, FK, CHECK, UTC; kiểm tra ledger và index cho lịch sử/worker.', 'M1 đạt: coins khớp ledger cho từng user; có test DB legacy và DB mới.',10),
('Tạo đơn và idempotency', 'BE01: danh mục gói, snapshot đơn, fingerprint, key theo user và hạn mức.', 'Retry/concurrent cùng key chỉ có một order; thay payload trả conflict.',10),
('Transaction cấp xu', 'BE02: verified result, khóa order rồi user, ledger và coins cùng commit.', 'Callback lặp và rollback có chủ đích không cấp xu hai lần.',12),
('API đọc và quyền quản trị', 'BE03 và phần đọc BE04: wallet, entries, history, DTO; admin list/summary; chốt contract reconcile.', 'M2 đạt: backend lõi chạy với provider test; quyền đọc và phân trang đạt.',10),
('Adapter VNPAY', 'VN01 và VN02: cấu hình sandbox, ký checkout, test vector, IPN và middleware.', 'Tạo được checkout sandbox và từ chối hash hoặc số tiền sai.',10),
('Return và query', 'VN03 và VN04: return theo destination cho phép; query có xác minh riêng.', 'Return không cấp xu; query chuẩn hóa được kết quả của đơn đã lưu.',10),
('Worker claim và lease', 'RC01: claim batch, lease DB, timeout, crash recovery và không giữ lock khi gọi cổng.', 'Hai worker không cấp trùng; hết lease cho phép tiếp tục công việc.',10),
('Đối soát và phục hồi', 'RC02, hoàn tất endpoint reconcile BE04 rồi RC03: backoff, late paid, mâu thuẫn, needs_review và audit.', 'M3 đạt: sandbox cấp xu qua IPN; thiếu IPN phục hồi được qua query.',10),
('Ví trên web', 'WEB01 và WEB02: hash route, auth return, packages, balance và lịch sử.', 'Đi từ chọn gói tới checkout bằng API; giữ intent/key khi mất response.',10),
('Kết quả và admin web', 'WEB03 và WEB04: polling có giới hạn, các trạng thái, filter và request reconcile.', 'M4 đạt: web đi hết luồng và admin tra cứu được; không báo thành công giả.',10),
('Ví trên Expo', 'MOB01: API service, types, màn hình ví và điểm vào Cá nhân.', 'Mobile đọc cùng số dư và đơn với web; chưa cần thêm cơ chế auth mới.',8),
('Native checkout và return', 'MOB02: browser hệ thống, scheme, warm/cold deep link và đường quay về dự phòng.', 'Có bằng chứng trên Android/emulator; browser đóng không suy thành công.',8),
('Đồng bộ và native smoke', 'MOB03: foreground refresh, mất mạng, token hết hạn, đổi tài khoản và cleanup listener.', 'M5 đạt: app trở lại đọc đúng kết quả; ghi rõ platform đã xác minh.',8),
('Hoàn thiện chức năng và đệm', 'Khép lỗi tích hợp web/mobile/admin; rà contract; kiểm tra needs_review và feature flag.', '23/02 khóa phạm vi: đủ chức năng P0, phần chưa xong vào danh sách xử lý.',6),
('Regression dữ liệu và bảo mật', 'QA cùng SEC01: migration lặp, concurrent, rollback, IDOR, CSRF và callback rác.', 'Các ca dữ liệu/quyền trọng yếu đạt; lỗi chặn phát hành có người xử lý và hạn.',10),
('Regression giao diện và code freeze', 'QA web/native: back/forward, deep link, mất mạng; đóng lỗi tích hợp còn lại.', '09/03 code freeze: không còn lỗi thu tiền/cấp xu hoặc lộ dữ liệu chưa xử lý.',10),
('Staging và vận hành', 'SEC02 và SEC03: HTTPS proxy, secret, metrics, migration, restore và rollback rehearsal.', 'M6 đạt: staging đi hết luồng, restore/rollback có bằng chứng.',10),
('Release candidate và bàn giao thử', 'Chốt runbook, config example, bằng chứng 32 ca, hướng dẫn tái hiện và technical walkthrough.', '23/03 có RC1 kèm báo cáo ca đạt/chưa đạt và giới hạn đã biết.',10),
('Đệm cuối và bàn giao', 'Chỉ sửa lỗi hồi quy quan trọng, smoke lại và gắn tag bàn giao; kiểm tra file nguồn/tài liệu.', 'M7: bàn giao trước hoặc trong ngày 28/03/2027; không mở thêm tính năng.',4),
]


def roadmap_figure():
    folder=QA/'figures'; folder.mkdir(parents=True,exist_ok=True)
    image=Image.new('RGB',(1900,1050),'white'); d=ImageDraw.Draw(image)
    def font(size,bold=False):
        return ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',size)
    left=530; step=250; top=175; row_h=105
    d.text((45,32),'ROADMAP KỸ THUẬT THANH TOÁN MUGENBUNKO',font=font(41,True),fill='black')
    d.text((45,94),'28/10/2026 đến 28/03/2027   |   Phạm vi P0 Sandbox',font=font(30),fill='black')
    for i,title in enumerate(['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5']):
        x=left+i*step
        d.rectangle((x,top,x+step-8,top+65),fill='#E9EEF3')
        d.text((x+(step-8)/2,top+32),title,font=font(33,True),anchor='mm',fill='black')
        d.line((x,top+72,x,top+row_h*7+75),fill='#D9D9D9',width=2)
    items=[
        ('Schema và migration',[(0,0,'#344256')]),
        ('Backend và sổ giao dịch',[(0,0,'#DDE4EC'),(1,1,'#344256')]),
        ('VNPAY và đối soát',[(1,2,'#344256')]),
        ('Web và admin',[(2,2,'#344256')]),
        ('Expo mobile',[(3,3,'#344256')]),
        ('Regression và staging',[(3,3,'#DDE4EC'),(4,4,'#344256')]),
        ('Tài liệu và bàn giao',[(0,3,'#DDE4EC'),(4,4,'#344256')]),
    ]
    for i,(title,bars) in enumerate(items):
        y=top+90+i*row_h
        d.text((45,y+26),title,font=font(31),fill='black',anchor='lm')
        for first,last,color in bars:
            d.rounded_rectangle((left+first*step+12,y,left+(last+1)*step-22,y+53),radius=8,fill=color)
    d.rectangle((45,992,78,1023),fill='#344256')
    d.text((94,1005),'Khối lượng chính',font=font(26),fill='black',anchor='lm')
    d.rectangle((445,992,478,1023),fill='#DDE4EC')
    d.text((494,1005),'Chuẩn bị hỗ trợ hoặc đệm',font=font(26),fill='black',anchor='lm')
    image.save(folder/'roadmap.png')


def main():
    QA.mkdir(parents=True,exist_ok=True)
    roadmap_figure()
    spec={
        'number':10,'date':'28/10/2026','filename':FILENAME,
        'title':'Roadmap kỹ thuật thanh toán MugenBunko trong 5 tháng',
        'intro':'Hoàn thành nền tảng thanh toán sandbox trên web, Expo mobile và admin trước ngày 28/03/2027. Lộ trình đi từ database và sổ giao dịch đến backend, VNPAY, đối soát, giao diện, rồi dành tháng cuối cho regression, staging và bàn giao kỹ thuật.',
        'sources':[],'reference_in_intro':True,
        'related':['01 Kiến trúc và thứ tự triển khai','02 đến 09 Kế hoạch từng module']
    }
    w=builder.Writer(spec)
    w.h('Khung thời gian và phạm vi bàn giao')
    w.table(['Thông số','Giá trị kế hoạch'],[
        ['Ngày bắt đầu','28/10/2026'],
        ['Deadline','28/03/2027 theo giờ Việt Nam'],
        ['Cách tính','5 tháng lịch; 22 tuần theo dõi, tuần cuối gồm 5 ngày'],
        ['Nguồn lực giả định','1 người phát triển; trung bình 10–12 giờ mỗi tuần'],
        ['Nỗ lực dự kiến','206 giờ công việc cơ sở và 40 giờ dự phòng, tổng khoảng 246 giờ'],
        ['Phạm vi bắt buộc','P0: nạp xu, ledger, lịch sử, đối soát, admin, web và Expo sandbox'],
        ['Mốc đóng phạm vi','23/02/2027; code freeze 09/03; RC1 23/03'],
    ],[4.2,11.3])
    w.p('Roadmap này phân bổ lại tiến độ ngắn trong plan gốc thành 5 tháng làm bán thời gian, có thời gian tích hợp và dự phòng. Mức giờ/tuần là giả định để lập lịch, chưa phải cam kết về lịch rảnh thực tế. Nếu chỉ duy trì dưới 10 giờ/tuần, cần điều chỉnh phạm vi hoặc lịch ở đợt rà đầu tiên.')
    w.p('Ủng hộ tác giả, mở khóa chương, subscription, cổng thanh toán thứ hai, hoàn tiền tự động và thu tiền live nằm trong backlog sau giai đoạn này. Việc chuyển live cần một đợt đánh giá và cấu hình riêng; đạt sandbox là tiêu chí của roadmap hiện tại.')

    w.h('Các giai đoạn theo tháng')
    w.figure('roadmap','Hình 1 Phân bổ các nhóm công việc trong 5 tháng')
    w.table(['Giai đoạn','Khoảng thời gian','Đầu ra chính'],[
        ['Tháng 1','28/10–27/11/2026','Baseline, schema, migration và kiểm tra ledger; chốt contract API.'],
        ['Tháng 2','28/11–27/12/2026','Backend dùng provider test; adapter VNPAY và callback được nối dần.'],
        ['Tháng 3','28/12/2026–27/01/2027','Query, worker phục hồi và luồng ví/kết quả/admin trên web.'],
        ['Tháng 4','28/01–27/02/2027','Expo browser return, đồng bộ foreground, sửa tích hợp và đóng phạm vi.'],
        ['Tháng 5','28/02–28/03/2027','Regression, staging, restore/rollback, release candidate và bàn giao.'],
    ],[2.2,4.1,9.2])
    w.p('Lịch tuần bên dưới là lịch kiểm soát chính; một tuần có thể đi qua hai tháng. Chuẩn bị merchant sandbox bắt đầu từ tuần 1. Tài liệu, test và cấu hình được cập nhật cùng mỗi module, không dồn toàn bộ vào cuối tháng 5.')

    w.h('Kế hoạch thực hiện từng tuần')
    w.p('Mỗi tuần cần có một đầu ra kiểm chứng được trong Git hoặc fixture. Cột giờ là khối lượng cơ sở; 40 giờ dự phòng được quản lý riêng để xử lý chờ merchant, lịch học/nghỉ cá nhân và lỗi tích hợp. Trạng thái ban đầu của toàn bộ công việc là chưa thực hiện.')
    week_rows=[]
    for i,(name,work,done,hours) in enumerate(WEEKS):
        start=START+timedelta(days=7*i)
        end=min(start+timedelta(days=6),DEADLINE)
        interval=f'T{i+1:02d}\n{start:%d/%m/%Y}\n{end:%d/%m/%Y}'
        week_rows.append([interval,name+'\n'+work,done,str(hours)])
    w.table(['Tuần và ngày','Công việc kỹ thuật','Đầu ra hoặc điều kiện kết thúc','Giờ'],week_rows,[2.5,6.3,5.7,1.0])

    w.h('Mốc nghiệm thu và điều kiện qua giai đoạn')
    w.table(['Mốc hạn','Điều kiện bắt buộc','Bằng chứng'],[
        ['M0 03/11/2026','Lưu baseline kế hoạch, kiểm kê đường ghi coins và xác nhận việc chuẩn bị merchant.','Commit/tag baseline và checklist còn thiếu.'],
        ['M1 24/11/2026','Migration mới/cũ đạt; chạy lại không đổi số dư; ledger khớp coins; unique và startup probe hoạt động.','Test MySQL, kết quả đối chiếu và migration lặp.'],
        ['M2 15/12/2026','API tạo/đọc đơn và ví đạt với provider test; concurrent và rollback không cấp trùng; user scope đúng.','Test BE01–BE03, admin đọc và contract reconcile.'],
        ['M3 12/01/2027','Có giao dịch sandbox cấp xu qua IPN; query phục hồi được đơn thiếu IPN; worker lease chịu restart.','Order, ledger, log đã redact và kết quả truy vấn.'],
        ['M4 26/01/2027','Web chọn gói, checkout, kết quả, lịch sử và admin hoạt động; redirect không tự xác nhận thành công.','Browser test và một lần sandbox trên web.'],
        ['M5 16/02/2027','Native mở browser và return/foreground hoạt động trên Android hoặc emulator; ghi rõ iOS đã/chưa thử.','Video/log thiết bị, token expiry và cold start case.'],
        ['Đóng phạm vi 23/02/2027','Các luồng P0 có đủ đường đi; mọi thiếu sót được ghi thành lỗi, không thêm tính năng mới.','Danh sách chức năng và lỗi còn lại được ưu tiên.'],
        ['Code freeze 09/03/2027','Không còn lỗi gây lệch xu, cấp trùng, sai quyền hoặc mất giao dịch chưa có cách xử lý.','Regression trọng yếu đạt; lỗi còn lại có mức độ rõ.'],
        ['M6 16/03/2027','Staging HTTPS, migration và restore/rollback đã diễn tập; có metric và cách đối soát sự cố.','Runbook, health check và log diễn tập.'],
        ['RC1 23/03/2027','Đóng gói bản bàn giao thử và bằng chứng 32 ca; mọi ca ghi kết quả thật, ca chưa chạy phải nêu rõ.','Tag RC1, danh mục bằng chứng và giới hạn đã biết.'],
        ['M7 28/03/2027','Bàn giao source, cấu hình mẫu, migration, test, tài liệu và cách tái hiện demo sandbox.','Tag bàn giao và checklist kiểm tra cuối.'],
    ],[3.1,8.1,4.3])
    w.p('Chỉ đánh dấu một mốc đã đạt khi có bằng chứng tương ứng. PASS của provider test không thay cho bằng chứng merchant sandbox ở M3; export Expo web không thay cho kiểm tra native ở M5. Ngày trong bảng là hạn mục tiêu, không phải kết quả đã đạt.')

    w.h('Phụ thuộc và cách xử lý trễ tiến độ')
    w.p('Chuỗi phụ thuộc chính: DB01–DB03 → BE01–BE03 → VN02/VN04 → RC01–RC03 → tích hợp web/native → regression và staging. Giao diện có thể chuẩn bị với fixture sau khi DTO được chốt, nhưng tích hợp chỉ được nghiệm thu khi dùng được backend và nguồn xác nhận đúng.')
    w.table(['Tín hiệu','Hành động cụ thể'],[
        ['Hết tuần 2 chưa có tiến triển merchant','Kiểm tra trạng thái đăng ký và khả năng IPN/query; tiếp tục DB, backend và provider test.'],
        ['Đến 15/12 chưa có đường sandbox khả dụng','Chốt phương án xử lý nhà cung cấp trong tuần 8. MoMo là lựa chọn dự phòng phải được đánh giá lại; không đồng thời duy trì hai cổng trong P0.'],
        ['Một tuần trễ trên 1 đầu ra trọng yếu','Ghi nguyên nhân và điều chỉnh hai tuần kế tiếp; dùng đệm có ghi nhận, không âm thầm đẩy deadline.'],
        ['Mốc DB hoặc transaction chưa đạt','Ưu tiên hoàn tất bất biến số dư; chỉ chuẩn bị UI bằng fixture, chưa bật checkout nhận thanh toán.'],
        ['Thiếu thời gian trước 23/02','Giảm trang trí, tiện ích filter nâng cao và phần polish phụ. Giữ nguyên auth, ledger, idempotency, đối soát và test dữ liệu.'],
        ['Lỗi quan trọng sau code freeze','Sửa có phạm vi, chạy lại ca liên quan và smoke; mỗi lần sửa tạo revision mới của RC.'],
        ['Lịch học hoặc nghỉ cá nhân thay đổi','Rà trong tuần 1 và trước tháng 4; dồn việc nhẹ vào tuần 14–17 hoặc dùng đệm, không tự giả định ngày nghỉ.'],
    ],[5,10.5])
    w.p('Phân bổ dự phòng đề xuất: 12 giờ cho merchant/cấu hình callback, 12 giờ cho lỗi tích hợp web/native, 10 giờ cho migration/đồng thời và 6 giờ cho tuần bàn giao cuối. Tổng 40 giờ này bổ sung vào 206 giờ cơ sở; khi dùng phải ghi lại phần còn lại. Đệm được phép dịch giữa nhóm khi rà tiến độ.')

    w.h('Checklist tuần đầu và nhịp theo dõi')
    for text in [
        'Lưu bộ kế hoạch vào một commit trên codex/payment-integration và ghi lại revision baseline.',
        'Kiểm kê mọi nơi ghi users.coins; chốt mặc định tài khoản mới là 0 và quy tắc giữ số dư cũ.',
        'Chuẩn bị DB bản sao/fixture để thử migration; sao lưu được và biết cách khôi phục trước khi nâng cấp dữ liệu đang dùng.',
        'Chốt danh mục gói, DTO, tiền tệ VND và hạn mức theo plan; đánh dấu phần còn cần quyết định.',
        'Bắt đầu chuẩn bị merchant sandbox, URL callback HTTPS và quyền query; lưu checklist, không lưu secret vào Git.',
        'Đọc lại các kế hoạch 02, 03 và 09 để triển khai DB01 cùng kiểm thử cần thiết.',
    ]:
        w.p(text,style='List Bullet')
    w.p('Cuối mỗi tuần dành khoảng 30 phút trong quỹ giờ để ghi: việc đã xong, revision, test/bằng chứng, số giờ đã dùng, vấn đề đang chặn và đầu ra tuần kế tiếp. Cuối mỗi tháng đối chiếu lại phạm vi và số giờ dự phòng, rồi cập nhật roadmap nếu có thay đổi được chốt.')
    w.table(['Trường cập nhật','Nội dung cần ghi'],[
        ['Tuần và revision','Txx, branch và commit hiện tại.'],
        ['Đầu ra thực tế','Module/API/schema hoặc kiểm thử có thể mở lại để xác minh.'],
        ['Trạng thái','Chưa làm, đang làm, đã đạt hoặc đang chặn; không đánh dấu xong bằng cảm tính.'],
        ['Giờ và đệm','Giờ cơ sở đã dùng, giờ dự phòng đã dùng và số giờ còn lại.'],
        ['Tuần tiếp theo','Đầu ra cụ thể, phụ thuộc còn thiếu và người thực hiện.'],
    ],[4.3,11.2])

    result=w.finish()
    manifest={**result,'start':START.isoformat(),'deadline':DEADLINE.isoformat(),
              'week_count':len(WEEKS),'base_hours':sum(x[3] for x in WEEKS),
              'reserve_hours':40,'expected_total_hours':246,
              'weeks':[{'week':i+1,'start':(START+timedelta(days=7*i)).isoformat(),
                        'end':min(START+timedelta(days=7*i+6),DEADLINE).isoformat(),
                        'name':x[0],'hours':x[3]} for i,x in enumerate(WEEKS)]}
    assert len(WEEKS)==22 and manifest['base_hours']==206
    assert date.fromisoformat(manifest['weeks'][-1]['end'])==DEADLINE
    (QA/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in manifest.items() if k!='weeks'},ensure_ascii=False))


if __name__=='__main__': main()
