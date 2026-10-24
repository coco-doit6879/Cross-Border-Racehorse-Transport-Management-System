# Luồng vận chuyển

1. Customer nộp hồ sơ ngựa đầy đủ ảnh, hộ chiếu, sổ tiêm phòng. Specialist duyệt sức khỏe. Ngựa chưa duyệt không được đặt chuyến.
2. Customer chọn chuyến đã công bố và tạo đơn. Đơn mới yêu cầu cọc 30%; tiền cọc được chốt trong đơn và xác nhận bằng callback thanh toán đã kiểm tra chữ ký.
3. Sau cọc, manager duyệt đơn vận chuyển. Customer thanh toán phần còn lại theo đúng số tiền đã thu, không mặc định tính lại 70% cho đơn cũ.
4. Chỉ đơn được duyệt và thanh toán đủ mới vào hàng chờ coordinator. Mỗi đơn có một vận đơn/xe đủ khoang cho ngựa. Coordinator chọn xe, đường bộ, trạm nghỉ và xác nhận một lần. API khóa cả sửa lẫn xác nhận lại, có kiểm tra phiên bản dữ liệu.
5. Manager chọn tài xế và phụ xe cho phương án đã xác nhận. Phát hành vận đơn thật với đường đi và trạm nghỉ đã lưu; kiểm tra giữ chỗ xe, nhân sự và tránh tạo vận đơn trùng.
6. Driver nhận nhiệm vụ trên app, xác nhận ngựa lên xe và km đầu, bắt đầu chuyến. Xác nhận đến từng điểm theo thứ tự. App không tự bật mô phỏng.
7. Trang chủ customer hiển thị các đơn có lộ trình thật, trạm nghỉ, vị trí cập nhật và các mốc đã đến. Cập nhật bằng socket và tải lại định kỳ.
8. Tới điểm đích, driver xác nhận giao đủ ngựa, km cuối rồi hoàn thành chuyến. Đơn chuyển vào lịch sử, ngựa cập nhật vị trí điểm đến. Chữ ký giao nhận được lưu riêng, không tự kết thúc chuyến thay driver.

Các kiểm tra sức khỏe, sự cố, giấy tờ xuất nhập cảnh và điều kiện giao nhận hiện có vẫn áp dụng. Đơn đã thu cọc theo chính sách cũ giữ nguyên số tiền và giao dịch thực tế.

Điểm vào chính: `/planning/:id` với `APPROVE_ORDER`, `CONFIRM_PLAN`, `ASSIGN_CREW`; `/routes/:id/waypoint-checkin`; `/routes/:id/status`. API dispatch cũ không được dùng để bỏ qua các bước này.
