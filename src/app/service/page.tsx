import { getLocale } from 'next-intl/server';
import Link from 'next/link';
import styles from './service.module.css';

export const metadata = {
    title: 'Hướng Dẫn Mua Hàng Online',
    description: 'Chọn bóng đèn và linh kiện audio, xác nhận phí ship, thanh toán và điều kiện hỗ trợ theo từng sản phẩm.',
};

export default async function ServicePage() {
    const vi = (await getLocale()) === 'vi';
    const steps = vi ? [
        ['Chọn đúng mã linh kiện', 'Đọc mô tả và kiểm tra mã bóng, trị số tụ, điện áp, kích thước và thông số thiết bị của bạn. Nếu chưa chắc, gửi thông tin cho cửa hàng trước khi mua.'],
        ['Kiểm tra tình trạng và phân loại', 'Xem ảnh, mô tả tình trạng và đơn vị bán. Với sản phẩm có nhiều lựa chọn, giá và số lượng sẽ thay đổi theo phân loại đã chọn.'],
        ['Xác nhận hàng và phí vận chuyển', 'Cung cấp địa chỉ nhận để cửa hàng xác nhận hàng có sẵn, báo phí ship và trao đổi lịch gửi. Tiền hàng trên website chưa bao gồm phí vận chuyển.'],
        ['Thống nhất bảo hành và đổi trả', 'Hỏi rõ điều kiện, thời hạn và chi phí liên quan của đúng sản phẩm trước khi thanh toán. Không áp dụng mặc định một chế độ bảo hành cho mọi linh kiện.'],
        ['Đặt hàng và thanh toán', 'Kiểm tra sản phẩm, số lượng, địa chỉ và phương thức được hỗ trợ tại trang thanh toán. Khi chuyển khoản, dùng đúng tài khoản và mã đơn trong hướng dẫn.'],
        ['Nhận hàng và liên hệ hỗ trợ', 'Kiểm tra kiện hàng khi nhận. Nếu có vấn đề, lưu hình ảnh, giữ bao bì và gửi mã đơn cùng nội dung cần hỗ trợ; trao đổi với cửa hàng trước khi gửi lại.'],
    ] : [
        ['Choose the right part', 'Review the part number, capacitance, voltage, dimensions and device requirements. Send the store your specifications if you are unsure.'],
        ['Check condition and options', 'Review photos, condition and the selling unit. For products with options, price and stock follow the selected option.'],
        ['Confirm availability and delivery', 'Provide your delivery address so the store can confirm stock, shipping fees and dispatch timing. Item prices exclude shipping.'],
        ['Agree on warranty and returns', 'Ask about the conditions, time limits and related costs for your exact item before payment. No single warranty covers every component.'],
        ['Order and pay', 'Check items, quantities, address and available payment methods at checkout. For transfers, use the account details and order code in the instructions.'],
        ['Receive and request support', 'Inspect the parcel on arrival. If there is an issue, keep the packaging and photos and send your order code. Contact the store before returning anything.'],
    ];
    return (
        <div className={styles.servicePage}><div className="container">
            <nav className={styles.breadcrumb}><Link href="/">{vi ? 'Trang chủ' : 'Home'}</Link><span>/</span><span>{vi ? 'Hướng dẫn mua hàng' : 'Buying guide'}</span></nav>
            <div className={styles.heroSection}>
                <div className={styles.badge}>{vi ? 'Cửa hàng bán online' : 'Online store'}</div>
                <h1 className={styles.heroTitle}>{vi ? 'Hướng Dẫn Mua Bóng Đèn & Linh Kiện' : 'Buying Tubes & Audio Components'}</h1>
                <p className={styles.heroSubtitle}>{vi ? 'Kiểm tra đúng sản phẩm, xác nhận điều kiện mua hàng và liên hệ khi cần hỗ trợ.' : 'Check the exact item, confirm buying conditions and contact us for assistance.'}</p>
            </div>
            <div className={styles.stepsGrid}>{steps.map(([title, text], i) => (
                <div className={styles.stepCard} key={title}><div className={styles.stepNumber}>{String(i + 1).padStart(2, '0')}</div><h3 className={styles.stepTitle}>{title}</h3><p className={styles.stepDesc}>{text}</p></div>
            ))}</div>
            <div className={styles.ctaBox}><div className={styles.ctaLeft}><h3>{vi ? 'Cần hỏi thêm trước khi mua?' : 'Questions before buying?'}</h3><p>{vi ? 'Gửi mã linh kiện, thông tin thiết bị hoặc mã đơn để cửa hàng hỗ trợ từ xa.' : 'Send the part number, device details or order code for remote support.'}</p></div><div className={styles.ctaRight}><Link href="/contact" className="btn btn-primary">{vi ? 'Để lại lời nhắn' : 'Leave a message'}</Link><Link href="/policies/shipping" className="btn btn-secondary">{vi ? 'Phí ship & điều kiện mua hàng' : 'Shipping & buying conditions'}</Link></div></div>
        </div></div>
    );
}
