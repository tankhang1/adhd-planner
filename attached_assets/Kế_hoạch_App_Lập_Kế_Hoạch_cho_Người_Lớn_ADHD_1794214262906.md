# Kế hoạch App Lập Kế Hoạch cho Người Lớn ADHD

Nov 9, 2026 · @Ethan

## Tóm tắt

Làm một app lập kế hoạch dạng hình ảnh cho người lớn ADHD, **có đủ các tính năng tương đương Tiimo** (dòng thời gian trực quan, nếp sinh hoạt, đếm ngược, AI chia nhỏ việc, widget). App thắng bằng 3 điểm Tiimo đang bị chê: **giá minh bạch và rẻ hơn, có gói mua trọn đời, và bản Android ngang bằng iOS**.

**Quy tắc “giống Tiimo”:** giống ở tính năng và luồng sử dụng, vì đây là những ý tưởng chung của cả ngành, Structured và nhiều app khác cũng có. **Khác hoàn toàn** ở tên, logo, biểu tượng, hình minh họa, màu sắc và câu chữ. Sao chép giao diện sẽ bị App Store từ chối theo quy định chống app sao chép (copycat) và có rủi ro bị kiện.

- **Tên tạm:** Dayflow (cần kiểm tra trùng tên).
- **Thị trường:** Mỹ và Canada trước, sau đó Anh và Úc; tiếng Đức từ tháng thứ 9.
- **Mục tiêu 12 tháng:** 100.000 lượt cài, 3.000 người trả phí, doanh thu định kỳ khoảng $12.000/tháng.
- **Rủi ro lớn nhất:** Tiimo là iPhone App of the Year 2025, có hơn 1 triệu người dùng. Chỉ sao chép tính năng thì không đủ để thắng.

## Thị trường và người dùng

Nhu cầu rất lớn: năm 2023 có khoảng 15,5 triệu người lớn ở Mỹ (6,0%) đang có chẩn đoán ADHD, và gần một nửa được chẩn đoán khi đã trưởng thành ([CDC](https://www.cdc.gov/mmwr/volumes/73/wr/mm7340a1.htm)). Phần lớn nhóm này dưới 50 tuổi, quen dùng app và quen trả tiền thuê bao.

| Persona | Mô tả | Nỗi đau chính |
| --- | --- | --- |
| **Maya, 27 tuổi** | Mới được chẩn đoán, làm văn phòng | “Mù thời gian” (time blindness): trễ hẹn, ước lượng sai thời gian làm việc |
| **Jordan, 34 tuổi** | Làm tự do | Không bắt đầu nổi việc, bị cuốn quá sâu vào một việc (hyperfocus) rồi bỏ lỡ việc khác |
| **Sam, 40 tuổi** | Là cha mẹ và bị ADHD | Quá tải nếp sinh hoạt sáng và tối của cả nhà |

**Vì sao người dùng bỏ app (điều phải tránh):**

- Thiết lập ban đầu quá phức tạp, làm họ nản ngay từ đầu.
- Chuỗi ngày liên tiếp (streak) bị đứt làm họ thấy tội lỗi rồi bỏ app luôn.
- Quên mất là mình đã cài app, vì app không có mặt trên màn hình khóa hoặc widget.

## Đối thủ

Tiimo là app dẫn đầu về thiết kế và danh tiếng, nhưng người dùng chê về giá không rõ ràng và về các bản cập nhật làm hỏng thói quen đang dùng.

| App | Giá | Điểm mạnh | Điểm yếu để khai thác |
| --- | --- | --- | --- |
| [Tiimo](https://lifestack.ai/blog/tiimo-pricing) | Khoảng $79,99/năm; gói gia đình $119,99/năm | iPhone App of the Year 2025, hơn 1 triệu người dùng, 4,6 sao với khoảng 16.900 đánh giá ở Mỹ | Không công bố giá cố định; muốn dùng thử phải đăng ký gói năm; người dùng lâu năm phàn nàn bản cập nhật làm thay đổi nếp sinh hoạt; phong cách nhiều biểu tượng cảm xúc bị một số người chê trẻ con ([AISO Tools](https://aisotools.com/blog/tiimo-review-2026)) |
| [Structured](https://toolfinder.co/best/adhd-planner-apps) | $19,99/năm hoặc $49,99 trọn đời | Rẻ, dòng thời gian gọn | Ít tính năng dành riêng cho ADHD |
| [Llama Life](https://toolfinder.vercel.app/lists/best-adhd-planner-apps) | $6/tháng hoặc $39/năm | Bộ đếm giờ cho từng việc | Chưa có Android |
| Routinery | Thuê bao | Dẫn từng bước cho nếp sinh hoạt sáng và tối | Không lập kế hoạch cho cả ngày |
| [Finch](https://www.getinflow.io/post/best-alternatives-finch-adhd) | Khoảng $69,99/năm | Nuôi thú ảo, gắn bó cảm xúc | Không phải công cụ lập kế hoạch |

**Khoảng trống cho mình:** tính năng ngang Tiimo, giá gần Structured, và cam kết “không bao giờ tự ý thay đổi nếp sinh hoạt của bạn”.

## Định vị

**Thông điệp chính:** “A visual day planner for ADHD brains. Honest price, no guilt, works the same on iPhone and Android.” (Tạm dịch: App lập kế hoạch ngày bằng hình ảnh cho não ADHD. Giá rõ ràng, không làm bạn thấy có lỗi, dùng như nhau trên iPhone và Android.)

| Khía cạnh | Tiimo | App của mình |
| --- | --- | --- |
| Tính năng cốt lõi | Dòng thời gian trực quan, nếp sinh hoạt, đếm giờ, AI | Tương đương |
| Giá | Không công bố cố định, khoảng $80/năm | Công khai: $39,99/năm hoặc $79,99 trọn đời |
| Dùng thử | Phải đăng ký gói năm | Bản miễn phí dùng được thật, và 7 ngày dùng thử cho mọi gói |
| Thay đổi tính năng | Bản cập nhật từng làm xáo trộn nếp sinh hoạt | Cam kết giữ ổn định, tính năng mới luôn là tùy chọn |
| Phong cách | Nhiều màu, nhiều biểu tượng cảm xúc | Có 2 giao diện: “Vui tươi” và “Gọn gàng” cho người đi làm |

## Tính năng

MVP làm đủ bộ tính năng cốt lõi mà người dùng app lập kế hoạch ADHD mong đợi. Các tính năng tạo khác biệt để sang V2.

| Tính năng | Mô tả | Giai đoạn | Gói |
| --- | --- | --- | --- |
| Dòng thời gian hôm nay | Các khối việc có màu và biểu tượng theo giờ, vạch “bây giờ” chạy theo thời gian thực | MVP | Miễn phí |
| Đồng hồ đếm ngược trực quan | Vòng tròn thời gian còn lại cho việc đang làm; nhắc chuyển việc trước 5 phút | MVP | Miễn phí |
| Nếp sinh hoạt | Chuỗi bước sáng và tối, chạy từng bước với bộ đếm giờ | MVP | Miễn phí 2 nếp, không giới hạn ở bản Pro |
| Danh sách việc cần làm | Kéo việc vào dòng thời gian; việc chưa làm tự chuyển sang ngày mai mà không có thông báo trách mắng | MVP | Miễn phí |
| AI chia nhỏ việc | Nói hoặc gõ “dọn phòng”, AI chia thành các bước 5–10 phút và ước lượng thời gian | MVP | Pro |
| AI xếp lịch cả ngày | Đổ hết việc cần làm vào, AI xếp thành lịch ngày | MVP | Pro |
| Widget và hiển thị trên màn hình khóa | Live Activities và Dynamic Island trên iOS, widget trên Android | MVP | Miễn phí |
| Đồng bộ lịch | Google Calendar, Apple Calendar, Outlook | MVP | Pro |
| Ghi lại cảm xúc và năng lượng | Ghi mức năng lượng, gợi ý xếp việc theo năng lượng | V2 | Pro |
| Làm việc cùng bạn ảo (body doubling) | Phiên tập trung có bạn đồng hành AI hoặc người dùng khác | V2 | Pro |
| Apple Watch và Wear OS | Rung nhắc chuyển việc, đếm ngược trên cổ tay | V2 | Pro |
| Gói gia đình | Tối đa 5 hồ sơ, cha mẹ lập nếp sinh hoạt cho con | V3 | Family |
| Bản web | Lập kế hoạch trên máy tính | V3 | Pro |

## Thiết kế UX cho não ADHD

Mỗi màn hình chỉ trả lời một câu hỏi: **“Bây giờ tôi làm gì, và còn bao lâu?”** Bộ nhận diện thương hiệu phải do mình tự thiết kế, không phỏng theo màu sắc, biểu tượng hay bố cục của bất kỳ app nào.

### Nguyên tắc

1. **Thiết lập ban đầu dưới 60 giây:** hỏi 3 câu (giờ thức dậy, giờ đi ngủ, khó khăn lớn nhất), rồi AI tạo sẵn một ngày mẫu.
2. **Không dùng chuỗi ngày liên tiếp, không phạt:** việc chưa xong tự chuyển sang ngày sau, kèm lời động viên thay vì chữ “quá hạn” màu đỏ.
3. **Thời gian phải nhìn thấy được:** dùng thanh hoặc vòng tròn co dần thay cho con số.
4. **Ít quyết định nhất có thể:** mỗi lúc chỉ có một nút hành động chính.
5. **Có mặt ngoài app:** widget, màn hình khóa và đồng hồ đeo tay, vì người ADHD hay quên mở app.
6. **Tiếp cận cho mọi người:** hỗ trợ Dynamic Type, chế độ giảm chuyển động, bảng màu phù hợp người mù màu.

### Phong cách riêng đề xuất

Tông màu ấm, chữ bo tròn. Biểu tượng là bộ hình vẽ nét tự thiết kế, không dùng emoji. Linh vật là một nhân vật gốc do mình tự tạo, ví dụ một đám mây nhỏ thay đổi theo năng lượng của người dùng. Có hai giao diện: Vui tươi và Gọn gàng.

### Các màn hình chính

1. **Hôm nay:** dòng thời gian và việc đang làm nằm trên cùng.
2. **Tập trung:** đồng hồ đếm ngược toàn màn hình.
3. **Nếp sinh hoạt:** chạy từng bước.
4. **Đổ việc cần làm (brain dump):** gõ hoặc nói, AI sắp xếp.
5. **Cài đặt.**

## Kỹ thuật, giá và doanh thu dự kiến

**Công nghệ:**

- **App:** Flutter cho cả iOS và Android, cộng thêm phần viết riêng cho widget, Live Activities (Swift) và widget Android (Kotlin). Phần viết riêng này khoảng 20% khối lượng công việc.
- **Dữ liệu:** lưu trên máy trước để dùng được khi không có mạng, đồng bộ qua Supabase.
- **AI:** gọi API mô hình ngôn ngữ để chia nhỏ việc và xếp lịch, kèm API chuyển giọng nói thành văn bản. Chi phí ước tính dưới $0,30 cho mỗi người dùng Pro mỗi tháng.
- **Thanh toán và đo lường:** RevenueCat quản lý thuê bao, PostHog đo hành vi người dùng.

**Giá (công khai trên website và trong mô tả trên store):**

| Gói | Giá | Gồm |
| --- | --- | --- |
| Miễn phí | $0 | Dòng thời gian, đồng hồ đếm ngược, 2 nếp sinh hoạt, widget |
| Pro | $5,99/tháng hoặc $39,99/năm | AI, không giới hạn nếp sinh hoạt, đồng bộ lịch, đồng hồ đeo tay |
| Trọn đời | $79,99 | Pro mãi mãi; giới hạn số lượt AI mỗi tháng để kiểm soát chi phí |
| Family (V3) | $69,99/năm | Tối đa 5 hồ sơ |

**Doanh thu dự kiến (kịch bản trung bình, cần kiểm chứng):** giả định 2,5–3% lượt cài chuyển thành trả phí.

| Mốc | Lượt cài tích lũy | Người trả phí | Doanh thu định kỳ hằng tháng |
| --- | --- | --- | --- |
| Tháng 3 | 15.000 | 400 | khoảng $1.600 |
| Tháng 6 | 40.000 | 1.100 | khoảng $4.400 |
| Tháng 12 | 100.000 | 3.000 | khoảng $12.000 |

## Đưa ra thị trường, lộ trình và rủi ro

Cộng đồng ADHD trên TikTok và Reddit rất đông và hay chia sẻ công cụ họ dùng. Kênh miễn phí này là vũ khí chính, vì đấu quảng cáo trực tiếp với Tiimo sẽ rất tốn kém.

**Kênh tiếp cận:**

- **TikTok và Instagram:** hợp tác với 20–30 người sáng tạo nội dung về ADHD có 10.000–100.000 người theo dõi, kết hợp video “day in my life” của chính đội.
- **Reddit:** tham gia thật sự vào r/ADHD, r/adhdwomen, r/ADHD\_Programmers (không spam). Ghi rõ mình là nhà phát triển app.
- **ASO:** tập trung từ khóa adhd planner, visual planner, routine app, time blindness.
- **So sánh trung thực:** trang “Alternative to Tiimo” nhấn mạnh giá rõ ràng và gói trọn đời. Chỉ nêu sự thật có thể kiểm chứng, không dùng logo hay ảnh chụp màn hình của họ.

### Lộ trình

1. **Tuần 1–3, kiểm chứng:**
   - Phỏng vấn 15 người lớn bị ADHD, đọc khoảng 300 review 1–3 sao của Tiimo, Structured và Llama Life.
   - Dựng landing page.
   - **Điều kiện đi tiếp:** ít nhất 500 email đăng ký chờ.
2. **Tuần 4–6, thiết kế:** xây bộ nhận diện thương hiệu riêng, làm bản click thử 5 màn hình chính, test với 8 người dùng.
3. **Tuần 7–18, xây MVP:** beta kín qua TestFlight và Google Play với 100 người từ danh sách chờ, bắt đầu từ tuần 15.
4. **Tháng 5, ra mắt:** Mỹ, Canada, Anh và Úc, cùng lúc trên iOS và Android.
5. **Tháng 6–9, V2:** ghi năng lượng, làm việc cùng bạn ảo, đồng hồ đeo tay, bản tiếng Đức.

### Đội ngũ và ngân sách (ước tính, đội ở Việt Nam)

| Hạng mục | 9 tháng (USD) |
| --- | --- |
| 2 lập trình viên Flutter, trong đó một người biết Swift và Kotlin | 32.000 |
| 1 thiết kế UI/UX và hình minh họa | 12.000 |
| Hạ tầng và AI | 2.500 |
| Hợp tác với người sáng tạo nội dung và quảng cáo thử | 10.000 |
| Pháp lý và đăng ký thương hiệu | 2.000 |
| **Tổng** | **khoảng 58.500** |

### KPI

| Chỉ số | Mục tiêu |
| --- | --- |
| Tỷ lệ hoàn thành thiết lập ban đầu | Trên 70% |
| Tỷ lệ quay lại sau ngày 1, ngày 7, ngày 30 | 45%, 25%, 15% |
| Tỷ lệ lượt cài chuyển thành trả phí | 2,5–3% |
| Tỷ lệ người dùng gắn widget | Trên 40% |

### Rủi ro

| Rủi ro | Mức độ | Cách giảm |
| --- | --- | --- |
| Tiimo giảm giá hoặc ra gói trọn đời | Cao | Thắng thêm bằng Android, giao diện Gọn gàng và tốc độ lắng nghe cộng đồng |
| Bị xem là bản sao chép, bị App Store từ chối | Trung bình | Nhận diện, biểu tượng, câu chữ và linh vật hoàn toàn tự tạo |
| Giữ chân thấp, đặc trưng của người dùng ADHD | Cao | Widget, không phạt, thông báo dịu dàng, ghi chú “chào mừng quay lại” |
| Chi phí AI cho gói trọn đời | Trung bình | Giới hạn số lượt AI mỗi tháng, ưu tiên mô hình chạy trên máy |

## Nguồn

- [CDC MMWR: ADHD in adults](https://www.cdc.gov/mmwr/volumes/73/wr/mm7340a1.htm)
- [Lifestack: Tiimo pricing 2026](https://lifestack.ai/blog/tiimo-pricing)
- [AISO Tools: Tiimo review 2026](https://aisotools.com/blog/tiimo-review-2026)
- [ToolFinder: Best ADHD planner apps](https://toolfinder.co/best/adhd-planner-apps)
- [Inflow: Finch alternatives](https://www.getinflow.io/post/best-alternatives-finch-adhd)
