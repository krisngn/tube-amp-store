/**
 * VietQR Generator
 * 
 * Generates dynamic VietQR codes for bank transfer deposits.
 * VietQR follows EMVCo QRCPS Merchant Presented Mode with Vietnam-specific extensions.
 * 
 * Reference: https://vietqr.net/
 */

// Bank BIN codes for major Vietnamese banks
export const BANK_BINS: Record<string, string> = {
    vietcombank: '970436',
    vietinbank: '970415',
    bidv: '970418',
    techcombank: '970407',
    mbbank: '970422',
    acb: '970416',
    vpbank: '970432',
    sacombank: '970403',
    tpbank: '970423',
    hdbank: '970437',
    ocb: '970448',
    scb: '970429',
    shb: '970443',
    eximbank: '970431',
    msb: '970426',
    vib: '970441',
    seabank: '970440',
    namabank: '970428',
    baoviet: '970438',
    pvcombank: '970412',
    lienviet: '970449',
    abbank: '970425',
    kienlongbank: '970452',
    bacabank: '970409',
    vietabank: '970427',
    saigonbank: '970400',
    gpbank: '970408',
    dong_a: '970406',
    oceanbank: '970414',
    cbbank: '970444',
    woori: '970457',
};

export interface VietQRConfig {
    bankBin: string;           // 6-digit bank BIN code
    accountNumber: string;     // Bank account number
    accountName: string;       // Account holder name (no diacritics)
    amount: number;            // Amount in VND
    memo: string;              // Transfer memo/content (e.g., RTB-ORD-20251217-000001)
}

export interface VietQRResult {
    qrDataUrl: string;         // URL to VietQR API for QR image
    qrContent: string;         // Raw QR content (EMVCo format)
    displayData: {
        bankName: string;
        accountNumber: string;
        accountName: string;
        amount: string;
        memo: string;
    };
}

/**
 * Get bank name from BIN code
 */
export function getBankNameFromBin(bin: string): string {
    const bankNames: Record<string, string> = {
        '970436': 'Vietcombank',
        '970415': 'VietinBank',
        '970418': 'BIDV',
        '970407': 'Techcombank',
        '970422': 'MB Bank',
        '970416': 'ACB',
        '970432': 'VPBank',
        '970403': 'Sacombank',
        '970423': 'TPBank',
        '970437': 'HDBank',
        '970448': 'OCB',
        '970429': 'SCB',
        '970443': 'SHB',
        '970431': 'Eximbank',
        '970426': 'MSB',
        '970441': 'VIB',
        '970440': 'SeABank',
        '970428': 'Nam A Bank',
        '970438': 'BaoViet Bank',
        '970412': 'PVcomBank',
        '970449': 'LienViet PostBank',
        '970425': 'ABBank',
        '970452': 'Kienlongbank',
        '970409': 'Bac A Bank',
        '970427': 'VietABank',
        '970400': 'Saigonbank',
        '970408': 'GPBank',
        '970406': 'DongA Bank',
        '970414': 'OceanBank',
        '970444': 'CB Bank',
        '970457': 'Woori Bank',
    };
    return bankNames[bin] || 'Unknown Bank';
}

/**
 * Remove Vietnamese diacritics and normalize for QR
 */
export function removeDiacritics(str: string): string {
    const diacriticsMap: Record<string, string> = {
        'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
        'đ': 'd',
        'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
        'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
        'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
        'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
        'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
        'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
        'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
        'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
        'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
        'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
        'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
        'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
        'Đ': 'D',
    };
    
    return str.split('').map(char => diacriticsMap[char] || char).join('');
}

/**
 * Generate transfer memo from order code
 * Format: RTB-{orderCode}
 */
export function generateTransferMemo(orderCode: string): string {
    // Ensure memo is alphanumeric and fits within VietQR limits
    // Max ~25 characters for additionalData field
    const sanitized = orderCode.replace(/[^A-Za-z0-9-]/g, '');
    return `RTB-${sanitized}`;
}

/**
 * Generate VietQR URL using vietqr.io API
 * This returns a URL that can be used as an image src
 */
export function generateVietQRUrl(config: VietQRConfig): string {
    const { bankBin, accountNumber, accountName, amount, memo } = config;
    
    // VietQR.io provides free QR generation
    // Format: https://img.vietqr.io/image/{bankBin}-{accountNumber}-{template}.png?amount={amount}&addInfo={memo}&accountName={name}
    const baseUrl = 'https://img.vietqr.io/image';
    const template = 'compact2'; // compact2 shows bank logo and account info
    
    const normalizedName = removeDiacritics(accountName).toUpperCase();
    const params = new URLSearchParams({
        amount: String(amount),
        addInfo: memo,
        accountName: normalizedName,
    });
    
    return `${baseUrl}/${bankBin}-${accountNumber}-${template}.png?${params.toString()}`;
}

/**
 * Generate EMVCo QR content string
 * This is the raw data that gets encoded in the QR code
 */
export function generateEMVCoQRContent(config: VietQRConfig): string {
    const { bankBin, accountNumber, amount, memo } = config;
    
    // EMVCo QRCPS format for Vietnam
    // Reference: https://www.emvco.com/emv-technologies/qrcodes/
    
    // Build TLV (Tag-Length-Value) format
    const buildTLV = (id: string, value: string): string => {
        const length = value.length.toString().padStart(2, '0');
        return `${id}${length}${value}`;
    };
    
    // Payload Format Indicator
    let content = buildTLV('00', '01');
    
    // Point of Initiation Method (12 = dynamic QR)
    content += buildTLV('01', '12');
    
    // Merchant Account Information (ID 38 for Vietnam NAPAS)
    // Contains GUID and beneficiary info
    const guid = 'A000000727'; // NAPAS GUID
    const beneficiaryOrg = buildTLV('00', guid) + 
                           buildTLV('01', bankBin + accountNumber);
    content += buildTLV('38', beneficiaryOrg);
    
    // Transaction Currency (704 = VND)
    content += buildTLV('53', '704');
    
    // Transaction Amount
    content += buildTLV('54', String(amount));
    
    // Country Code
    content += buildTLV('58', 'VN');
    
    // Additional Data Field
    const additionalData = buildTLV('08', memo); // 08 = Reference Label
    content += buildTLV('62', additionalData);
    
    // CRC placeholder (calculated at the end)
    content += '6304';
    
    // Calculate CRC-16/CCITT-FALSE
    const crc = calculateCRC16(content);
    content += crc;
    
    return content;
}

/**
 * Calculate CRC-16/CCITT-FALSE checksum
 * Used for EMVCo QR code validation
 */
function calculateCRC16(str: string): string {
    let crc = 0xFFFF;
    
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate complete VietQR result for an order
 */
export function generateVietQRForOrder(
    orderCode: string,
    depositAmount: number
): VietQRResult {
    // Get bank config from environment
    const bankBin = process.env.VIETQR_BANK_BIN || process.env.BANK_BIN || '970436'; // Default: Vietcombank
    const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER || process.env.BANK_ACCOUNT_NUMBER || '';
    const accountName = process.env.VIETQR_ACCOUNT_NAME || process.env.BANK_ACCOUNT_NAME || 'VINTAGE AUDIO ACCESSORIES';
    
    if (!accountNumber) {
        throw new Error('Bank account number not configured. Set VIETQR_ACCOUNT_NUMBER or BANK_ACCOUNT_NUMBER environment variable.');
    }
    
    const memo = generateTransferMemo(orderCode);
    
    const config: VietQRConfig = {
        bankBin,
        accountNumber,
        accountName,
        amount: depositAmount,
        memo,
    };
    
    const qrDataUrl = generateVietQRUrl(config);
    const qrContent = generateEMVCoQRContent(config);
    
    return {
        qrDataUrl,
        qrContent,
        displayData: {
            bankName: getBankNameFromBin(bankBin),
            accountNumber,
            accountName: removeDiacritics(accountName).toUpperCase(),
            amount: new Intl.NumberFormat('vi-VN').format(depositAmount),
            memo,
        },
    };
}

/**
 * Validate if a memo matches the expected format for an order
 */
export function validateTransferMemo(memo: string, orderCode: string): boolean {
    const expectedMemo = generateTransferMemo(orderCode);
    // Case-insensitive comparison, trim whitespace
    return memo.trim().toUpperCase() === expectedMemo.toUpperCase();
}

