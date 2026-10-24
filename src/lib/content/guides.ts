type Section = { title: string; text: string };
type Article = { title: string; intro: string; sections: Section[] };
type Guide = { slug: string; vi: Article; en: Article };

export const guides: Guide[] = [
    {
        slug: 'whatIsTubeAmp',
        vi: { title: 'Ampli đèn là gì?', intro: 'Một vài khái niệm để bạn đọc thông tin thiết bị và trao đổi với cửa hàng dễ hơn.', sections: [
            { title: 'Bóng đèn điện tử trong ampli', text: 'Ampli đèn sử dụng bóng đèn điện tử trong mạch khuếch đại tín hiệu. Một thiết bị có thể dùng nhiều loại bóng với chức năng khác nhau. Tên ampli hoặc hình dáng bóng chưa đủ để xác định bóng thay thế.' },
            { title: 'Trước khi chọn linh kiện', text: 'Chuẩn bị tên và model thiết bị, mã in trên bóng hoặc linh kiện cũ, cùng ảnh rõ ký hiệu. Đối chiếu tài liệu của nhà sản xuất thiết bị trước khi chọn mua. Cửa hàng có thể cung cấp thêm ảnh và thông tin của sản phẩm đang bán.' },
            { title: 'Sử dụng và sửa chữa', text: 'Làm theo hướng dẫn của nhà sản xuất. Không tự mở máy hoặc thay linh kiện bên trong nếu bạn chưa có chuyên môn; thiết bị có thể còn điện áp nguy hiểm sau khi tắt. Nhờ kỹ thuật viên kiểm tra khi cần sửa chữa.' },
        ] },
        en: { title: 'What is a tube amplifier?', intro: 'Basic terms to help you read equipment information and discuss a purchase.', sections: [
            { title: 'Vacuum tubes in an amplifier', text: 'A tube amplifier uses vacuum tubes in its signal amplification circuits. An amplifier may use several tube types for different purposes. Appearance or the amplifier name alone does not establish replacement compatibility.' },
            { title: 'Before choosing a component', text: 'Prepare the equipment model, the markings on the original component, and clear photographs. Check the equipment manufacturer’s documentation before purchasing. Ask the store for photographs and details of the item offered.' },
            { title: 'Use and repairs', text: 'Follow the manufacturer’s instructions. Do not open equipment or replace internal components without appropriate expertise: dangerous voltage may remain after power is off. Have a qualified technician inspect equipment that needs repair.' },
        ] },
    },
    {
        slug: 'seVsPp',
        vi: { title: 'SE và PP: đọc thông tin ampli', intro: 'SE và PP mô tả cách tổ chức tầng khuếch đại, không phải mã bóng thay thế.', sections: [
            { title: 'Hai thuật ngữ thường gặp', text: 'SE là viết tắt của Single-Ended; PP là Push-Pull. Đây là hai cách bố trí mạch khuếch đại. Không thể kết luận chất lượng âm thanh hay độ phù hợp của một linh kiện chỉ từ hai chữ này.' },
            { title: 'Khi mua bóng hoặc linh kiện', text: 'Ưu tiên mã bóng, thông số và yêu cầu trong tài liệu thiết bị. Hai ampli cùng được gọi là SE hoặc PP vẫn có thể dùng linh kiện khác nhau. Không xem tên topology là bằng chứng có thể thay trực tiếp.' },
            { title: 'Thông tin nên gửi cửa hàng', text: 'Gửi model ampli, mã bóng hiện tại và sản phẩm bạn đang xem. Nếu cần thay linh kiện trong mạch, hãy để kỹ thuật viên xác nhận yêu cầu trước khi đặt hàng.' },
        ] },
        en: { title: 'Reading SE and PP amplifier descriptions', intro: 'SE and PP describe circuit arrangements, rather than replacement tube codes.', sections: [
            { title: 'Two common terms', text: 'SE stands for Single-Ended and PP for Push-Pull. These describe amplifier circuit arrangements. Neither term alone determines sound quality or component compatibility.' },
            { title: 'Buying a replacement', text: 'Check tube codes, specifications and the equipment documentation first. Two SE or PP amplifiers may require different components. Topology alone does not establish a direct replacement.' },
            { title: 'What to send the store', text: 'Share the amplifier model, existing tube markings and the listing you are considering. Ask a technician to confirm circuit component requirements before ordering.' },
        ] },
    },
    {
        slug: 'tubeTypes',
        vi: { title: 'Chọn đúng mã bóng đèn điện tử', intro: 'Mã bóng, tình trạng và đơn vị bán cần được kiểm tra trước khi đặt hàng.', sections: [
            { title: 'Đọc đầy đủ mã bóng', text: 'Ghi lại cả chữ, số và hậu tố trên bóng cũ. Các mã như 300B, 2A3, EL34 hoặc KT88 là những tên bóng khác nhau; không tự coi chúng là có thể đổi chỗ cho nhau. Kiểm tra tài liệu đúng model thiết bị.' },
            { title: 'Một bóng, một cặp hay một bộ?', text: 'Xem đơn vị bán trong mô tả và phân loại. Ảnh có nhiều bóng không có nghĩa giá hiển thị là cho toàn bộ số bóng trong ảnh. Nếu chưa rõ, hỏi cửa hàng trước khi chọn số lượng.' },
            { title: 'Xác nhận đúng sản phẩm', text: 'Đối chiếu thương hiệu, mã bóng, tình trạng mới hay đã qua sử dụng, ảnh thực tế và thông tin đo kiểm nếu có. Chỉ coi là cặp được ghép thông số khi mô tả hoặc cửa hàng xác nhận rõ.' },
        ] },
        en: { title: 'Choosing the correct vacuum tube code', intro: 'Check the tube code, condition and sale unit before ordering.', sections: [
            { title: 'Read the complete code', text: 'Record all letters, numbers and suffixes on the original tube. Codes such as 300B, 2A3, EL34 and KT88 identify different tubes; do not assume they are interchangeable. Consult documentation for the exact equipment model.' },
            { title: 'One tube, a pair or a set?', text: 'Check the description and selected option for the sale unit. Several tubes in a photograph do not mean the price covers every tube pictured. Ask before choosing a quantity if the unit is unclear.' },
            { title: 'Confirm the item', text: 'Compare brand, tube code, new or used condition, actual photographs and any available measurements. Treat a pair as matched only when the listing or store explicitly confirms it.' },
        ] },
    },
    {
        slug: 'speakerMatching',
        vi: { title: 'Kiểm tra thông tin khi phối ghép loa', intro: 'Chuẩn bị thông tin thiết bị để trao đổi cụ thể, thay vì chọn chỉ theo tên thương hiệu.', sections: [
            { title: 'Thông tin cần có', text: 'Ghi lại model loa, model ampli và hướng dẫn kết nối của từng thiết bị. Dùng thông số do nhà sản xuất công bố thay vì suy đoán từ kích thước hoặc hình dáng.' },
            { title: 'Kiểm tra trước khi kết nối', text: 'Thực hiện đúng hướng dẫn của nhà sản xuất về đầu nối và tải loa. Không tự thử đổi dây hoặc thay bóng để khắc phục khi chưa xác định nguyên nhân. Nếu không chắc cách nối, nhờ người có chuyên môn kiểm tra.' },
            { title: 'Khi cần hỗ trợ mua linh kiện', text: 'Gửi thông tin thiết bị và mục đích sử dụng qua nút Tư vấn sản phẩm. Cửa hàng hỗ trợ thông tin linh kiện đang bán; việc xác định thay thế trong mạch cần được kỹ thuật viên xác nhận.' },
        ] },
        en: { title: 'Information to check when matching speakers', intro: 'Use equipment details rather than brand names alone to discuss a setup.', sections: [
            { title: 'Gather the details', text: 'Record the speaker and amplifier models and their connection instructions. Use manufacturer specifications rather than assumptions based on size or appearance.' },
            { title: 'Before connecting', text: 'Follow the manufacturer’s requirements for terminals and speaker loads. Do not experiment with wiring or replacement tubes to resolve an unidentified problem. Ask a qualified person to check uncertain connections.' },
            { title: 'Component purchase support', text: 'Send equipment details and your intended use through Product consultation. The store can provide information about its components; a technician should confirm circuit replacement requirements.' },
        ] },
    },
    {
        slug: 'roomAcoustics',
        vi: { title: 'Chuẩn bị không gian đặt thiết bị', intro: 'Ưu tiên vị trí đặt và điều kiện sử dụng theo tài liệu thiết bị.', sections: [
            { title: 'Chỗ đặt phù hợp', text: 'Đặt thiết bị trên bề mặt vững, tránh nước và nguồn nhiệt. Giữ khoảng thoáng và điều kiện thông gió đúng hướng dẫn nhà sản xuất; không che các khe thoát nhiệt.' },
            { title: 'Bố trí và thử nghe', text: 'Ghi lại vị trí hiện tại của loa và chỗ ngồi, rồi thay đổi từng yếu tố khi thử nghe ở mức âm lượng phù hợp. Kết quả phụ thuộc thiết bị và căn phòng; không có một bố trí cố định phù hợp với mọi hệ thống.' },
            { title: 'Mua sắm online tại cửa hàng', text: 'Cửa hàng hiện bán online. Bạn có thể gửi ảnh, model thiết bị và câu hỏi qua Zalo, Messenger hoặc nút Tư vấn sản phẩm để trao đổi trước khi mua linh kiện.' },
        ] },
        en: { title: 'Preparing a space for your equipment', intro: 'Start with placement and operating conditions specified by the manufacturer.', sections: [
            { title: 'Suitable placement', text: 'Use a stable surface away from water and external heat sources. Keep the clearance and ventilation specified in the manufacturer’s instructions and do not cover ventilation openings.' },
            { title: 'Placement and listening', text: 'Record your current speaker and listening positions, then change one factor at a time at a suitable listening level. Results depend on equipment and room conditions; no single arrangement fits every system.' },
            { title: 'Online shopping support', text: 'The store currently sells online. Send photographs, equipment models and questions through Zalo, Messenger or Product consultation before buying a component.' },
        ] },
    },
    {
        slug: 'maintenance',
        vi: { title: 'Sử dụng và bảo quản thiết bị đèn', intro: 'Tham khảo đúng hướng dẫn của thiết bị, đặc biệt khi có dấu hiệu hoạt động bất thường.', sections: [
            { title: 'Làm theo tài liệu thiết bị', text: 'Đọc hướng dẫn về vận hành, vệ sinh, thông gió và lịch bảo dưỡng nếu nhà sản xuất có quy định. Tắt thiết bị và để nguội theo hướng dẫn trước khi vệ sinh bên ngoài.' },
            { title: 'Khi có bất thường', text: 'Nếu có khói, mùi khét hoặc dấu hiệu hỏng, ngừng sử dụng và nhờ kỹ thuật viên kiểm tra. Không tự mở máy; bên trong có thể còn điện áp nguy hiểm ngay cả sau khi rút điện.' },
            { title: 'Chuẩn bị khi mua linh kiện thay thế', text: 'Nhờ kỹ thuật viên xác định mã và yêu cầu linh kiện. Khi nhận hàng, đối chiếu mã, phân loại và số lượng với đơn đặt; liên hệ cửa hàng nếu có điểm chưa đúng trước khi sử dụng.' },
        ] },
        en: { title: 'Using and caring for tube equipment', intro: 'Follow the documentation for your equipment, especially when operation seems abnormal.', sections: [
            { title: 'Follow the equipment documentation', text: 'Read the instructions for operation, cleaning, ventilation and any specified maintenance schedule. Turn equipment off and allow it to cool as instructed before cleaning the exterior.' },
            { title: 'Abnormal operation', text: 'Stop using equipment if you notice smoke, a burning smell or signs of failure, and have a qualified technician inspect it. Do not open the enclosure: dangerous voltage may remain even after unplugging.' },
            { title: 'Preparing a replacement purchase', text: 'Have a technician identify the required component code and specifications. On delivery, compare the code, option and quantity with your order, and contact the store about discrepancies before use.' },
        ] },
    },
];
