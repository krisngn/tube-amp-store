import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './service.module.css';

export const metadata: Metadata = {
    title: 'Quy Trình Kiểm Tra Kỹ Thuật & Dịch Vụ | Vintage Audio Accessories',
    description: 'Quy trình 6 bước đo kiểm nhiễu/hum, test đèn và chạy rà burn-in nghiêm ngặt trước khi bàn giao tới tay khách hàng.',
};

export default function ServicePage() {
    const steps = [
        {
            number: '01',
            title: 'Kiểm Định Ngoại Quan & Linh Kiện Gốc',
            description:
                'Kiểm tra tình trạng vỏ máy, cọc loa, ngõ vào RCA, volume attenuator và công tắc nguồn. Soi mạch linh kiện bên trong, đảm bảo tụ lọc, biến áp nguồn và biến áp xuất âm (OPT) nguyên bản hoặc được nâng cấp đúng tiêu chuẩn kỹ thuật audiophile.',
        },
        {
            number: '02',
            title: 'Đo Kiểm Bóng Đèn Trên Máy Chuyên Dụng',
            description:
                'Từng bóng công suất (300B, EL34, KT88, 2A3...) và bóng tiền khuếch đại (12AX7, 6SN7, 12AU7...) đều được đưa lên máy đo bóng chuyên dụng để kiểm tra độ phát xạ (emission), hỗ dẫn (transconductance) và độ rò lưới. Chỉ ghép các cặp bóng đạt độ cân bằng trên 95%.',
        },
        {
            number: '03',
            title: 'Đo Nhiễu Ồn & Hum Nền (Noise Floor)',
            description:
                'Kết nối ampli với tải giả 8Ω và máy phân tích âm học oscilloscope để đo mức hum nền. Tiêu chuẩn khắt khe: độ ồn nền < 0.5mV, đảm bảo cắm vào loa độ nhạy cao (92dB - 100dB như Altec, Tannoy, Klipsch) vẫn êm như tờ, không tiếng vo ve khó chịu.',
        },
        {
            number: '04',
            title: 'Cân Chỉnh Bias & Cân Bằng Kênh (Balance)',
            description:
                'Cân chỉnh dòng tĩnh (Bias) chuẩn xác theo điện áp lưới Việt Nam (220V). Kiểm tra công suất phát đều ở cả 2 vế trái - phải trên dải tần 20Hz - 20kHz nhằm đảm bảo âm hình sân khấu rộng mở, chuẩn xác vị trí nhạc cụ.',
        },
        {
            number: '05',
            title: 'Chạy Rà (Burn-in) Liên Tục 6 - 8 Giờ',
            description:
                'Ampli được hoạt động liên tục ở mức tải danh định trong phòng kiểm tra nhiệt độ để theo dõi độ ổn định nhiệt của biến áp nguồn và tụ hóa, loại bỏ hoàn toàn các nguy cơ sụt áp hay chạm chập tiềm ẩn.',
        },
        {
            number: '06',
            title: 'Đóng Gói Chống Sốc Gia Cố 5 Lớp',
            description:
                'Tháo bóng và đóng hộp riêng từng quả có bọc bubble wrap. Thân ampli được chèn foam nguyên khối 6 mặt và bọc màng PE chống ẩm, đặt trong thùng carton chịu lực 5 lớp nẹp góc cứng cáp sẵn sàng giao an toàn tới mọi miền đất nước.',
        },
    ];

    return (
        <div className={styles.servicePage}>
            <div className="container">
                {/* Breadcrumb */}
                <nav className={styles.breadcrumb}>
                    <Link href="/">Trang chủ</Link>
                    <span>/</span>
                    <span>Quy trình kiểm tra kỹ thuật</span>
                </nav>

                {/* Hero Header */}
                <div className={styles.heroSection}>
                    <div className={styles.badge}>Tiêu Chuẩn Audiophile Nghiêm Ngặt</div>
                    <h1 className={styles.heroTitle}>Quy Trình Kiểm Tra & Dịch Vụ Kỹ Thuật</h1>
                    <p className={styles.heroSubtitle}>
                        Chơi ampli đèn đòi hỏi sự tinh tế và am hiểu kỹ thuật. Tại Vintage Audio Accessories, mỗi thiết bị đến tay bạn đều là một tác phẩm được kiểm âm, đo đạc và chăm sóc kỹ lưỡng trước khi giao đến bạn.
                    </p>
                </div>

                {/* Steps Grid */}
                <div className={styles.stepsGrid}>
                    {steps.map((step) => (
                        <div key={step.number} className={styles.stepCard}>
                            <div className={styles.stepNumber}>{step.number}</div>
                            <h3 className={styles.stepTitle}>{step.title}</h3>
                            <p className={styles.stepDesc}>{step.description}</p>
                        </div>
                    ))}
                </div>

                {/* Showroom & Experience CTA */}
                <div className={styles.ctaBox}>
                    <div className={styles.ctaLeft}>
                        <h3>Hỗ Trợ Mua Hàng Online</h3>
                        <p>
                            Bạn cần thêm thông tin về tình trạng sản phẩm, thông số hoặc cách sử dụng? Hãy liên hệ qua Zalo hoặc để lại lời nhắn để được hỗ trợ từ xa.
                        </p>
                        <div className={styles.ctaContactRow}>
                            <Link href="/contact">Để lại lời nhắn</Link>
                            <span>📞 Hotline: 0931 772 150</span>
                            <span>⏱ 08:30 - 21:00 hàng ngày</span>
                        </div>
                    </div>
                    <div className={styles.ctaRight}>
                        <a
                            href="https://zalo.me/0931772150"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                        >
                            Nhắn Zalo Tư Vấn
                        </a>
                        <a href="tel:0931772150" className="btn btn-secondary">
                            Gọi Hotline: 0931 772 150
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
