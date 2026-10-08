# Rà soát unhappy case xuyên suốt CBRT

Ngày: 07/10/2026. Phạm vi: mã nguồn đang có trong working tree, bao gồm các thay đổi chưa commit và module operationsWorkflow mới. Đây là đánh giá, chưa sửa logic nghiệp vụ.

## Kết luận và giới hạn

Chưa đủ điều kiện tin cậy để vận hành chuyến thực chỉ dựa trên các happy case hiện tại. Rủi ro cao nhất là bỏ sót SOS, hoàn tất giao nhận sai, trạng thái thanh toán không khớp và truy cập dữ liệu ngoài quyền.

Đã đọc các luồng backend, HTTP/socket/offline, các màn hình web/mobile liên quan, schema và test; chạy 57 test cô lập (không chạy integration ghi database). Đã thực hiện bốn kiểm chứng bằng mock trong tiến trình riêng, không sửa dữ liệu thật. Chưa kiểm thử thiết bị thật, mất sóng trên đường, thanh toán ngân hàng thật, tải lớn, khôi phục backup hoặc hạ tầng triển khai. Không thể chứng minh đã bao phủ mọi tổ hợp lỗi ngoài thực tế.

Phân loại bằng chứng:
- **Xác nhận**: thấy trực tiếp đường thực thi trong code, không đồng nghĩa đã tái hiện trên môi trường production.
- **Tái hiện cô lập**: chạy hàm thật với dữ liệu/mock kiểm soát.
- **Thiếu quy trình**: chưa thấy cơ chế đầy đủ trong phạm vi đã đọc; cần chốt nghiệp vụ và kiểm thử.
- **Điều kiện triển khai**: phụ thuộc cấu hình/hạ tầng, chưa xác minh ngoài repository.

Mức độ: **P1** cần xử lý trước vận hành thật; **P2** cần xử lý để tránh gián đoạn, sai dữ liệu hoặc trải nghiệm lỗi. Không gán P0 khi chưa có bằng chứng sự cố đang xảy ra.

## Những phát hiện cần xử lý trước

### 1. SOS không đến màn hình điều phối theo luồng thực tế — P1, xác nhận

Mobile `sos.tsx` gửi HTTP `/incidents/sos`; `triggerSOS` chỉ ghi Incident/Route, không phát socket. Nhánh sync cũng không phát. Nhánh socket phát `sos:alert_broadcast`, nhưng `SOSAlerts.jsx:49` nghe `sos:broadcast_alert`. Màn hình này tải ban đầu/làm mới, không có polling dự phòng và đang chỉ đọc. Câu “Trung tâm điều phối đã nhận” trên mobile mới chứng minh API nhận, không chứng minh có người tiếp nhận.

Cần dùng một service SOS chung cho HTTP/socket/sync; gửi thông báo bền vững, thống nhất event/payload, nút tiếp nhận/xử lý, retry và escalations khi chưa có người xác nhận. Tiêu chí: SOS HTTP và offline đều xuất hiện trên màn hình đang mở; mất socket rồi nối lại không mất cảnh báo; phân biệt đã gửi/đã nhận bởi hệ thống/đã được nhân viên tiếp nhận.

### 2. Có thể hoàn tất chuyến ngoài điểm giao và không có POD — P1, tái hiện cô lập

`operationsWorkflow.js:32` kiểm tra trạng thái, odometer, unloadedAt và giấy tờ, không kiểm tra GPS, khoảng cách, độ mới/độ chính xác tọa độ hoặc POD. `routeController.js:318` dùng điều kiện này rồi cho chuyển COMPLETED; mobile có nút chuyển tương ứng. `orderController.js:349` cũng có nhánh hoàn tất riêng. `podController.js:15` nhận tọa độ người gọi cung cấp nhưng không đối chiếu điểm giao. `horseLocationService.js` sau đó cập nhật mọi ngựa về destinationStopId dự kiến.

Kiểm chứng: route nội địa DELIVERING có km đầu/cuối, một ngựa đã đánh dấu dỡ, không GPS, không POD, không tài liệu → `deliveryProblem` trả `null` (không có lỗi).

Cần một đường hoàn tất chung yêu cầu bằng chứng giao nhận, vị trí đủ mới và trong vùng giao, đủ định danh/tình trạng từng ngựa, không còn sự cố chặn. Đổi điểm giao phải có chấp thuận và lịch sử. Tiêu chí: HTTP trạng thái, POD và sync đều từ chối cùng một trường hợp giao sai địa điểm; không cập nhật vị trí ngựa trước khi hoàn tất hợp lệ.

### 3. Đóng một sự cố tự cho chạy tiếp dù còn sự cố khác — P1, xác nhận

`incidentController.js:163` đổi route INCIDENT_HANDLING về IN_TRANSIT khi một Incident RESOLVED/CLOSED, không kiểm tra các Incident còn mở. OPEN có thể chuyển thẳng CLOSED, không bắt buộc resolutionNotes. Không lưu giai đoạn trước sự cố để khôi phục đúng (có thể là đang giao). `updateTripStatus` cũng cho INCIDENT_HANDLING → IN_TRANSIT mà không kiểm tra incident còn mở. SOS HTTP/socket/sync không chặn ghi đè chuyến COMPLETED/CANCELLED bằng INCIDENT_HANDLING.

Tiêu chí: có hai sự cố, xử lý một sự cố không được mở lại chuyến; sự cố gửi trễ của chuyến đã kết thúc không làm lùi trạng thái; tiếp tục phải có lý do/quyết định và đúng quyền.

### 4. Socket SOS thiếu kiểm tra người được phân công — P1, xác nhận

`socket/sosSocket.js:9` kiểm tra quyền sos:trigger nhưng không kiểm tra driverId/escortId của chuyến, trong khi HTTP có kiểm tra. Một tài xế biết ID chuyến khác có thể báo SOS và đổi trạng thái/vị trí chuyến đó. Kiểm tra eventId trùng cũng cần ràng buộc chủ thể/chuyến trước khi trả dữ liệu.

Tiêu chí: tài xế không được phân công bị chặn giống nhau trên HTTP/socket/sync; duplicate event không trả dữ liệu chuyến ngoài quyền.

### 5. Cảnh báo lệch tuyến và dừng lâu không đúng — P1, xác nhận + tái hiện cô lập

`routeDeviationService.js:39` đo khoảng cách tới waypoint gần nhất, không tới đường đi. Đi đúng đoạn giữa hai điểm vẫn báo lệch. Kiểm chứng hai điểm [0,0] và [1,0], xe [0.5,0] trên chính đoạn nối bị tính cách tuyến 55.597 km.

`gpsSocket.js:140` ghi đè currentLocation bằng vị trí mới trước khi gọi `processRouteDeviation` ở dòng 149; nhánh phát hiện dừng so với chính thời điểm mới nên thời gian bằng 0. Ngay cả nếu đổi thứ tự, so từng GPS liền kề cũng chưa theo dõi được tổng thời gian dừng 30 phút. Timestamp client chưa được chặn cũ/tương lai; không thấy watchdog báo mất GPS độc lập với gói GPS mới.

Tiêu chí: đi đúng đường không báo sai; dừng 31 phút với GPS mỗi 10 giây phải báo; mất GPS 31 phút có cảnh báo mất tín hiệu riêng; gói cũ không ghi đè vị trí mới.

### 6. Đã thu tiền nhưng đơn không được cập nhật, retry không cứu được — P1, tái hiện cô lập

`paymentController.js:86` lưu PaymentTransaction PAID trước rồi mới cập nhật Order. Nếu cập nhật Order lỗi, callback tiếp theo gặp transaction không PENDING tại dòng 75 và kết thúc.

Kiểm chứng mock Order.updateOne lỗi: giao dịch giữ PAID; callback lặp trả code 02; chỉ có một lần thử cập nhật đơn. Cần transaction DB hoặc cơ chế phục hồi/đối soát idempotent theo trạng thái hai bên. Tiêu chí: ngắt tại mỗi bước ghi rồi gửi lại callback phải hội tụ về một kết quả đúng, không mất tiền ghi nhận.

### 7. Callback đến trễ, hai phiên thanh toán, hoàn tiền — P1, xác nhận

`getPayment` có thể tự ghi EXPIRED; callback thành công đến sau bị loại bởi điều kiện chỉ nhận PENDING. Ngược lại callback thành công của giao dịch còn PENDING cập nhật đơn mà không lọc trạng thái đơn đã CANCELLED/REJECTED; tiền cọc có thể chuyển từ REFUND_PENDING về PAID. Tạo phiên thanh toán dùng findOne rồi create; schema chỉ unique txnRef, chưa khóa một phiên còn hiệu lực cho cùng order/purpose. Hai request đồng thời có thể tạo hai URL và khách có thể trả hai lần.

Các trạng thái REFUND_PENDING/REFUNDED tồn tại nhưng chưa tìm thấy service/API đối soát và hoàn tiền hoàn chỉnh. Hủy/từ chối chủ yếu đánh dấu cọc, chưa có quyết toán rõ phần đã trả đủ, phí phát sinh và bồi thường.

Tiêu chí: xử lý thành công đến sau timeout/hủy bằng đối soát; khóa tạo phiên song song; tiền thu thừa có hồ sơ hoàn trả; không báo “đã hoàn” khi chỉ đổi cờ nội bộ.

### 8. Thiếu giấy tờ vẫn vượt cổng kiểm tra — P1, tái hiện cô lập

`operationsWorkflow.js:17` dùng `.every()` trên tài liệu hiện có; mảng rỗng trả true. Endpoint checklist hiện dùng `complianceRequestController`, không tự khởi tạo bộ giấy tờ bắt buộc của controller cũ. Nếu nghiệp vụ yêu cầu tài liệu bắt buộc mà chưa ai tạo yêu cầu, cổng kiểm tra vẫn thông qua. Kiểm chứng `stageReady(order, 'DEPARTURE')` với danh sách rỗng trả true.

Cần đánh giá đủ bộ yêu cầu theo tuyến/ngựa/giai đoạn, không chỉ kiểm tra tài liệu tình cờ đã tồn tại; trường hợp không cần giấy tờ phải được thể hiện rõ. Quy định cụ thể của từng quốc gia cần xác nhận riêng, không suy từ các hằng số demo.

### 9. Quyền xem/ghi dữ liệu chưa kiểm tra nhất quán — P1, xác nhận

- `podRoutes.js` GET chỉ protect; `podController.js:115` không kiểm tra quan hệ với chuyến/đơn → tài khoản khác biết tripId có thể đọc POD và dữ liệu populate.
- `healthLogRoutes.js` GET chỉ protect; controller không lọc theo quyền sở hữu/phân công → người đăng nhập có thể đọc nhật ký ngoài phạm vi.
- `healthLogController.js:31` kiểm tra route tồn tại nhưng không kiểm tra người được phân công và horseId có thuộc đơn. Nhánh HEALTH_LOG trong sync còn không kiểm tra route tồn tại.
- `orderController.getOrders/getOrderById` chỉ giới hạn ownership khi role CUSTOMER; DRIVER/ESCORT không bị giới hạn theo phân công ở các endpoint đọc đơn vốn chỉ yêu cầu protect.

Tiêu chí: ma trận quyền theo tài nguyên cho mọi endpoint; không chỉ ẩn nút frontend. Không suy rằng sự cố SOS cũng bị đọc công khai: endpoint list incidents hiện có sos:manage.

### 10. Ghi nhiều tài nguyên từng bước gây trạng thái dở dang — P1, xác nhận

`podController.signPOD`: tạo POD → lưu Route → lưu Order → đổi vị trí Horse. Nếu chết giữa chừng, lần sau gặp POD đã tồn tại hoặc giai đoạn không hợp lệ; chưa có phục hồi. Nhánh sync có thể trả duplicate SUCCESS trước khi sửa phần còn thiếu. Tương tự Incident tạo xong nhưng lưu Route lỗi; các nhánh cập nhật Order/Route không dùng chung giao dịch và có thể ghi đè nhau.

Tiêu chí: fault injection tại từng bước của POD/SOS/trip update/payment, retry an toàn và trạng thái hội tụ; unique index chống trùng không thay thế cơ chế phục hồi nghiệp vụ.

## Rà soát theo thứ tự luồng đầu → cuối

| ID | Giai đoạn / tình huống xấu | Đánh giá hiện tại và việc cần làm | Mức |
|---|---|---|---|
| A01 | Brute force đăng nhập, spam đăng ký/upload | Chưa thấy rate limit/quota ở app/routes đã đọc. Kiểm tra thêm gateway; thêm giới hạn theo tài khoản/IP và cảnh báo. | P1, điều kiện triển khai |
| A02 | Thiếu JWT secret trong cấu hình | HTTP, socket và auth có secret mặc định biết trước trong code. Deployment phải fail-fast khi thiếu secret an toàn; chưa kiểm tra giá trị secret thực tế. | P1, điều kiện triển khai |
| A03 | Đổi mật khẩu/khóa tài khoản khi socket còn mở | Socket xác thực tại handshake, giữ user/quyền trong bộ nhớ; chưa revalidate ở mỗi sự kiện. Đổi mật khẩu không thu hồi các RefreshTokenSession. Cần quy tắc thu hồi phiên và ngắt socket. | P1, xác nhận |
| A04 | Quản lý xóa tài xế/khách đang có chuyến | userController.deleteUser xóa cứng không kiểm tra đơn/chuyến, làm mất tham chiếu và khả năng thao tác. Cần vô hiệu hóa có kiểm tra phân công. | P1, xác nhận |
| A05 | Tạo nhân viên thất bại | createUser không truyền username nhưng schema yêu cầu username; có fallback mật khẩu 123456. Cần sửa hợp đồng tạo tài khoản và cấp mật khẩu an toàn. | P2, xác nhận |
| H01 | Customer sửa hồ sơ sau khi đặt chuyến, tiêm phòng hết hạn trước ngày chạy | updateHorse cho sửa currentStopId/nhận dạng, reset review; start trip không tái kiểm tra reviewStatus/tiêm phòng/phiên bản hồ sơ. Cần khóa hoặc tái thẩm định snapshot tại khởi hành. | P1, xác nhận |
| H02 | Upload nhiều ảnh lớn gây đơ máy | Các beforeUpload chạy nén đồng thời; giới hạn dung lượng file không giới hạn số pixel giải mã. Cần hàng đợi giới hạn đồng thời và ngưỡng kích thước ảnh; kiểm thử máy yếu. | P2, xác nhận đường xử lý; chưa đo RAM |
| H03 | Ảnh nhỏ/dài bị báo không nén được | imageCompression.js:37 chỉ xử lý khi cả hai chiều >=240. Ảnh hợp lệ 200x200 hoặc panorama sau resize có thể bị từ chối ngay. Cần encode ít nhất một lần, fallback định dạng phù hợp. | P2, xác nhận |
| H04 | Nén ảnh giấy tờ mất chữ | Có thể hạ quality tới 0.08. Cần kiểm tra độ đọc được, giữ PDF rõ nét hoặc ngưỡng chất lượng cho giấy tờ; file nhẹ chưa chứng minh bằng chứng đủ dùng. | P2, cần visual QA |
| H05 | Upload xong đóng tab/lưu lỗi/xóa khỏi gallery | File đã lưu database; gallery chỉ bỏ URL, chưa thấy dọn orphan/TTL/quota. Cần upload session, gắn file vào hồ sơ và dọn file chưa dùng theo thời gian. | P2, xác nhận |
| H06 | PDF đúng 5 MB bị từ chối | Frontend cho <=5 MB, backend dùng >=maxSize để từ chối. Cần đồng nhất biên PDF và kiểm tra file hỏng; chữ ký đầu file chưa chứng minh giải mã được. | P2, xác nhận |
| B01 | Một ngựa được đặt ở hai đơn đang hoạt động | createOrder chỉ kiểm tra ownership/review/stop và đơn cọc chưa trả; sau khi trả cọc có thể đặt tiếp cùng ngựa. Cần reservation theo ngựa và khoảng thời gian. | P1, xác nhận |
| B02 | Hai request tạo đơn/phân xe đồng thời | Kiểm tra rồi tạo không có khóa tài nguyên. bookingCode count-based có thể va chạm (unique index chặn trùng nhưng gây lỗi); hai đơn khác nhau có thể dùng cùng xe/người dù conflict check đều pass. | P1, xác nhận cấu trúc; chưa load test |
| B03 | Hết chỗ trên một departure | Lịch sinh các departure không mô hình hóa tổng capacity/giữ chỗ. Xe chỉ kiểm tra từng đơn lúc dispatch. Cần chốt departure là chuyến chung có quota hay khung giờ dịch vụ trước khi bổ sung sức chứa. | P2, thiếu quy tắc |
| B04 | Customer hết hạn cọc trong lúc đang trả tiền | getOrders tự hủy đơn cọc quá hạn; tạo payment/IPN có đường riêng. Cần lịch expiry nhất quán và xử lý cạnh tranh callback/expiry. | P1, xác nhận |
| B05 | API cập nhật đơn nhận ID không tồn tại | orderController.js:333 require ../models/Route trong fallback nhưng file model là TransportRoute → lỗi module thay vì 404. | P2, xác nhận |
| C01 | Tài liệu hết hạn ở cửa khẩu hoặc specialist thêm yêu cầu đúng lúc khởi hành | review/upload chủ yếu so ngày khởi hành; stage check chỉ xét tài liệu hiện có và không atomic với route update. Cần kiểm tra thời điểm sử dụng và xử lý cập nhật đồng thời. | P1, xác nhận |
| C02 | Bị giữ tại nước trung chuyển | clearanceReady khi kết thúc xét destination country; cần tuyến cửa khẩu bắt buộc có thứ tự, không chỉ các waypoint tùy chọn. HELD phải chặn tiến trình và có người xử lý/ETA. | P1, thiếu kiểm soát đầy đủ |
| D01 | Xe/nhân sự hết điều kiện sau khi đã phân công | validateAssignment so giấy xe với hiện tại, không thời điểm khởi hành dự kiến; start không tái kiểm tra xe/nhân sự. updateVehicle có thể giảm capacity mà vẫn ACTIVE. | P1, xác nhận |
| D02 | Chuyến trước bị trễ hơn 36 giờ | Conflict check dùng cửa sổ cố định 36 giờ từ ngày dự kiến; chuyến thực còn chạy lâu hơn vẫn có thể phân cho chuyến khác. Cần thời gian thực tế, buffer và kiểm tra tài nguyên đang bận. | P1, xác nhận |
| D03 | Xe hỏng/tài xế mất khả năng lái giữa đường | updateAssignment chỉ cho SCHEDULED và không đổi khi đã load ngựa. Cần luồng cứu hộ/đổi xe và chuyển giao từng ngựa có xác nhận, không sửa phân công âm thầm. | P1, thiếu quy trình |
| T01 | Ngựa ốm/chấn thương/tử vong/mất tích | HealthLog chỉ ghi nhận; chưa thấy rule chặn tiếp tục theo tình trạng hoặc liên kết bắt buộc với incident từng ngựa. Cần outcome từng ngựa, quyết định người phụ trách/thú y, lưu bằng chứng và thông báo customer. | P1, thiếu quy trình |
| T02 | GPS bị từ chối, app chạy nền hoặc mất mạng | SOS bắt buộc quyền/GPS trước khi gửi; chưa có nhánh gửi không GPS với vị trí cuối và gọi khẩn cấp. useGpsTracking dùng foreground watch, không có xác nhận server/error socket đầy đủ; trạng thái tracking không chứng minh server đã nhận. | P1, xác nhận; cần test thiết bị |
| T03 | Offline SOS không tự gửi như lời nhắn | Queue chỉ sync khi load màn hình danh sách chuyến; chưa thấy listener kết nối/background scheduler. Bắt mọi lỗi HTTP làm “không có kết nối”, gồm 403/409. Cần phân loại lỗi và retry đúng lúc, ưu tiên SOS. | P1, xác nhận |
| T04 | Đổi tài khoản trên cùng điện thoại | SQLite queue chung không ownerId; logout chỉ xóa phiên, không phân vùng queue. Người đăng nhập tiếp theo có thể thử sync sự kiện cũ dưới danh tính mới. Cần owner/session binding và hàng đợi lỗi cần xử lý. | P1, xác nhận |
| T05 | Offline event đến trễ/sai thứ tự/trùng | Waypoint sync không có sổ event idempotency, không kiểm tra giai đoạn/thứ tự; waypoint không tồn tại vẫn báo SUCCESS. Cần version, causal ordering, timestamp tin cậy và không xóa event thất bại giả. | P2, xác nhận |
| R01 | Người nhận vắng mặt/từ chối/ủy quyền | POD yêu cầu tài khoản customer dù signerRole có AUTHORIZED_RECIPIENT; chưa có quy trình ủy quyền/xác minh hoặc failed delivery. Cần giữ DELIVERING, hẹn lại/đổi điểm được duyệt. | P1, thiếu quy trình |
| R02 | Giao thiếu/nhầm ngựa hoặc ngựa bị thương | LOAD/UNLOAD dựa horseId thuộc đơn, chưa chứng minh microchip thực tế; POD cho horseConditionsOnArrival rỗng, chưa buộc đủ từng ngựa. Cần đối chiếu định danh, tình trạng, giao một phần và tranh chấp. | P1, xác nhận |
| R03 | Hủy đơn đang chạy/đã hoàn tất | cancelOrder cho người có booking:approve hủy bất kể trạng thái, không đồng bộ Route; route cancellation không cùng quy tắc refund với cancelOrder. Cần chặn terminal, thủ tục dừng an toàn và quyết toán. | P1, xác nhận |
| R04 | Đã đóng quyết toán nhưng còn sửa route | CLOSE đặt settlement.closedAt và workflow.update chặn; các controller route/order/incident riêng chưa kiểm tra cùng khóa đóng sổ. Cần guard chung và audit hiệu chỉnh sau đóng. | P1, xác nhận |
| O01 | Database/server chết, đầy đĩa, backup lỗi | Chưa kiểm chứng backup/restore, cảnh báo tài nguyên và phục hồi giao dịch dở dang. Cần diễn tập phục hồi và mục tiêu thời gian/dữ liệu có thể mất. | P1, điều kiện triển khai |
| O02 | Danh sách dữ liệu tăng lớn | Nhiều list endpoint trả toàn bộ; getHorseById tải mọi active route rồi tìm trong bộ nhớ. Cần pagination/index/query theo horse và quota upload. | P2, xác nhận; chưa benchmark |
| O03 | Token hết hạn khi đang nhập/duyệt | Web apiClient xóa phiên trên 401; backend thực tế có refresh. Cần phục hồi phiên/draft, thông báo không mất dữ liệu, không tự replay thao tác tài chính mù quáng. | P2, xác nhận |

## Những hàng rào đã có

- Đăng ký công khai khóa role CUSTOMER; HTTP tính quyền từ User trong database, chặn tài khoản inactive.
- Hồ sơ ngựa kiểm tra chủ sở hữu file; chặn tự duyệt, hồ sơ thiếu, duplicate ảnh, tiêm phòng quá hạn khi duyệt; dùng __v để chặn stale review và race cập nhật.
- Lịch cố định chặn điểm/giờ tự nhập, revision cũ và departure hết nhận đơn; tính giá ở server.
- Cần cọc trước approval và trả đủ trước dispatch; start có kiểm tra payment và một số điều kiện nhận xe/load ngựa.
- Driver REST route/SOS có kiểm tra phân công. Socket GPS có kiểm tra phân công và trạng thái chuyến.
- VNPAY kiểm tra chữ ký và số tiền; duplicate callback tuần tự được chặn. Chưa đồng nghĩa an toàn với lỗi giữa nhiều lần ghi hoặc callback song song.
- POD có unique tripId; operationsWorkflow cập nhật bằng operationsVersion; tài liệu có điều kiện trạng thái khi submit/review.

Những hàng rào này có giá trị, nhưng không áp dụng nhất quán qua mọi cửa HTTP/socket/sync và mọi nhánh thay đổi trạng thái.

## Kiểm chứng thực tế trong đợt rà soát

Lệnh chạy trong backend:

```text
node --test tests/horseProfile.test.js tests/driverAccess.test.js tests/fleetOperations.test.js tests/paymentController.test.js tests/orderDeposit.test.js tests/transportSchedule.test.js tests/vnpayService.test.js tests/complianceRequests.test.js
```

Kết quả cuối: **57 test, 54 pass, 3 fail**. Lần đầu có thêm hai lỗi EACCES localhost của sandbox; chạy lại được cấp quyền thì hai lỗi đó hết.

Ba fail còn lại:
1. `complianceRequests.test.js:9`: fixture không mock Route.findOne mà controller mới gọi → timeout 10 giây. Không kết luận production bị lỗi ownership từ test này.
2. `complianceRequests.test.js:32`: fixture không có category HORSE, controller mới chặn customer upload tài liệu pháp lý → trả 403 thay vì 200. Cần điều chỉnh fixture theo hợp đồng mới và kiểm thử dữ liệu legacy thiếu category.
3. `fleetOperations.test.js:56`: fixture thiếu acceptedAt/acceptedBy/km/load; bị chặn trước payment và thiếu errorCode PAYMENT_REQUIRED mà test mong đợi. Không chứng minh chuyến chưa trả tiền được chạy.

Bốn kiểm chứng dùng hàm thật, dependencies mock trong tiến trình riêng:
- `stageReady` với docs rỗng → `true`.
- `deliveryProblem` với route có unloadedAt nhưng không GPS/POD → `null`.
- Khoảng cách xe trên chính đoạn nối giữa hai waypoint → `55.59746332227937 km`.
- Payment callback ghi PAID rồi lỗi ghi Order → retry trả `02 Order already confirmed`, không thử ghi Order lần hai.

Không chạy các script seed/reset/verify có thể thay đổi database thật; không gửi SOS, ký POD, duyệt hồ sơ hoặc thực hiện thanh toán thật.

## Ma trận kiểm thử cần hoàn thành trước nghiệm thu

Mỗi luồng quan trọng phải chạy các biến thể: đúng quyền/sai quyền; hai người thao tác đồng thời; lặp cùng request; dữ liệu cũ; mất mạng trước/sau gửi; server chết trước/sau từng lần ghi; mất GPS/token; khôi phục và retry. Áp dụng đồng thời HTTP, socket và offline khi có.

Các bài kiểm thử xuyên suốt ưu tiên:
1. Customer tạo hồ sơ → duyệt → đặt đơn → sửa sức khỏe hoặc địa điểm → thử khởi hành; phải buộc kiểm tra lại.
2. Hai đơn cùng ngựa/cùng xe/cùng tài xế đồng thời; chỉ đặt giữ tài nguyên hợp lệ, có trả lỗi nghiệp vụ rõ ràng.
3. Thu cọc/thu đủ → callback chậm/lặp → hủy/timeout → lỗi DB giữa bước; giao dịch và đơn luôn đối soát được.
4. Chưa tạo giấy tờ, thiếu một giấy, giấy hết hạn, thêm yêu cầu giữa lúc chạy; không vượt qua cổng bắt buộc.
5. SOS trên HTTP/socket/offline, GPS không có, điện thoại chạy nền; phải phân biệt lưu cục bộ với điều phối đã tiếp nhận.
6. Hai SOS cùng chuyến, đóng một; chuyến không tự tiếp tục. SOS cũ gửi lại không mở lại chuyến hoàn tất.
7. Xe hỏng, đổi tài xế/xe, chuyển từng ngựa; giữ chain of custody và lịch sử quyết định.
8. Giao xa điểm đích, GPS cũ, khách vắng, sai người nhận, giao thiếu hoặc ngựa bị thương; không COMPLETED giả.
9. Ký POD → cắt tiến trình ở từng bước → retry; đúng một POD và Route/Order/Horse hội tụ.
10. Hủy sau thanh toán, phát sinh phụ thu, hoàn tiền/bồi thường, đóng sổ; không thu/hoàn hai lần hoặc thay đổi ngầm hồ sơ đã đóng.
11. Đăng xuất/đăng nhập người khác khi queue còn SOS/health/check-in; không gửi sự kiện dưới sai danh tính.
12. Khôi phục backup và xử lý sự kiện tới trong lúc outage; biết rõ dữ liệu nào đã nhận, chưa nhận và cần xử lý lại.

## Thứ tự khắc phục đề xuất

1. **An toàn chuyến và quyền:** SOS end-to-end, chặn giao sai/hoàn tất thiếu POD, lifecycle incident, quyền từng tài nguyên, GPS.
2. **Tiền và tính nhất quán:** callback/đối soát/refund, atomic update hoặc recovery, idempotency, reservation tài nguyên và transition guard chung.
3. **Nghiệp vụ ngoại lệ:** đổi xe/người giữa đường, giữ tại cửa khẩu, ngựa gặp nạn, giao một phần/từ chối nhận, hủy và quyết toán.
4. **Độ bền vận hành:** offline đúng tài khoản, background GPS, upload giới hạn đồng thời/dọn orphan, phục hồi phiên, pagination và diễn tập backup.

Các mục 1–2 cần regression tests cho đường bị bỏ qua và fault injection. Các mục nghiệp vụ phải chốt người có quyền quyết định, điều kiện mở lại chuyến, người đang giữ ngựa và cách thông báo customer. Báo cáo gốc là kết quả trước triển khai; xem trạng thái cập nhật bên dưới.

## Trạng thái triển khai tiếp theo — 07/10/2026

**Cập nhật mới hơn:** các mục thực hiện ngoại lệ, cứu hộ, reservation, SOS không GPS và watchdog đã được phát triển tiếp. Trạng thái chi tiết và điều kiện database nằm trong [UNHAPPY_CASE_DEPLOYMENT.md](./UNHAPPY_CASE_DEPLOYMENT.md); phần dưới giữ lại mốc trước đó để đối chiếu, không dùng làm danh sách cuối cùng.

Người dùng đã chọn: **quản lý duyệt từng trường hợp** hoàn tiền, bồi thường và đổi điểm giao. Không tự quyết số tiền hoặc tự đổi địa điểm.

### Đã bổ sung trong mã nguồn

- Chặn hoàn tất trực tiếp qua API trạng thái; customer có giao diện ký trên canvas, khai tình trạng từng ngựa, lấy GPS mới. Backend kiểm tra vị trí xe còn mới và trong 500 m điểm giao, đủ ngựa, km, hồ sơ và không có sự cố chưa xử lý. Ngựa bị thương chưa được ký theo luồng thông thường.
- Khi biên bản đã lưu nhưng cập nhật Order/Route thất bại, gửi lại có thể hoàn tất các bước còn lại mà không tạo biên bản thứ hai. Đây là cơ chế phục hồi theo retry, **chưa phải transaction nhiều collection**.
- SOS HTTP và offline phát cùng sự kiện mà màn hình điều phối đang nghe; giao diện có tiếp nhận/xử lý/giải quyết. Cấm tự tiếp tục bằng nút tài xế; khi còn sự cố khác, chuyến vẫn bị giữ. Giải quyết bắt buộc ghi lý do; không đi trực tiếp OPEN → CLOSED.
- Tách các bản ghi offline theo tài khoản tài xế; bản cũ chưa biết chủ tài khoản không được tự gửi bằng người mới. Không xếp lỗi HTTP nghiệp vụ vào hàng đợi mất mạng. Thông báo SOS phân biệt máy chủ lưu với nhân viên tiếp nhận; chưa có kết nối phải gọi trực tiếp.
- Chặn sửa hồ sơ ngựa đang có đơn hoạt động; kiểm tra lại sức khỏe, vaccine, vị trí, xe và tài xế khi khởi hành. Checklist bắt buộc không còn coi danh sách rỗng là hoàn tất; chuyên viên phải tạo/duyệt yêu cầu tại từng giai đoạn.
- Giới hạn quyền đọc đơn/POD/nhật ký sức khỏe và quyền ghi theo người được phân công; khóa user thay vì xóa lịch sử, hủy refresh token khi đổi mật khẩu, kiểm tra lại token/socket, giới hạn tần suất đăng nhập/upload.
- Callback đã PAID nhưng chưa cập nhật được Order được retry; khoản không áp dụng được cho đơn được đánh dấu cần đối soát, không hồi sinh đơn đã hủy.
- GPS cũ/tương lai bị từ chối; sửa đo dừng lâu và đo khoảng cách theo đoạn đường. Không dùng khoảng cách tới waypoint làm lệch tuyến. **Chuyến chưa có plannedPath chưa được phát hiện lệch tuyến tự động.**
- Nén ảnh theo hàng đợi để tránh giải mã nhiều ảnh đồng thời; giới hạn độ phân giải ảnh đầu vào. Đây không phải bảo đảm tuyệt đối chống hết RAM trên mọi thiết bị.
- Yêu cầu ngoại lệ có lý do, mã/mô tả chứng từ, số tiền hoặc điểm đề nghị; chỉ quản lý duyệt/từ chối và phải ghi lý do. Khách xem quyết định trên trang đơn. **Chưa có thông báo chủ động, chưa chuyển tiền, chưa đổi điểm giao và chưa có bước ghi nhận thực hiện ngoại lệ**. Yêu cầu chưa hoàn tất chặn đóng quyết toán; đây là hạng mục tiếp tục, không phải luồng đã nghiệm thu đầy đủ.

### Kiểm chứng đã chạy

- 65/65 kiểm thử thuộc 9 file chọn lọc chạy thành công, gồm 8 kiểm thử unhappy case mới. Một số bài dùng mock controller/model, không chứng minh tính nguyên tử trên MongoDB thật.
- Frontend `npm run build`: thành công; vẫn cảnh báo bundle JS lớn (~1.64 MB chưa gzip).
- Mobile `npx tsc --noEmit`: thành công.
- `git diff --check`: không lỗi khoảng trắng (có cảnh báo LF/CRLF).
- Chưa thử end-to-end bằng trình duyệt/điện thoại thật, chưa diễn tập tắt tiến trình/mất mạng, chưa chạy thanh toán thật hay thay đổi database thật.

### Chưa hoàn thành — không coi là production-ready

1. Thực hiện và đối soát hoàn tiền/bồi thường đã duyệt; áp dụng đổi điểm giao với chứng từ, tuyến/GPS/hồ sơ/custody nhất quán; thông báo khách chủ động.
2. Reservation nguyên tử chống cùng ngựa/xe/tài xế bị đặt đồng thời; khóa chuyển trạng thái và transaction/recovery cho mọi aggregate, không chỉ POD/payment retry.
3. Hủy chuyến đã phân công, xe cứu hộ/chuyển ngựa, giao một phần, người nhận ủy quyền và ngựa bị thương cần luồng xử lý chuyên biệt.
4. SOS không có GPS, cảnh báo không ai tiếp nhận/escalation; GPS chạy nền/watchdog mất tín hiệu, nạp đường dự kiến vào plannedPath; đồng bộ offline tự động và giao diện sửa sự kiện lỗi.
5. Chống giả GPS/chữ ký, token truy cập sau đổi mật khẩu, notification bền vững, dọn file orphan, kiểm thử tải/backup và khôi phục database.

Các chốt mới cố ý từ chối các tình huống chưa được xử lý, nhưng **từ chối an toàn không đồng nghĩa đã cung cấp đầy đủ luồng phục hồi**. Cần hoàn thiện các mục còn lại trước khi tuyên bố xử lý toàn bộ unhappy case.
