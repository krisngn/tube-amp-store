-- Tạo bảng lưu lời nhắn tư vấn từ form trên trang chủ
CREATE TABLE IF NOT EXISTS consultation_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT,
    phone       TEXT NOT NULL,
    message     TEXT,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index để query nhanh các tin chưa đọc và sắp xếp theo thời gian
CREATE INDEX IF NOT EXISTS idx_consultation_messages_created_at
    ON consultation_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_messages_is_read
    ON consultation_messages (is_read);

-- Row Level Security: chỉ admin (service role) mới đọc được toàn bộ
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;

-- Cho phép anon INSERT (người dùng gửi form)
CREATE POLICY "Allow anon insert"
    ON consultation_messages
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Chỉ authenticated (admin) mới SELECT / UPDATE được
CREATE POLICY "Allow admin read"
    ON consultation_messages
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admin update"
    ON consultation_messages
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
