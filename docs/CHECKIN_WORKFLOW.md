# Theo dõi hành trình bằng check-in

- Driver tiếp nhận chuyến, xác nhận từng ngựa lên xe và ghi km đầu rồi khởi hành.
- Driver xác nhận ARRIVED lần lượt từng điểm. Backend lưu actualArrival theo thời gian máy chủ, không nhận vị trí thiết bị và không sinh vị trí xe giả.
- Không được bỏ qua điểm, và không xác nhận đến điểm kế tiếp sớm hơn thời gian di chuyển tối thiểu (tính theo khoảng cách và 50% thời gian dự kiến của chặng). Check-in gửi qua đồng bộ offline (`/sync/events`) phải tuân theo đúng các luật này.
- Web hiển thị tuyến dự kiến, điểm đã đến và điểm tiếp theo; không hiển thị xe chạy trực tiếp hay cảnh báo mất GPS.
- Đã check-in mọi điểm mới chuyển DELIVERING. Xác nhận từng ngựa xuống xe và ghi km cuối.
- Ký POD (biên bản giao nhận) khi đã check-in điểm giao, giao đủ từng ngựa, ghi km cuối, đủ chứng từ và không còn sự cố mở. Không yêu cầu tọa độ hay quyền vị trí. Có hai cách ký:
  - Khách hàng của đơn ký trên web (trang chi tiết đơn).
  - Người nhận tại điểm giao (người nhận ủy quyền, quản lý chuồng, chủ ngựa hoặc bác sĩ thú y) ký trên app của tài xế/phụ xe được phân công. Biên bản ghi `collectedVia = CREW_DEVICE`.
- Chỉ nhận tình trạng ngựa Rất tốt / Tốt / Căng thẳng nhẹ. Ngựa bị thương thì báo SOS để xử lý trước.
- Driver chỉ chuyển COMPLETED khi đã có POD (backend trả `POD_REQUIRED` nếu chưa); hệ thống cập nhật trạng thái đơn và địa điểm ngựa.
- Đơn bị từ chối/hủy khi đã thu tiền: hệ thống tự tạo yêu cầu hoàn tiền đã duyệt. Quản lý chuyển tiền rồi ghi mã chứng từ ở mục Yêu cầu ngoại lệ; khi hoàn đủ, đơn chuyển REFUNDED.
- SOS ghi mô tả và điểm check-in gần nhất làm thông tin tham khảo, không coi đó là vị trí sự cố hiện tại.
- API mô phỏng trả 410. gps:update không nhận dữ liệu định vị. Quyền vị trí Android được chặn; cần build lại app native nếu đang sử dụng bản cũ.
