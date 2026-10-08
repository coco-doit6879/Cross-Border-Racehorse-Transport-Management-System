# Triển khai phần xử lý ngoại lệ — cập nhật 08/10/2026

## Trạng thái hiện tại

Mã nguồn đã bổ sung ghi nhận chi hoàn tiền/bồi thường sau duyệt, áp dụng đổi điểm giao cùng quốc gia, hủy chuyến đã phân công nhưng chưa nhận ngựa, bàn giao toàn bộ ngựa sang tổ/xe cứu hộ, nhận bàn giao trên mobile, giữ chỗ bằng unique index, watchdog GPS/SOS, SOS không GPS, đồng bộ offline khi app đang mở, và thu hồi access token sau đổi mật khẩu.

**Đã nâng cấp database local:** MongoDB chạy replica set một node `cbrt-rs`, trạng thái PRIMARY; URI backend đã thêm `replicaSet=cbrt-rs`. Migration giữ chỗ đã thực hiện, xác nhận có đủ bốn unique index cho ngựa/xe/tài xế/phụ xe. Không còn điều kiện chặn transaction do standalone. Replica set một node hỗ trợ transaction nhưng không có dự phòng khi máy này hỏng.

### Sao lưu và kiểm chứng nâng cấp

- Backup lạnh: `D:\WDP301\maintenance-backups\20261007-replicaset\data`; cấu hình cũ: `mongod.cfg.original`; checksum từng tệp: `manifest.csv`. Thư mục backup đã được loại khỏi Git.
- Đã khôi phục một bản sao độc lập trên localhost:27018, so sánh `dbHash` của 14 collection trong `cbrt_db` trước migration: khớp `a1a6500533e0730c16315d1da484c32f`. Đã tắt MongoDB thử trên 27018; giữ nguyên bản backup gốc và bản restore-check, không xóa dữ liệu nghiệp vụ.
- Ngày 08/10 kiểm tra lại: `cbrt-rs` là PRIMARY, database có 3 Order và 1 TransportRoute; không chạy lại migration hoặc ghi đè backup.
- Chạy lại 67/67 kiểm thử thành công, gồm transaction đổi điểm giao, cứu hộ, tiếp nhận của tài xế mới và cố tình gây lỗi sau ghi Route để xác minh rollback Order/Route. Kiểm thử trong database ngẫu nhiên riêng; các database test của mỗi lần chạy được xóa sau kiểm thử, không đụng database nghiệp vụ. Riêng lựa chọn xe cứu hộ trong integration dùng mock validator; không thay thế kiểm thử thực tế toàn bộ đội xe.
- Backend đã khởi động lại, `/api/health` trả OK; log kết nối MongoDB thành công. Không có lỗi trong stderr tại thời điểm kiểm tra.

## Quy trình nâng cấp tham khảo (đã thực hiện; không chạy lại tùy tiện)

1. Dừng tất cả backend/workers đang ghi vào database; không chỉ đóng tab trình duyệt.
2. Sao lưu database và xác minh có thể phục hồi. Không thay thế/xóa thư mục dữ liệu MongoDB.
3. Quản trị viên chuyển MongoDB sang replica set theo cấu hình dịch vụ hiện tại (có thể một node cho local), cấu hình URI thích hợp, xác nhận transaction hoạt động. Không chạy lệnh khởi tạo/đổi dịch vụ mù trên dữ liệu đang dùng.
4. Tại `D:\WDP301\backend`, chạy `node scripts/migrateReservations.js` để kiểm tra xung đột. Script mặc định chỉ đọc. Đã chạy dry-run trên dữ liệu hiện tại: 1 Order và 1 TransportRoute đang hoạt động, chưa phát hiện xung đột.
5. Khi backup và dừng ghi đã được xác nhận, chạy `node scripts/migrateReservations.js --apply`. Lệnh đánh dấu các bản ghi giữ chỗ và tạo index; không xóa đơn/chuyến. Nếu gặp xung đột, xử lý từng trường hợp, không tự hủy đơn để ép index thành công.
6. Chạy lại dry-run, kiểm tra các index `active_horseIds_reservation`, `active_vehicleId_reservation`, `active_driverId_reservation`, `active_escortId_reservation`; khởi động lại backend.
7. Nghiệm thu bằng tài khoản test và database test trước khi dùng cho chuyến thật.

API tạo đơn/phân công mới có kiểm tra readiness. Khi chưa backfill/index đầy đủ sẽ trả 503 rõ lý do, không âm thầm bỏ bảo vệ. Luồng đang xem dữ liệu không bị middleware này chặn.

## Quy tắc nghiệp vụ đã áp dụng

- Mỗi ngựa, xe, tài xế, phụ xe chỉ có một giữ chỗ hoạt động. Đây là chính sách bảo thủ, chưa hỗ trợ nhiều chuyến tương lai không trùng giờ cho cùng tài nguyên.
- Quản lý duyệt từng yêu cầu. `EXECUTE_EXCEPTION` chỉ ghi chứng từ **đã chi thực tế**, không gọi API ngân hàng. Hoàn tiền không vượt tổng giao dịch PAID + phiếu thu phụ thu trừ các khoản đã hoàn ghi nhận trong đơn. Bồi thường giữ đúng số tiền đã duyệt.
- Điểm giao mới phải thuộc danh mục cố định, cùng quốc gia. Chỉ áp dụng khi chưa khởi hành hoặc đang dừng xử lý sự cố, chưa giao con ngựa nào, chưa có POD. Hồ sơ DELIVERY đã duyệt bị chuyển về chờ kiểm tra. Xóa GPS/path cũ để không suy ra đã tới điểm mới.
- Tọa độ danh mục hiện là tâm thành phố phục vụ demo, **không phải cơ sở nhận ngựa đã xác minh**. Phải thay danh mục bằng điểm thực tế trước triển khai thật.
- Hủy chuyến chỉ trước khởi hành và chưa có ngựa lên xe, không còn sự cố mở. Hoàn tiền xử lý bằng yêu cầu riêng, không tự hoàn.
- Cứu hộ ghi đủ ngựa, biên bản/người chứng kiến, xe/người cũ và mới, km từng chặng. Tài xế mới phải xác nhận đủ ngựa và km đầu trước khi điều phối giải quyết sự cố. Chưa hỗ trợ chia đàn sang nhiều xe.
- Cảnh báo sức khỏe `UNSTABLE`, `INJURED`, `FEVER`, `DEHYDRATION` mở hồ sơ sự cố để người có chuyên môn xử lý; không tự đưa chỉ định y tế.
- Watchdog quét mỗi 60 giây, lưu cảnh báo GPS cũ hơn 2 phút và SOS chưa tiếp nhận hơn 5 phút; hiển thị trên màn hình điều phối khi mở. Đây **không phải SMS/cuộc gọi/push khi nhân viên đóng app**.
- Offline tự đồng bộ mỗi 15 giây khi app đang active hoặc vừa mở lại; lỗi nghiệp vụ được hiển thị, không xóa sự kiện thất bại. Không cam kết GPS/queue hoạt động nền khi hệ điều hành đóng app.
- Đường đi dự kiến có thể nạp mảng GeoJSON đã kiểm tra; không tự vẽ đoạn thẳng giữa hai thành phố thành tuyến đường thực. Chưa có plannedPath thì UI cảnh báo chưa bật phát hiện lệch tuyến.

## Kiểm thử và giới hạn còn lại

- 65 unit/controller tests trước đó; 2 integration tests MongoDB riêng kiểm tra giữ chỗ cạnh tranh, payout version conflict, vượt mức hoàn, quyền recovery, SOS thiếu GPS, watchdog dedup, thu hồi giữ chỗ, lịch đặt chuyến và fail-closed trên standalone.
- Database test ngẫu nhiên được xóa sau chạy; không xóa/sửa database nghiệp vụ trong quá trình test. Dữ liệu test chỉ có thể tạo lại bằng chạy test.
- Frontend build và mobile TypeScript pass. Bundle frontend còn lớn (~1.64 MB chưa gzip).
- Success/rollback của destination/cancel/rescue đã được kiểm thử trên replica set local với database test. Chưa thử end-to-end điện thoại/trình duyệt thật.
- Chưa có luồng người nhận ủy quyền/giao một phần/đàn chia nhiều xe, hủy giữa hành trình có bàn giao custody; các tình huống này giữ chuyến để xử lý, không tự hoàn tất.
- Chưa có chứng từ ngân hàng được kiểm chứng tự động, chống dùng lại cùng chứng từ giữa nhiều đơn, reconciliation console tổng hợp callback ngoại lệ, push/SMS escalation hoặc backup restore drill.
- POD/incident/payment legacy vẫn dùng phục hồi bằng retry ở một số bước, chưa biến toàn bộ hệ thống thành transaction; cần stress/fault-injection các cuộc đua SOS với POD/start trước production.

Không tuyên bố đã bao phủ mọi tình huống xấu nhất. Chốt nghiệm thu phải bao gồm cấu hình hạ tầng và diễn tập thực tế, không chỉ build/test mã nguồn.
