# Theo dõi hành trình bằng check-in

- Driver tiếp nhận chuyến, xác nhận từng ngựa lên xe và ghi km đầu rồi khởi hành.
- Driver xác nhận ARRIVED lần lượt từng điểm. Backend lưu actualArrival theo thời gian máy chủ, không nhận vị trí thiết bị và không sinh vị trí xe giả.
- Web hiển thị tuyến dự kiến, điểm đã đến và điểm tiếp theo; không hiển thị xe chạy trực tiếp hay cảnh báo mất GPS.
- Đã check-in mọi điểm mới chuyển DELIVERING. Xác nhận từng ngựa xuống xe và ghi km cuối.
- Khách hàng của đơn ký POD sau check-in điểm giao, đủ giao ngựa/km/chứng từ và không có sự cố mở. Không yêu cầu tọa độ hay quyền vị trí.
- Driver chỉ chuyển COMPLETED sau khi khách ký POD; hệ thống cập nhật trạng thái đơn và địa điểm ngựa.
- SOS ghi mô tả và điểm check-in gần nhất làm thông tin tham khảo, không coi đó là vị trí sự cố hiện tại.
- API mô phỏng trả 410. gps:update không nhận dữ liệu định vị. Quyền vị trí Android được chặn; cần build lại app native nếu đang sử dụng bản cũ.
