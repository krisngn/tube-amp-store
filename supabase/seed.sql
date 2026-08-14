-- =====================================================
-- Sample Seed Data for Vintage Audio Accessories
-- =====================================================
-- This file contains sample data to help you get started
-- Run this AFTER running schema.sql
-- =====================================================

-- =====================================================
-- SAMPLE PRODUCTS
-- =====================================================

-- Product 1: Classic SE 300B Amplifier
INSERT INTO public.products (
    id,
    slug,
    sku,
    price,
    stock_quantity,
    condition,
    topology,
    tube_type,
    power_watts,
    taps,
    min_speaker_sensitivity,
    specifications,
    allow_deposit,
    deposit_amount,
    is_featured,
    is_published
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'classic-se-300b-amplifier',
    'AMP-SE-300B-001',
    45000000,
    5,
    'new',
    'se',
    '300B',
    8,
    ARRAY['4Ω', '8Ω', '16Ω'],
    88,
    '{"frequency_response": "20Hz-20kHz", "snr": "90dB", "thd": "0.5%", "input_impedance": "100kΩ", "dimensions": "420x180x320mm", "weight": "18kg"}',
    false,
    NULL,
    true,
    true
);

-- Vietnamese translation
INSERT INTO public.product_translations (
    product_id,
    locale,
    name,
    short_description,
    description,
    sound_character,
    recommended_genres,
    matching_notes
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'vi',
    'Ampli Đèn SE 300B Classic',
    'Ampli đèn Single-Ended 300B handmade cao cấp với âm thanh ngọt ngào, chi tiết',
    'Ampli đèn SE 300B được chế tác thủ công với linh kiện cao cấp. Topology Single-Ended mang đến âm thanh trong trẻo, ngọt ngào với độ chi tiết cao. Phù hợp cho loa độ nhạy cao và phòng nghe nhỏ đến trung bình.',
    'Âm thanh ấm áp, ngọt ngào với midrange xuất sắc. Bass chắc khỏe, treble mượt mà không gắt. Soundstage rộng với độ tách bạch tốt.',
    ARRAY['Jazz', 'Vocal', 'Classical', 'Acoustic'],
    'Phù hợp nhất với loa độ nhạy từ 88dB trở lên. Với công suất 8W, lý tưởng cho phòng nghe 15-30m². Taps linh hoạt 4/8/16Ω giúp phối ghép dễ dàng với nhiều loại loa.'
);

-- English translation
INSERT INTO public.product_translations (
    product_id,
    locale,
    name,
    short_description,
    description,
    sound_character,
    recommended_genres,
    matching_notes
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'en',
    'Classic SE 300B Tube Amplifier',
    'Premium handmade Single-Ended 300B tube amplifier with sweet, detailed sound',
    'Handcrafted SE 300B tube amplifier built with premium components. Single-Ended topology delivers pure, sweet sound with exceptional detail. Perfect for high-sensitivity speakers and small to medium listening rooms.',
    'Warm, sweet sound with excellent midrange. Tight bass, smooth treble without harshness. Wide soundstage with good separation.',
    ARRAY['Jazz', 'Vocal', 'Classical', 'Acoustic'],
    'Best suited for speakers with 88dB+ sensitivity. With 8W output, ideal for 15-30m² rooms. Flexible 4/8/16Ω taps for easy matching with various speakers.'
);

-- Product images
INSERT INTO public.product_images (product_id, url, alt_text, position, is_primary) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', '/images/products/se-300b-front.jpg', 'SE 300B Front View', 1, true),
    ('550e8400-e29b-41d4-a716-446655440001', '/images/products/se-300b-side.jpg', 'SE 300B Side View', 2, false),
    ('550e8400-e29b-41d4-a716-446655440001', '/images/products/se-300b-tubes.jpg', 'SE 300B Tubes Close-up', 3, false);

-- Product tags
INSERT INTO public.product_tags (product_id, tag) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'best-seller'),
    ('550e8400-e29b-41d4-a716-446655440001', 'handmade'),
    ('550e8400-e29b-41d4-a716-446655440001', 'premium');

-- Product 2: Push-Pull EL34 Amplifier
INSERT INTO public.products (
    id,
    slug,
    sku,
    price,
    stock_quantity,
    condition,
    topology,
    tube_type,
    power_watts,
    taps,
    min_speaker_sensitivity,
    specifications,
    allow_deposit,
    is_featured,
    is_published
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    'push-pull-el34-amplifier',
    'AMP-PP-EL34-001',
    38000000,
    8,
    'new',
    'pp',
    'EL34',
    25,
    ARRAY['4Ω', '8Ω'],
    85,
    '{"frequency_response": "18Hz-22kHz", "snr": "92dB", "thd": "0.3%", "input_impedance": "100kΩ", "dimensions": "450x200x350mm", "weight": "22kg"}',
    false,
    true,
    true
);

INSERT INTO public.product_translations (product_id, locale, name, short_description, description, sound_character, recommended_genres, matching_notes) VALUES
    ('550e8400-e29b-41d4-a716-446655440002', 'vi', 'Ampli Đèn PP EL34', 'Ampli đèn Push-Pull EL34 công suất lớn với khả năng kiểm soát tốt', 'Ampli đèn PP EL34 với công suất 25W mang đến sự kiểm soát tuyệt vời và bass chắc khỏe. Phù hợp với nhiều loại loa và phòng nghe lớn hơn.', 'Âm thanh mạnh mẽ, bass chắc, treble sáng. Kiểm soát loa tốt với công suất cao.', ARRAY['Rock', 'Pop', 'Electronic', 'Jazz'], 'Phù hợp loa độ nhạy từ 85dB. Công suất 25W đủ cho phòng 20-40m². Taps 4/8Ω.'),
    ('550e8400-e29b-41d4-a716-446655440002', 'en', 'Push-Pull EL34 Tube Amplifier', 'High-power Push-Pull EL34 tube amplifier with excellent control', 'PP EL34 tube amplifier with 25W output delivers excellent control and tight bass. Suitable for various speakers and larger listening rooms.', 'Powerful sound, tight bass, bright treble. Excellent speaker control with high power.', ARRAY['Rock', 'Pop', 'Electronic', 'Jazz'], 'Suitable for 85dB+ speakers. 25W output for 20-40m² rooms. 4/8Ω taps.');

INSERT INTO public.product_images (product_id, url, alt_text, position, is_primary) VALUES
    ('550e8400-e29b-41d4-a716-446655440002', '/images/products/pp-el34-front.jpg', 'PP EL34 Front View', 1, true);

-- Product 3: Vintage SE 2A3 (with deposit option)
INSERT INTO public.products (
    id,
    slug,
    sku,
    price,
    stock_quantity,
    condition,
    topology,
    tube_type,
    power_watts,
    taps,
    min_speaker_sensitivity,
    specifications,
    allow_deposit,
    deposit_percentage,
    reservation_days,
    is_featured,
    is_published,
    is_vintage
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003',
    'vintage-se-2a3-1960s',
    'AMP-SE-2A3-V001',
    85000000,
    1,
    'vintage',
    'se',
    '2A3',
    3.5,
    ARRAY['8Ω', '16Ω'],
    92,
    '{"frequency_response": "25Hz-18kHz", "year": "1960s", "origin": "USA", "recap_status": "Fully recapped 2024"}',
    true,
    30,
    14,
    true,
    true,
    true
);

INSERT INTO public.product_translations (product_id, locale, name, short_description, description, sound_character, recommended_genres, matching_notes, condition_notes, origin_story) VALUES
    ('550e8400-e29b-41d4-a716-446655440003', 'vi', 'Ampli Đèn SE 2A3 Vintage 1960s', 'Ampli đèn SE 2A3 vintage quý hiếm từ thập niên 1960', 'Ampli đèn SE 2A3 vintage nguyên bản từ thập niên 1960, đã được recap toàn bộ năm 2024. Âm thanh cổ điển đặc trưng với độ chi tiết và cảm xúc tuyệt vời.', 'Âm thanh vintage đặc trưng, ấm áp và đầy cảm xúc. Midrange ma mị, bass tự nhiên.', ARRAY['Jazz', 'Vocal', 'Blues', 'Classical'], 'Yêu cầu loa độ nhạy cao từ 92dB. Công suất 3.5W phù hợp phòng nhỏ 10-20m².', 'Tình trạng: Xuất sắc. Đã recap toàn bộ tụ điện năm 2024. Biến áp nguyên bản hoạt động tốt. Vỏ máy có vài vết xước nhỏ theo thời gian. Đèn 2A3 NOS đi kèm.', 'Nhập khẩu từ Mỹ, nguyên chủ sử dụng cẩn thận. Đã qua kiểm tra kỹ lưỡng và phục hồi chuyên nghiệp.'),
    ('550e8400-e29b-41d4-a716-446655440003', 'en', 'Vintage SE 2A3 Amplifier 1960s', 'Rare vintage SE 2A3 tube amplifier from the 1960s', 'Original vintage SE 2A3 tube amplifier from the 1960s, fully recapped in 2024. Classic vintage sound with exceptional detail and emotion.', 'Characteristic vintage sound, warm and emotional. Magical midrange, natural bass.', ARRAY['Jazz', 'Vocal', 'Blues', 'Classical'], 'Requires high-sensitivity speakers 92dB+. 3.5W output suitable for small rooms 10-20m².', 'Condition: Excellent. Fully recapped in 2024. Original transformers working perfectly. Cabinet has minor age-related scratches. NOS 2A3 tubes included.', 'Imported from USA, carefully used by original owner. Thoroughly inspected and professionally restored.');

INSERT INTO public.product_images (product_id, url, alt_text, position, is_primary) VALUES
    ('550e8400-e29b-41d4-a716-446655440003', '/images/products/vintage-2a3-front.jpg', 'Vintage 2A3 Front View', 1, true);

INSERT INTO public.product_tags (product_id, tag) VALUES
    ('550e8400-e29b-41d4-a716-446655440003', 'vintage'),
    ('550e8400-e29b-41d4-a716-446655440003', 'rare'),
    ('550e8400-e29b-41d4-a716-446655440003', 'collector');

-- =====================================================
-- SAMPLE CATEGORIES & BRANDS
-- (requires ADD_CATEGORIES_AND_BRANDS.sql / updated schema.sql)
-- =====================================================

-- Top-level categories + one subcategory (Amplifiers -> Tube Amplifiers)
INSERT INTO public.categories (id, slug, parent_id, name_vi, name_en, sort_order) VALUES
    ('750e8400-e29b-41d4-a716-446655440001', 'amplifiers', NULL, 'Ampli', 'Amplifiers', 1),
    ('750e8400-e29b-41d4-a716-446655440003', 'speakers', NULL, 'Loa', 'Speakers', 2),
    ('750e8400-e29b-41d4-a716-446655440004', 'accessories', NULL, 'Phụ kiện', 'Accessories', 3);

INSERT INTO public.categories (id, slug, parent_id, name_vi, name_en, sort_order) VALUES
    ('750e8400-e29b-41d4-a716-446655440002', 'tube-amplifiers', '750e8400-e29b-41d4-a716-446655440001', 'Ampli đèn', 'Tube Amplifiers', 1);

-- Sample brands
INSERT INTO public.brands (id, slug, name, name_en, sort_order) VALUES
    ('850e8400-e29b-41d4-a716-446655440001', 'vintage-house', 'Vintage House', 'Vintage House', 1),
    ('850e8400-e29b-41d4-a716-446655440002', 'western-electric', 'Western Electric', 'Western Electric', 2);

-- Assign the existing sample products to the Tube Amplifiers subcategory + a brand
UPDATE public.products SET category_id = '750e8400-e29b-41d4-a716-446655440002', brand_id = '850e8400-e29b-41d4-a716-446655440001'
    WHERE id = '550e8400-e29b-41d4-a716-446655440001';
UPDATE public.products SET category_id = '750e8400-e29b-41d4-a716-446655440002', brand_id = '850e8400-e29b-41d4-a716-446655440001'
    WHERE id = '550e8400-e29b-41d4-a716-446655440002';
UPDATE public.products SET category_id = '750e8400-e29b-41d4-a716-446655440002', brand_id = '850e8400-e29b-41d4-a716-446655440002'
    WHERE id = '550e8400-e29b-41d4-a716-446655440003';

-- =====================================================
-- SAMPLE GUIDES
-- =====================================================

INSERT INTO public.guides (id, slug, category, is_published) VALUES
    ('650e8400-e29b-41d4-a716-446655440001', 'what-is-tube-amp', 'beginner', true),
    ('650e8400-e29b-41d4-a716-446655440002', 'se-vs-pp', 'technical', true),
    ('650e8400-e29b-41d4-a716-446655440003', 'speaker-matching', 'matching', true);

INSERT INTO public.guide_translations (guide_id, locale, title, description, content) VALUES
    ('650e8400-e29b-41d4-a716-446655440001', 'vi', 'Ampli đèn là gì?', 'Giới thiệu cơ bản về ampli đèn và ưu điểm', '# Ampli đèn là gì?\n\nAmpli đèn (tube amplifier) sử dụng đèn chân không để khuếch đại tín hiệu âm thanh...'),
    ('650e8400-e29b-41d4-a716-446655440001', 'en', 'What is a Tube Amplifier?', 'Basic introduction to tube amps and their advantages', '# What is a Tube Amplifier?\n\nA tube amplifier uses vacuum tubes to amplify audio signals...'),
    ('650e8400-e29b-41d4-a716-446655440002', 'vi', 'SE vs PP: Khác biệt là gì?', 'So sánh topology Single-Ended và Push-Pull', '# SE vs PP\n\nSingle-Ended (SE) và Push-Pull (PP) là hai topology phổ biến...'),
    ('650e8400-e29b-41d4-a716-446655440002', 'en', 'SE vs PP: What''s the Difference?', 'Comparing Single-Ended and Push-Pull topologies', '# SE vs PP\n\nSingle-Ended (SE) and Push-Pull (PP) are two popular topologies...'),
    ('650e8400-e29b-41d4-a716-446655440003', 'vi', 'Phối ghép loa với ampli đèn', 'Độ nhạy, trở kháng và cách chọn loa phù hợp', '# Phối ghép loa\n\nĐộ nhạy loa (sensitivity) là yếu tố quan trọng nhất...'),
    ('650e8400-e29b-41d4-a716-446655440003', 'en', 'Matching Speakers with Tube Amps', 'Sensitivity, impedance and how to choose compatible speakers', '# Speaker Matching\n\nSpeaker sensitivity is the most important factor...');

-- =====================================================
-- SAMPLE REVIEWS
-- =====================================================

INSERT INTO public.product_reviews (
    product_id,
    rating,
    title,
    content,
    customer_name,
    is_verified_purchase,
    is_approved
) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 5, 'Âm thanh tuyệt vời!', 'Ampli SE 300B này thật sự xuất sắc. Âm thanh ngọt ngào, chi tiết cao. Phối với loa Klipsch của tôi rất hoàn hảo.', 'Nguyễn Văn A', true, true),
    ('550e8400-e29b-41d4-a716-446655440001', 5, 'Perfect for Jazz', 'This SE 300B is perfect for my jazz collection. The midrange is magical!', 'John Smith', true, true),
    ('550e8400-e29b-41d4-a716-446655440002', 4, 'Công suất tốt', 'PP EL34 này có công suất tốt, bass chắc. Rất phù hợp với loa khó kéo của tôi.', 'Trần Thị B', true, true);

-- =====================================================
-- NOTES
-- =====================================================

-- To use this seed data:
-- 1. First run schema.sql to create all tables
-- 2. Then run this file to insert sample data
-- 3. Update image URLs to match your actual storage
-- 4. Create actual auth users in Supabase Auth before creating orders

COMMENT ON TABLE public.products IS 'Sample products have been inserted. Update image URLs and specifications as needed.';
