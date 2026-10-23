export interface CommunityRule {
    title: string;
    content: string;
    order_index: number;
}

// The first five topics retain their positions so existing section links stay useful.
// These are community standards; moderation is performed by the site's staff.
export const communityRules: readonly CommunityRule[] = [
    {
        title: 'Điều 1. Dung lượng và định dạng văn bản',
        order_index: 10,
        content: `1.1. Độ dài và ngoại lệ
Chương văn xuôi chính cần đạt tối thiểu 1.000 từ có nội dung thực chất. Mở đầu, vĩ thanh, ngoại truyện ngắn, truyện cực ngắn và thông báo tác giả được ngắn hơn nếu ghi rõ loại ở tiêu đề hoặc phần giới thiệu. Không kéo dài bằng ký tự lặp, nội dung sao chép hoặc ghi chú không liên quan để đủ số từ.

1.2. Chính tả và ngôn ngữ
Nội dung chính sử dụng tiếng Việt có dấu, diễn đạt rõ nghĩa và được đọc soát trước khi gửi duyệt. Tiếng địa phương, khẩu ngữ, cách nói riêng của nhân vật và thuật ngữ nước ngoài được dùng có chủ đích; không lạm dụng teencode, viết tắt hoặc ký tự thay chữ khiến văn bản khó đọc.

1.3. Trình bày và khả năng đọc
Chia đoạn theo diễn biến và lượt thoại; dùng tiêu đề, dấu câu, chữ nghiêng hoặc chữ đậm vừa phải. Không đăng chương bằng ảnh chụp văn bản, viết hoa toàn chương, chèn khoảng trắng hàng loạt, mã thực thi hoặc định dạng làm che nội dung và gây khó cho trình đọc.

1.4. Chia chương hợp lý
Không cắt một cảnh thành nhiều chương rỗng, đăng lại cùng đoạn ở nhiều chương hoặc thay toàn bộ chương bằng quảng cáo để tăng số chương, lượt đọc hay XP. Phần tóm tắt và ghi chú phải phân biệt với nội dung truyện.`
    },
    {
        title: 'Điều 2. Nội dung nhạy cảm và cảnh báo người đọc',
        order_index: 20,
        content: `2.1. Giới hạn thể hiện tình dục
Chỉ chấp nhận yếu tố tình cảm, gợi mở hoặc ecchi ở mức không mô tả trực diện bộ phận sinh dục hay hành vi tình dục. Cấm nội dung khiêu dâm, smut, hentai, dịch vụ tình dục và tình dục hóa người chưa đủ 18 tuổi; áp dụng cả nhân vật hư cấu, hình vẽ và nội dung do AI tạo. Nhãn 18+ hoặc lời tuyên bố “chỉ là hư cấu” không làm nội dung bị cấm trở thành hợp lệ.

2.2. Bạo lực và tổn thương
Cảnh chiến đấu, mất mát và xung đột phải phục vụ câu chuyện. Cấm khai thác tra tấn, hành hạ, xâm hại tình dục hoặc ngược đãi người và động vật chỉ để kích thích, làm nhục nạn nhân hay cổ xúy bắt chước. Không đăng hình ảnh bạo lực đời thực có tính gây sốc.

2.3. Chủ đề tâm lý
Được viết về trầm cảm, sang chấn và quá trình hồi phục với thái độ tôn trọng. Cấm khuyến khích, thách thức, lãng mạn hóa hoặc hướng dẫn cụ thể hành vi tự hại, tự sát và rối loạn ăn uống. Không lấy trải nghiệm đau khổ có thật của người khác làm trò đùa.

2.4. Cảnh báo đúng nơi
Ghi cảnh báo ngắn, rõ ở giới thiệu tác phẩm và đầu chương có yếu tố dễ gây tổn thương như bạo lực, xâm hại, tự hại hoặc cái chết. Không dùng hình ảnh hoặc mô tả gây sốc ngay trong cảnh báo. Người đọc chưa đủ 18 tuổi cần chọn nội dung phù hợp với độ tuổi và trao đổi với người giám hộ khi cần.`
    },
    {
        title: 'Điều 3. Chủ đề bị cấm và phạm vi hư cấu',
        order_index: 30,
        content: `3.1. Kích động và hành vi gây hại
Cấm kêu gọi, tổ chức, hướng dẫn thực hiện bạo lực, khủng bố, bóc lột, mua bán người, xâm hại trẻ em, lừa đảo hoặc các hành vi gây nguy hiểm ngoài đời thực. Việc mô tả phản diện trong truyện không được biến thành lời tuyển mộ hay chỉ dẫn có thể thực hiện.

3.2. Thù hận và phân biệt đối xử
Cấm miệt thị, phi nhân hóa, đe dọa hoặc cổ xúy loại trừ người khác vì sắc tộc, quốc tịch, tôn giáo, giới tính, xu hướng tính dục, khuyết tật hay hoàn cảnh xuất thân. Tình tiết phản ánh định kiến cần có ngữ cảnh nghệ thuật rõ ràng, không được dùng làm cớ tấn công cộng đồng ngoài đời.

3.3. Chính trị, lịch sử và nhân vật có thật
Theo định hướng sáng tác giả tưởng của MugenBunko, tác phẩm chính trị, dã sử hoặc cổ trang phải xây dựng quốc gia, triều đại, sự kiện và nhân vật hư cấu. Không tiếp nhận tác phẩm tái dựng sự kiện lịch sử hoặc sử dụng chính trị gia, nhân vật lịch sử có thật làm tuyến truyện. Không dùng diễn đàn hay tác phẩm để tuyên truyền chính trị, xuyên tạc, bôi nhọ hoặc kích động xung đột đời thực.

3.4. Không lách quy định
Các giới hạn áp dụng cả tên tài khoản, hồ sơ, tiêu đề, thẻ, ảnh, đường dẫn, bình luận và tin nhắn. Viết lái, che ký tự, mã hóa, đổi tên nhân vật hoặc dẫn sang nơi khác để cung cấp nội dung bị cấm vẫn được xem xét theo nội dung và mục đích thực tế.`
    },
    {
        title: 'Điều 4. Quyền tác giả và quyền sử dụng tác phẩm',
        order_index: 40,
        content: `4.1. Quyền đăng tải
Chỉ đăng tác phẩm nguyên bản do mình sáng tạo hoặc tác phẩm đồng sáng tác có sự đồng ý của các bên. Người đăng chịu trách nhiệm về quyền sử dụng văn bản, ảnh bìa, minh họa và tư liệu kèm theo. Ghi nguồn không thay thế cho việc có quyền sử dụng.

4.2. Đạo văn và chiếm nhận tác phẩm
Cấm sao chép, dịch, diễn đạt lại có hệ thống hoặc dùng AI viết lại tác phẩm của người khác rồi nhận là sáng tác của mình. Ý tưởng phổ biến, mô típ và thể loại tương đồng không tự động chứng minh đạo văn; việc xem xét cần dựa vào các đoạn, cấu trúc và bằng chứng cụ thể.

4.3. Ghi công và trích dẫn
Ghi đúng tên tác giả, đồng tác giả, họa sĩ và nguồn tư liệu theo thỏa thuận sử dụng. Trích dẫn phải có mục đích rõ, giới hạn ở phần cần thiết, phân biệt với phần tự viết và không thay thế trải nghiệm đọc tác phẩm gốc. Không xóa chữ ký, watermark hoặc tự nhận quyền với tài sản được cấp phép.

4.4. Quyền của người sáng tạo
Đăng lên MugenBunko không chuyển quyền sở hữu tác phẩm cho nền tảng. Người đăng cho phép nền tảng lưu trữ, định dạng và hiển thị nội dung để vận hành dịch vụ trong thời gian nội dung được đăng. Việc tái bản, bán, cấp phép lại hoặc sử dụng ngoài phạm vi vận hành cần có thỏa thuận riêng. Tranh chấp và yêu cầu gỡ được xử lý theo Điều 12, Điều 22 và Điều 25.`
    },
    {
        title: 'Điều 5. Phạm vi áp dụng và cập nhật quy định',
        order_index: 50,
        content: `5.1. Đối tượng và khu vực áp dụng
Quy định áp dụng cho độc giả, tác giả, người dự sự kiện, ứng viên, kiểm duyệt viên và quản trị viên khi sử dụng MugenBunko. Tác phẩm, hồ sơ, bình luận, đánh giá, diễn đàn, bộ sưu tập công khai và tin nhắn đều thuộc phạm vi xem xét. Hành vi ngoài nền tảng chỉ được xem xét khi có liên hệ trực tiếp, có bằng chứng với việc đe dọa, lừa đảo hoặc xâm hại thành viên tại đây.

5.2. Thông báo thay đổi
Ban quản trị công bố bản sửa trên trang này, nêu ngày áp dụng và thông báo những thay đổi ảnh hưởng đáng kể đến quyền hoặc nghĩa vụ thành viên. Không xử phạt hồi tố một hành vi đã kết thúc chỉ vì sau đó có quy định mới. Nội dung đang công khai vẫn cần điều chỉnh để phù hợp kể từ ngày áp dụng.

5.3. Thời gian điều chỉnh
Với yêu cầu mới về trình bày, phân loại hoặc khai báo, thông báo cần dành ít nhất 7 ngày để thành viên sửa nội dung, trừ trường hợp người đăng chủ động đồng ý thời hạn khác. Nội dung xâm hại trẻ em, đe dọa an toàn, lừa đảo hoặc làm lộ dữ liệu riêng tư có thể bị gỡ ngay để hạn chế thiệt hại.

5.4. Cách đọc và áp dụng
Quy định riêng của sự kiện bổ sung cho quy định chung và phải được công bố trước khi tham gia. Khi có điểm mơ hồ, người xử lý cần viện dẫn điều khoản, giải thích cách áp dụng và cho thành viên cơ hội phản hồi. Việc một chức năng kỹ thuật vẫn cho phép thao tác không có nghĩa thao tác đó được cho phép theo quy định.`
    },
    {
        title: 'Điều 6. Danh tính và hồ sơ thành viên',
        order_index: 60,
        content: `6.1. Thông tin nhận diện
Được dùng bút danh và không bắt buộc công khai họ tên thật. Tên, ảnh đại diện, tiểu sử và liên kết hồ sơ phải đáp ứng giới hạn nội dung chung; không chứa thông tin liên hệ riêng tư của người khác, lời đe dọa hoặc quảng cáo lừa đảo.

6.2. Mạo danh và gây nhầm lẫn
Cấm giả làm tác giả, thành viên khác, tổ chức hoặc người của MugenBunko; không tự gắn danh xưng hay hình ảnh huy hiệu để tạo cảm giác có quyền kiểm duyệt. Tài khoản tưởng niệm hoặc giới thiệu một cá nhân khác phải nêu rõ tính chất và không được tự nhận là người đó.

6.3. Thông tin phục vụ xác minh
Thông tin gửi riêng để khôi phục tài khoản, tham gia bầu chọn hoặc giải quyết tranh chấp phải trung thực. Không dùng giấy tờ, địa chỉ email, danh tính hoặc tác phẩm của người khác để đạt điều kiện. Không yêu cầu thành viên công khai giấy tờ cá nhân chỉ để được tham gia thảo luận.`
    },
    {
        title: 'Điều 7. Bảo mật và sử dụng tài khoản',
        order_index: 70,
        content: `7.1. Bảo vệ quyền truy cập
Giữ bí mật mật khẩu, mã OTP và thông tin phiên đăng nhập; không đăng chúng lên diễn đàn hoặc gửi cho người tự xưng hỗ trợ. Người điều hành không được yêu cầu thành viên cung cấp mật khẩu hay mã OTP qua tin nhắn. Khi nghi bị chiếm quyền, đổi mật khẩu và liên hệ ban quản trị qua tài khoản có vai trò được hiển thị trong hệ thống.

7.2. Chuyển nhượng và chia sẻ
Không mua bán, cho thuê, trao đổi hoặc dùng tài khoản làm phần thưởng. Không chia sẻ tài khoản để né trách nhiệm hoặc chuyển quyền tác giả, quyền kiểm duyệt. Nhóm đồng sáng tác cần chỉ định người đăng và tự quản lý thỏa thuận ghi công, không đưa thông tin đăng nhập lên nhóm công khai.

7.3. Nhiều tài khoản và né xử lý
Không dùng nhiều tài khoản để tự tương tác, bỏ phiếu nhiều lần, giả đám đông, quấy rối hoặc tiếp tục hành vi đã bị hạn chế. Việc cùng mạng, cùng thiết bị hoặc có bút danh khác nhau không tự nó đủ để kết luận gian lận; cần xem xét hành vi và bằng chứng liên quan.`
    },
    {
        title: 'Điều 8. Thông tin, phân loại và trạng thái tác phẩm',
        order_index: 80,
        content: `8.1. Tiêu đề, giới thiệu và thẻ
Đặt tên và giới thiệu phản ánh nội dung thật; chọn thể loại, loại truyện và thẻ phù hợp. Không nhồi từ khóa, giả danh thương hiệu, ghi “chính thức” khi không có căn cứ hoặc dùng tiêu đề gây hiểu nhầm về tác giả và bản quyền. Giới thiệu cần giúp độc giả hiểu tiền đề truyện, không chỉ chứa đường dẫn hoặc lời xin tương tác.

8.2. Thông tin bắt buộc theo nội dung
Khai báo yếu tố nhạy cảm, đồng sáng tác và việc tạo nội dung bằng AI khi thuộc trường hợp quy định. Nếu giao diện chưa có trường riêng, ghi rõ trong phần giới thiệu và ghi chú đầu chương liên quan. Không dùng nhãn sai để đưa truyện vào nhóm độc giả không phù hợp.

8.3. Trạng thái trung thực
Chỉ đánh dấu hoàn thành khi tuyến truyện dự kiến đã kết thúc; ghi rõ tạm dừng hoặc ngừng viết khi đã có quyết định. Tên tập và số chương phải nhất quán. Khi chuyển phiên bản, đổi bút danh hoặc đổi tên lớn, giải thích ngắn để độc giả nhận ra tác phẩm cũ.`
    },
    {
        title: 'Điều 9. Đăng chương, chỉnh sửa và lịch cập nhật',
        order_index: 90,
        content: `9.1. Đúng loại nội dung
Chương chính phải có diễn biến thực chất. Thông báo, lời cảm ơn, đính chính và nhật ký tác giả cần ghi rõ tính chất; ưu tiên khu vực thông báo tác phẩm khi phù hợp. Không đăng một chương chỉ để yêu cầu người đọc sang trang khác mới được xem nội dung đã giới thiệu.

9.2. Chỉnh sửa sau công bố
Được sửa lỗi và biên tập lại tác phẩm. Nếu thay đổi đáng kể cốt truyện, thứ tự chương hoặc phần kết, cần có ghi chú cho người đọc. Nội dung sửa vẫn phải tuân thủ quy định; không chèn nội dung bị cấm sau khi một chương đã được duyệt.

9.3. Không tạo cập nhật giả
Cấm xóa rồi đăng lại, đổi vài ký tự liên tục hoặc đăng nhiều bản trùng để đẩy tác phẩm lên danh sách mới. Không tự khai báo đã xuất bản khi chương còn là bản nháp, chờ duyệt hoặc chờ lịch. Tác giả tự kiểm tra mốc hẹn đăng và không cam kết thay cho ban kiểm duyệt về thời điểm phê duyệt.`
    },
    {
        title: 'Điều 10. Ảnh bìa, minh họa và đường dẫn',
        order_index: 100,
        content: `10.1. Hình ảnh phù hợp
Ảnh bìa, minh họa, ảnh hồ sơ và ảnh diễn đàn phải có quyền sử dụng, phù hợp với nội dung và không chứa khỏa thân, tư thế gợi dục trực diện hoặc hình ảnh bạo lực gây sốc. Không dùng hình người thật để bôi nhọ, giả mạo hoặc tạo nội dung nhạy cảm khi chưa được đồng ý.

10.2. Nguồn và ghi công
Ghi tên người tạo và nguồn theo yêu cầu của chủ sở hữu; giữ watermark khi giấy phép yêu cầu. Ảnh tự tạo bằng AI phải được khai báo theo Điều 11 và vẫn chịu trách nhiệm về nội dung, sự giống người thật và quyền sử dụng. Không coi ảnh tìm được qua công cụ tìm kiếm là tài sản tự do sử dụng.

10.3. An toàn liên kết
Không gắn mã độc, trang giả đăng nhập, tệp thực thi đáng ngờ, liên kết tự tải xuống hoặc chuỗi chuyển hướng che điểm đến. Mô tả rõ mục đích liên kết ngoài; không ép người đọc đăng ký, cung cấp dữ liệu hay thanh toán để xem nội dung đã hứa cung cấp trên nền tảng.`
    },
    {
        title: 'Điều 11. Minh bạch khi sử dụng trí tuệ nhân tạo',
        order_index: 110,
        content: `11.1. Phân biệt hỗ trợ và tạo nội dung
Kiểm tra chính tả, gợi ý từ ngữ, tìm lỗi nhất quán và trao đổi ý tưởng không bắt buộc gắn nhãn AI-Generated nếu tác giả tự viết phần văn bản xuất bản. Khi AI tạo hoặc viết lại đáng kể các đoạn được đăng, phải dùng nhãn AI-Generated và mô tả phạm vi hỗ trợ trong giới thiệu; ảnh AI được ghi riêng là “Ảnh bìa/minh họa tạo bằng AI”.

11.2. Trách nhiệm của người đăng
Người đăng phải đọc soát, chỉnh sửa và chịu trách nhiệm về tính nhất quán, thông tin, nội dung bị cấm và quyền sử dụng. Cấm dùng AI để viết lại tác phẩm của người khác, giả phong cách nhằm mạo danh hoặc sản xuất hàng loạt nội dung lặp và chưa kiểm tra. Công cụ tạo nội dung không thay thế trách nhiệm của tác giả.

11.3. Xem xét khai báo
Không kết luận vi phạm chỉ từ một công cụ nhận diện AI hoặc vì văn phong bị cho là “giống AI”. Cần xem xét giải trình, quá trình biên tập và bằng chứng liên quan; không buộc người đăng công khai toàn bộ bản thảo riêng. Khai báo thiếu có thể được yêu cầu bổ sung; cố tình che giấu và tái phạm được xử lý theo Điều 24.`
    },
    {
        title: 'Điều 12. Truyện dịch, đồng nhân và đăng lại',
        order_index: 120,
        content: `12.1. Định hướng sáng tác nguyên bản
MugenBunko không tiếp nhận truyện dịch, bản chuyển ngữ, đồng nhân hoặc fanfiction lấy nhân vật và vũ trụ có sẵn làm nền tảng tác phẩm, kể cả khi ghi nguồn hoặc đăng miễn phí. Đây là phạm vi tiếp nhận nội dung của nền tảng; không phải kết luận rằng mọi tác phẩm thuộc các nhóm này đều xâm phạm quyền tác giả.

12.2. Đăng chéo tác phẩm của chính mình
Được đăng tác phẩm nguyên bản của mình trên nhiều nền tảng nếu các thỏa thuận hiện có cho phép. Khi bút danh khác nhau hoặc có nghi vấn quyền đăng, cung cấp bằng chứng phù hợp qua kênh riêng cho ban quản trị. Không tạo nhiều hồ sơ tác phẩm giống nhau trên MugenBunko để chiếm vị trí hiển thị.

12.3. Tranh chấp và gỡ nội dung
Yêu cầu về bản quyền cần chỉ rõ phần bị cho là sao chép, nguồn đối chiếu, căn cứ quyền và cách liên hệ của người yêu cầu. Ban quản trị có thể tạm ẩn phần tranh chấp khi có căn cứ cụ thể và cho người đăng phản hồi. Không mặc nhiên coi người tố cáo là chủ sở hữu; không tổ chức công kích hoặc công khai dữ liệu của các bên trong lúc xác minh.`
    },
    {
        title: 'Điều 13. Ứng xử và tôn trọng thành viên',
        order_index: 130,
        content: `13.1. Trao đổi vào vấn đề
Được tranh luận, chê tác phẩm và phản đối quyết định quản lý bằng lý lẽ. Không chửi bới nhắm vào cá nhân, hạ nhục ngoại hình, quy chụp nhân cách, đe dọa hoặc chế giễu hoàn cảnh riêng. Tác giả không được dùng lượng người theo dõi để gây sức ép lên độc giả góp ý.

13.2. Quấy rối và công kích tập thể
Cấm bám theo nhiều bài để gây hấn, gắn tên liên tục sau khi bị từ chối, lôi kéo người khác tấn công, đe dọa ngoài đời hoặc mang tranh chấp cá nhân sang tác phẩm không liên quan. Đùa vui cần tôn trọng sự đồng thuận; dừng lại khi người nhận đã thể hiện không muốn tiếp tục.

13.3. Xử lý bất đồng
Khi thảo luận trở nên căng thẳng, dừng tương tác và dùng báo cáo hoặc nhắn riêng cho ban quản trị. Không lấy việc “bị xúc phạm trước” làm lý do trả đũa bằng hành vi bị cấm. Phê bình có căn cứ, đánh giá thấp và khiếu nại thiện chí không phải là quấy rối.`
    },
    {
        title: 'Điều 14. Quyền riêng tư và dữ liệu cá nhân',
        order_index: 140,
        content: `14.1. Không phát tán thông tin riêng
Cấm đăng, mua bán, truy tìm hoặc đe dọa công khai số điện thoại, địa chỉ, giấy tờ, tài khoản truy cập, vị trí, nơi học tập hoặc làm việc của người khác khi chưa được đồng ý. Thông tin từng xuất hiện trên mạng không đồng nghĩa được phép tổng hợp để đe dọa hay làm nhục họ.

14.2. Tin nhắn, hình ảnh và bản thảo
Không công khai tin nhắn riêng, ảnh riêng, bản thảo chưa xuất bản hoặc thông tin nhận qua vai trò kiểm duyệt khi chưa có sự đồng ý phù hợp. Khi gửi bằng chứng cho ban quản trị, chỉ gửi phần cần thiết, che dữ liệu của người không liên quan và giữ ngữ cảnh đủ để kiểm tra.

14.3. Tiếp cận theo nhiệm vụ
Người xử lý chỉ được dùng dữ liệu nhận qua báo cáo hoặc khiếu nại cho việc xác minh, bảo vệ thành viên và giải quyết vụ việc. Không công bố danh tính người báo cáo để gây áp lực; không hứa giữ bí mật tuyệt đối trong mọi tình huống. Yêu cầu hạn chế hiển thị hoặc xử lý dữ liệu riêng được gửi qua kênh riêng cho ban quản trị, không đăng dữ liệu nhạy cảm lên diễn đàn để yêu cầu gỡ.`
    },
    {
        title: 'Điều 15. Bình luận, đánh giá và góp ý tác phẩm',
        order_index: 150,
        content: `15.1. Nhận xét có nội dung
Bình luận và đánh giá cần liên quan đến tác phẩm hoặc chủ đề đang thảo luận. Khi phê bình, nêu điểm cụ thể như diễn biến, nhịp kể, nhân vật hoặc lỗi trình bày; phân biệt cảm nhận cá nhân với cáo buộc có thể kiểm chứng. Không ép người khác phải có cùng thị hiếu.

15.2. Không mua bán và thao túng đánh giá
Cấm đổi quà, tiền, XP hoặc lượt tương tác lấy điểm đánh giá; dùng tài khoản phụ tự chấm, hẹn nhau đánh giá một sao hoặc năm sao mà không phản ánh trải nghiệm đọc. Không sao chép cùng một nhận xét lên hàng loạt tác phẩm.

15.3. Quyền phản hồi
Tác giả được giải thích và sửa lỗi, độc giả được giữ ý kiến trong giới hạn ứng xử. Không yêu cầu xóa đánh giá chỉ vì điểm thấp, không đe dọa ngừng truyện để ép tăng điểm. Bình luận bị xử lý dựa trên hành vi vi phạm và ngữ cảnh, không dựa vào việc khen hay chê.`
    },
    {
        title: 'Điều 16. Spoiler và bảo vệ trải nghiệm đọc',
        order_index: 160,
        content: `16.1. Nội dung cần cảnh báo
Thông tin về cái chết, thân phận, phản bội, lời giải bí ẩn, bước ngoặt hoặc phần kết chưa nằm trong giới thiệu công khai được xem là spoiler. Quy định áp dụng cả tiêu đề bài, bình luận, đánh giá, ảnh chế và tên bộ sưu tập công khai.

16.2. Cách thảo luận
Ghi “Có spoiler đến chương/tập…” trước phần tiết lộ và dùng công cụ ẩn spoiler khi khu vực đó có hỗ trợ. Giữ tiêu đề và phần xem trước không lộ tình tiết; nếu không thể ẩn, chuyển phần tiết lộ sang khu vực thảo luận có cảnh báo rõ. Không gửi spoiler vào tin nhắn để trêu chọc người chưa đọc.

16.3. Phân biệt vô ý và cố tình
Sai sót lần đầu có thể được yêu cầu chỉnh sửa. Cố tình phát tán bước ngoặt để phá trải nghiệm, tiếp tục sau khi được nhắc hoặc né công cụ ẩn sẽ bị xử lý theo mức độ và số lần tái phạm. Cảnh báo spoiler không cho phép đăng nội dung vốn bị cấm.`
    },
    {
        title: 'Điều 17. Đăng bài và thảo luận trên diễn đàn',
        order_index: 170,
        content: `17.1. Đúng chủ đề và chuyên mục
Chọn chuyên mục phù hợp, đặt tiêu đề mô tả được nội dung và trình bày câu hỏi hoặc ý kiến đủ rõ để người khác phản hồi. Kiểm tra chủ đề đã có trước khi mở bài trùng; không đăng một nội dung vào nhiều chuyên mục hoặc kéo bài không liên quan về tranh chấp của mình.

17.2. Thông tin và cáo buộc
Khi chia sẻ thông tin có thể kiểm chứng, nêu nguồn và phân biệt sự thật, suy đoán với ý kiến. Không cắt ảnh, giả bằng chứng, giật tiêu đề sai hoặc truyền tin chưa kiểm tra để làm tổn hại cá nhân. Nghi vấn vi phạm cụ thể cần gửi qua báo cáo; bài công khai không thay thế quá trình xác minh.

17.3. Duy trì cuộc thảo luận
Không đẩy bài bằng câu vô nghĩa liên tiếp, làm ngập luồng bằng ảnh hoặc thẻ tên và mở lại chủ đề đã bị đóng chỉ để tiếp tục gây hấn. Được góp ý sản phẩm và hoạt động quản trị một cách có căn cứ; người điều hành không được xóa góp ý chỉ vì bất lợi cho mình.`
    },
    {
        title: 'Điều 18. Spam, quảng cáo và lừa đảo',
        order_index: 180,
        content: `18.1. Spam và quảng bá
Không gửi hàng loạt nội dung giống nhau, rải liên kết dưới tác phẩm người khác, nhắn tin quảng cáo không được yêu cầu hoặc gắn tên nhiều người để tăng tiếp cận. Giới thiệu tác phẩm của mình cần đúng chuyên mục, đúng ngữ cảnh và không lặp lại để chiếm luồng thảo luận.

18.2. Nội dung thương mại
Không dùng nền tảng để rao bán hàng cấm, tài khoản, dữ liệu cá nhân, công cụ gian lận hoặc dịch vụ tương tác giả. Liên kết có lợi ích tài chính, tài trợ hoặc tiếp thị liên kết phải được nói rõ và chỉ đăng ở khu vực được ban quản trị cho phép. Không ngụy trang quảng cáo thành thông báo hệ thống hay nhận xét độc lập.

18.3. Lừa đảo và thu tiền giả danh
Cấm giả quà tặng, cơ hội đầu tư, tuyển cộng tác viên hoặc hỗ trợ kỹ thuật để lấy tiền và thông tin đăng nhập. Không nhân danh MugenBunko thu phí, nhận quyên góp, cam kết hoàn tiền hay lợi nhuận khi chưa được xác nhận. Điểm, cấp độ hoặc thành tích cộng đồng không phải lời hứa có thể đổi thành tiền.`
    },
    {
        title: 'Điều 19. Lượt đọc, XP và tính công bằng của số liệu',
        order_index: 190,
        content: `19.1. Tương tác thực chất
Lượt đọc, điểm kinh nghiệm, lượt thích, lượt theo dõi, đánh giá và thứ hạng cần phản ánh hoạt động thật. Cấm dùng bot, kịch bản tự động, làm mới có tổ chức, trao đổi lượt hoặc tài khoản phụ để tự tạo thành tích và vượt điều kiện tham gia.

19.2. Không khai thác sai sót
Không lặp lại thao tác nhận thưởng, giả tiến độ đọc, sửa yêu cầu mạng hoặc lợi dụng lỗi để tăng điểm. Khi phát hiện sai sót, dừng khai thác và báo riêng cho ban quản trị. Không công khai hướng dẫn khai thác khi lỗi còn có thể gây hại.

19.3. Xem xét và điều chỉnh
Số liệu bất thường là dấu hiệu cần kiểm tra, không tự động là kết luận. Khi xác định có gian lận, ban quản trị có thể loại thành tích, kết quả hoặc quyền lợi phát sinh từ phần gian lận và thông báo căn cứ. Người dùng được giải trình; không xử lý chỉ vì đọc nhanh, đọc lại hoặc dùng công cụ hỗ trợ tiếp cận.`
    },
    {
        title: 'Điều 20. Tin nhắn riêng và an toàn giao tiếp',
        order_index: 200,
        content: `20.1. Tôn trọng sự đồng thuận
Không gửi nội dung tình dục, ảnh nhạy cảm, lời đe dọa, lời mời giao dịch đáng ngờ hoặc liên hệ liên tục khi người nhận đã yêu cầu dừng. Không dùng tài khoản khác để tiếp cận tiếp người đã từ chối. Nội quy ứng xử vẫn áp dụng trong tin nhắn riêng.

20.2. Bảo vệ thành viên chưa đủ 18 tuổi
Cấm dụ dỗ, gạ gẫm, yêu cầu ảnh riêng tư, ép giữ bí mật hoặc hẹn gặp để khai thác tình dục. Người lớn và người có vai trò quản lý không được sử dụng vị thế để gây sức ép lên thành viên nhỏ tuổi. Khi có nguy cơ xâm hại, ưu tiên ngừng liên hệ và báo cho người giám hộ hoặc người lớn đáng tin cậy cùng ban quản trị.

20.3. Báo cáo giao tiếp riêng
Người nhận có thể gửi đoạn hội thoại liên quan cho ban quản trị để kiểm tra hành vi vi phạm. Cung cấp tài khoản, thời điểm và ngữ cảnh cần thiết; không chuyển tiếp nội dung nhạy cảm cho đám đông. Không buộc người bị quấy rối phải tiếp tục trả lời để “thu thập đủ bằng chứng”.`
    },
    {
        title: 'Điều 21. Sự kiện, bầu chọn và quyền lợi cộng đồng',
        order_index: 210,
        content: `21.1. Tuân thủ thể lệ công bố
Người tham gia cần đọc điều kiện, thời hạn, tiêu chí xét chọn và cách gửi phản hồi của từng sự kiện hoặc kỳ bầu chọn. Không khai gian tuổi tài khoản, quyền đăng tác phẩm, xác minh email hoặc điều kiện khác. Không tự suy diễn một hoạt động có phần thưởng khi thông báo không nêu.

21.2. Tính trung thực của kết quả
Cấm mua phiếu, đổi lợi ích lấy phiếu, bỏ phiếu hộ, dùng nhiều tài khoản hoặc đe dọa người có lựa chọn khác. Giới thiệu ứng viên và vận động ôn hòa được phép trong phạm vi thể lệ; không giả thông báo, công bố kết quả chưa được xác nhận hoặc quấy rối người chưa bỏ phiếu.

21.3. Trách nhiệm của người có vai trò
Ứng viên, người xét duyệt và người tổ chức phải khai báo lợi ích liên quan, không nhận quà để tác động kết quả và rút khỏi việc quyết định vụ việc của chính mình. Điều kiện nhiệm kỳ và quyền hạn theo thông báo kỳ bầu chọn; kết quả cộng đồng không cho phép vượt quyền hoặc bỏ qua nội quy.`
    },
    {
        title: 'Điều 22. Báo cáo vi phạm và cung cấp bằng chứng',
        order_index: 220,
        content: `22.1. Kênh tiếp nhận
Dùng nút báo cáo tại nội dung có hỗ trợ. Với nội dung chưa có nút báo cáo, tranh chấp bản quyền, sự cố tài khoản hoặc tin nhắn riêng, gửi tin nhắn cho thành viên ban quản trị có vai trò hiển thị trong hệ thống; không tin danh xưng do một tài khoản tự viết trong tiểu sử.

22.2. Thông tin cần thiết
Nêu đường dẫn hoặc mã nội dung, tài khoản liên quan, thời điểm, hành vi cần xem xét và điều khoản có thể bị vi phạm. Gửi đoạn trích hoặc ảnh kèm ngữ cảnh khi cần; che dữ liệu không liên quan. Không đăng lại toàn bộ nội dung xâm hại hoặc phát tán liên kết nguy hiểm để chứng minh nó tồn tại.

22.3. Báo cáo có trách nhiệm
Không làm giả, sửa ngữ cảnh, gửi trùng liên tục hoặc huy động báo cáo tập thể để gây áp lực. Số lượng báo cáo không quyết định có vi phạm hay không. Báo cáo nhầm với thiện chí không bị xem như tố cáo gian dối; cố tình bịa đặt, đe dọa và trả đũa người báo cáo sẽ được xử lý riêng.`
    },
    {
        title: 'Điều 23. Nguyên tắc kiểm duyệt và trách nhiệm quản lý',
        order_index: 230,
        content: `23.1. Có căn cứ và đúng phạm vi
Người xử lý cần xem nội dung đầy đủ, ngữ cảnh, mức độ ảnh hưởng, giải trình và lịch sử liên quan. Không kết luận chỉ theo số lượt báo cáo, độ nổi tiếng, quan hệ cá nhân hoặc công cụ tự động. Chỉ thực hiện thao tác trong quyền hạn được cấp; chuyển vụ việc vượt quyền cho quản trị viên.

23.2. Thông báo quyết định
Khi yêu cầu sửa, gỡ nội dung hoặc khóa tài khoản, người xử lý cần gửi lý do, điều khoản áp dụng, phạm vi ảnh hưởng, thời hạn nếu có và cách phản hồi qua thông báo hoặc tin nhắn phù hợp. Có thể tạm ẩn trước khi trao đổi nếu nội dung đang gây hại; sau đó vẫn cần giải thích trong phạm vi không làm lộ dữ liệu người khác.

23.3. Công bằng và xung đột lợi ích
Kiểm duyệt viên không tự quyết tranh chấp của mình, của cộng sự trực tiếp hoặc vụ có lợi ích riêng; cần chuyển người khác xem xét. Không sử dụng quyền để ép đánh giá tốt, lấy bản thảo, đòi tiền hoặc gây bất lợi cho người góp ý. Vi phạm của người quản lý cũng chịu quy định chung và có thể dẫn đến thu hồi vai trò.

23.4. Giới hạn của phê duyệt
Việc một nội dung đã xuất hiện hoặc được duyệt không phải xác nhận quyền sở hữu, tính đúng đắn của mọi thông tin hay cam kết được tồn tại vĩnh viễn. Nội dung có thể được xem xét lại khi có bằng chứng mới. Việc xem xét lại phải có căn cứ và vẫn bảo đảm quyền phản hồi.`
    },
    {
        title: 'Điều 24. Biện pháp xử lý và tình tiết vi phạm',
        order_index: 240,
        content: `24.1. Vi phạm nhẹ, có thể khắc phục
Lỗi nhãn, trình bày, đăng sai mục hoặc spoiler vô ý lần đầu được ưu tiên nhắc nhở và yêu cầu sửa. Thời hạn sửa phải nêu cụ thể trong thông báo; có thể trả nội dung về nháp hoặc tạm ẩn phần vi phạm. Lỗi khác tính chất không được cộng cơ học thành một chuỗi tái phạm.

24.2. Tái phạm và hành vi có chủ đích
Tiếp tục sau khi được nhắc, spam, quấy rối, cố tình khai báo sai hoặc thao túng tương tác có thể bị gỡ nội dung liên quan và khóa tài khoản có thời hạn: tối đa 7 ngày cho lần xử lý ban đầu, tối đa 30 ngày khi tiếp tục tái phạm hoặc gây ảnh hưởng đáng kể. Thông báo phải nêu thời hạn, điều kiện khôi phục và các thành tích bị điều chỉnh nếu có; không mặc định hệ thống tự mở khóa.

24.3. Vi phạm nghiêm trọng
Xâm hại trẻ em, đe dọa bạo lực có căn cứ, phát tán dữ liệu để gây hại, chiếm tài khoản, lừa đảo, phát tán mã độc hoặc tổ chức phá hoại có thể bị gỡ ngay và khóa không thời hạn mà không cần qua bước nhắc nhở. Đạo văn có hệ thống, né khóa và tái phạm nghiêm trọng cũng có thể áp dụng mức này; quyết định vẫn được khiếu nại.

24.4. Tương xứng và xem xét tình tiết
Cân nhắc ý định, phạm vi ảnh hưởng, số lần tái phạm cùng loại, việc tự báo, chủ động sửa và hợp tác khắc phục. Không phạt toàn bộ nhóm chỉ vì một thành viên vi phạm khi thiếu bằng chứng liên quan. Biện pháp bảo vệ khẩn cấp cần được phân biệt với kết luận cuối cùng; không công khai bêu tên hay dữ liệu cá nhân như một hình thức xử phạt.`
    },
    {
        title: 'Điều 25. Khiếu nại, khôi phục và giải quyết tranh chấp',
        order_index: 250,
        content: `25.1. Quyền yêu cầu xem xét lại
Thành viên có thể phản hồi trong 14 ngày kể từ khi nhận quyết định; nếu chưa được thông báo, tính từ khi biết quyết định và có thể giải thích việc gửi muộn. Nêu tài khoản, nội dung hoặc quyết định liên quan, điểm không đồng ý, kết quả mong muốn và bằng chứng bổ sung. Không cần công khai tranh chấp trên diễn đàn để được tiếp nhận.

25.2. Kênh và người xem xét
Gửi riêng cho quản trị viên có vai trò hiển thị trong hệ thống. Nếu tài khoản không đăng nhập được, có thể dùng một tài khoản chỉ để liên hệ, nêu rõ tài khoản đang bị khóa và không dùng nó để tiếp tục đăng tải, tương tác hay né biện pháp xử lý. Vụ việc có xung đột lợi ích cần được chuyển cho người có thẩm quyền khác khi có thể.

25.3. Kết quả và khôi phục
Người xem xét cần đối chiếu bằng chứng, phản hồi có lý do và nêu quyết định giữ nguyên, giảm, hủy hoặc yêu cầu bổ sung. Khi xử lý sai, ban quản trị cần đính chính và khôi phục nội dung, quyền truy cập hoặc số liệu trong khả năng kỹ thuật; giải thích rõ phần không thể khôi phục. Không cam kết một thời hạn phản hồi cố định nếu chưa có thông báo tiếp nhận cụ thể.

25.4. Kết thúc và bằng chứng mới
Không gửi lặp cùng khiếu nại đã được trả lời khi không có thông tin mới; được đề nghị mở lại khi có bằng chứng mới có thể làm thay đổi kết luận. Khiếu nại không tự động đình chỉ biện pháp bảo vệ đang áp dụng. Không trả đũa người khiếu nại, người làm chứng hoặc người báo cáo thiện chí; quy trình nội bộ không loại bỏ các quyền yêu cầu giải quyết theo pháp luật.`
    }
];
