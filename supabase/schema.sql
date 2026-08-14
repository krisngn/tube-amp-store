-- =====================================================
-- Restore The Basic - Supabase Database Schema
-- =====================================================
-- This schema supports:
-- - Multilingual product content (vi/en)
-- - Product management with tube-specific attributes
-- - Order management with deposit reservations
-- - Customer accounts
-- - Inventory tracking
-- - Admin roles
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- Product condition types
CREATE TYPE product_condition AS ENUM ('new', 'like_new', 'vintage');

-- Tube topology types
CREATE TYPE topology_type AS ENUM ('se', 'pp');

-- Order status
CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'deposited',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
);

-- Payment method
CREATE TYPE payment_method AS ENUM ('cod', 'bank_transfer');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- User role
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'super_admin');

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

-- Extends Supabase auth.users with additional profile data
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role user_role DEFAULT 'customer',
    preferred_locale TEXT DEFAULT 'vi',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User addresses (for shipping)
CREATE TABLE public.user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT,
    postal_code TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS
-- =====================================================

-- Main products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE,
    
    -- Pricing
    price DECIMAL(12, 2) NOT NULL,
    compare_at_price DECIMAL(12, 2),
    
    -- Inventory
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    
    -- Product attributes
    condition product_condition NOT NULL,
    topology topology_type NOT NULL,
    tube_type TEXT NOT NULL, -- e.g., '300B', 'EL34', 'KT88'
    power_watts DECIMAL(5, 2) NOT NULL,
    taps TEXT[], -- e.g., ['4Ω', '8Ω', '16Ω']
    min_speaker_sensitivity INTEGER, -- in dB
    
    -- Specifications (JSONB for flexibility)
    specifications JSONB DEFAULT '{}',
    -- Example: {"frequency_response": "20Hz-20kHz", "snr": "90dB", "thd": "0.5%"}
    
    -- Deposit reservation
    allow_deposit BOOLEAN DEFAULT false,
    deposit_amount DECIMAL(12, 2),
    deposit_percentage INTEGER, -- if null, use deposit_amount
    reservation_days INTEGER DEFAULT 7,
    
    -- Flags
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    is_vintage BOOLEAN DEFAULT false,
    
    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT positive_price CHECK (price > 0),
    CONSTRAINT positive_stock CHECK (stock_quantity >= 0),
    CONSTRAINT valid_deposit CHECK (
        (NOT allow_deposit) OR 
        (deposit_amount IS NOT NULL OR deposit_percentage IS NOT NULL)
    )
);

-- Product translations (for multilingual content)
CREATE TABLE public.product_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    locale TEXT NOT NULL, -- 'vi' or 'en'
    
    -- Translatable fields
    name TEXT NOT NULL,
    short_description TEXT,
    description TEXT,
    sound_character TEXT,
    recommended_genres TEXT[],
    matching_notes TEXT,
    condition_notes TEXT,
    origin_story TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(product_id, locale)
);

-- Product images
CREATE TABLE public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage: products/{product_id}/{image_id}.jpg
    url TEXT, -- Public URL (computed from storage_path, kept for backward compatibility)
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0, -- Gallery order (0 = first, higher numbers = later)
    is_primary BOOLEAN DEFAULT false, -- Marks the primary/cover image (at most one per product)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique sort_order per product (optional, can be relaxed if needed)
    CONSTRAINT unique_product_sort_order UNIQUE(product_id, sort_order) DEFERRABLE INITIALLY DEFERRED
);

-- Index for faster queries
CREATE INDEX idx_product_images_product_id_sort ON public.product_images(product_id, sort_order);

-- Index for primary image queries
CREATE INDEX idx_product_images_is_primary ON public.product_images(product_id, is_primary) WHERE is_primary = true;

-- Ensure at most one primary image per product
CREATE UNIQUE INDEX idx_product_images_single_primary ON public.product_images(product_id) WHERE is_primary = true;

-- Product categories/tags
CREATE TABLE public.product_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(product_id, tag)
);

-- =====================================================
-- CATEGORIES & BRANDS
-- (also delivered as supabase/ADD_CATEGORIES_AND_BRANDS.sql for existing DBs)
-- =====================================================

-- Brands
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    description_vi TEXT,
    description_en TEXT,
    logo_path TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories (2-level: parent -> child)
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    name_vi TEXT NOT NULL,
    name_en TEXT,
    description_vi TEXT,
    description_en TEXT,
    image_path TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link products to a category and a brand (nullable: not every product has both)
ALTER TABLE public.products
    ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- Amp-specific columns are optional now that the catalog is general
ALTER TABLE public.products ALTER COLUMN topology DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN tube_type DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN power_watts DROP NOT NULL;

-- Shipping weight & package dimensions (for marketplace listings / shipping fees)
ALTER TABLE public.products
    ADD COLUMN weight_grams INTEGER,
    ADD COLUMN length_cm DECIMAL(6, 1),
    ADD COLUMN width_cm DECIMAL(6, 1),
    ADD COLUMN height_cm DECIMAL(6, 1);

-- =====================================================
-- ORDERS
-- =====================================================

-- Main orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    -- Customer info (denormalized for guest checkout)
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    
    -- Shipping address
    shipping_address_line TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_district TEXT,
    shipping_postal_code TEXT,
    
    -- Order totals
    subtotal DECIMAL(12, 2) NOT NULL,
    shipping_fee DECIMAL(12, 2) DEFAULT 0,
    tax DECIMAL(12, 2) DEFAULT 0,
    discount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,
    
    -- Payment
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    
    -- Deposit info (if applicable)
    is_deposit_order BOOLEAN DEFAULT false,
    deposit_paid DECIMAL(12, 2),
    remaining_amount DECIMAL(12, 2),
    deposit_paid_at TIMESTAMPTZ,
    
    -- Status
    status order_status DEFAULT 'pending',
    
    -- Notes
    customer_note TEXT,
    admin_note TEXT,
    
    -- Locale for email notifications
    locale TEXT DEFAULT 'vi',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    CONSTRAINT positive_totals CHECK (
        subtotal >= 0 AND 
        total >= 0 AND 
        shipping_fee >= 0
    )
);

-- Order items
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    
    -- Snapshot of product at time of order
    product_name TEXT NOT NULL,
    product_slug TEXT,
    product_sku TEXT,
    product_image_url TEXT,
    
    -- Pricing
    unit_price DECIMAL(12, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_price CHECK (unit_price >= 0)
);

-- Order status history
CREATE TABLE public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status order_status,
    to_status order_status NOT NULL,
    note TEXT,
    changed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REVIEWS
-- =====================================================

CREATE TABLE public.product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    
    -- Customer info (for display)
    customer_name TEXT NOT NULL,
    
    -- Moderation
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CUSTOMER SETUPS (Gallery)
-- =====================================================

CREATE TABLE public.customer_setups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    
    -- Associated products
    products UUID[] DEFAULT '{}',
    
    -- Moderation
    is_approved BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GUIDES & CONTENT
-- =====================================================

CREATE TABLE public.guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- 'beginner', 'technical', 'matching'
    
    -- Icon/image
    icon TEXT,
    image_url TEXT,
    
    -- Publishing
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.guide_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id UUID REFERENCES public.guides(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- Markdown or HTML
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(guide_id, locale)
);

-- =====================================================
-- MATCHING TOOL DATA
-- =====================================================

-- Store matching requests for analytics
CREATE TABLE public.matching_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    -- Input data
    speaker_sensitivity INTEGER,
    speaker_impedance INTEGER,
    room_size TEXT, -- 'small', 'medium', 'large'
    listening_level TEXT, -- 'low', 'medium', 'loud'
    genres TEXT[],
    
    -- Results
    recommended_products UUID[],
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Products
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_condition ON public.products(condition);
CREATE INDEX idx_products_topology ON public.products(topology);
CREATE INDEX idx_products_tube_type ON public.products(tube_type);
CREATE INDEX idx_products_is_published ON public.products(is_published);
CREATE INDEX idx_products_is_featured ON public.products(is_featured);
CREATE INDEX idx_products_created_at ON public.products(created_at DESC);

-- Product translations
CREATE INDEX idx_product_translations_product_id ON public.product_translations(product_id);
CREATE INDEX idx_product_translations_locale ON public.product_translations(locale);

-- Orders
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);

-- Order items
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);

-- Reviews
CREATE INDEX idx_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX idx_reviews_is_approved ON public.product_reviews(is_approved);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_translations_updated_at BEFORE UPDATE ON public.product_translations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.product_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guides_updated_at BEFORE UPDATE ON public.guides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE order_number_seq;

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Track order status changes
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.order_status_history (order_id, from_status, to_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_order_status AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION track_order_status_change();

-- Update product stock on order
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.product_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + OLD.quantity
        WHERE id = OLD.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_on_order AFTER INSERT OR DELETE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- User profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Products: public read, admin write
CREATE POLICY "Anyone can view published products" ON public.products
    FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Product translations: public read
CREATE POLICY "Anyone can view product translations" ON public.product_translations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_id AND is_published = true
        )
    );

-- Product images: public read for published products
CREATE POLICY "Anyone can view product images" ON public.product_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_id AND is_published = true
        )
    );

-- Orders: users can view their own orders
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Anyone can create orders" ON public.orders
    FOR INSERT 
    WITH CHECK (
        -- Allow if user_id matches authenticated user
        (user_id IS NOT NULL AND auth.uid() = user_id)
        OR
        -- Allow if user_id is NULL (guest checkout)
        user_id IS NULL
    );

-- Order items: allow inserts for orders (guests and authenticated users)
CREATE POLICY "Anyone can create order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = order_id
        )
    );

-- Reviews: users can create reviews for their orders
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can create reviews" ON public.product_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- VIEWS
-- =====================================================

-- Products with translations (for easier querying)
CREATE OR REPLACE VIEW products_with_translations AS
SELECT 
    p.*,
    pt.locale,
    pt.name,
    pt.short_description,
    pt.description,
    pt.sound_character,
    pt.recommended_genres,
    pt.matching_notes,
    (SELECT url FROM public.product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image_url,
    (SELECT COUNT(*) FROM public.product_reviews WHERE product_id = p.id AND is_approved = true) as review_count,
    (SELECT AVG(rating) FROM public.product_reviews WHERE product_id = p.id AND is_approved = true) as average_rating
FROM public.products p
LEFT JOIN public.product_translations pt ON p.id = pt.product_id;

-- Order summary view
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.*,
    COUNT(oi.id) as item_count,
    up.email as user_email,
    up.full_name as user_full_name
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.user_profiles up ON o.user_id = up.id
GROUP BY o.id, up.email, up.full_name;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample admin user (you'll need to create this in Supabase Auth first)
-- INSERT INTO public.user_profiles (id, email, full_name, role)
-- VALUES ('your-auth-user-id', 'admin@classictubeamps.vn', 'Admin User', 'admin');

COMMENT ON SCHEMA public IS 'Restore The Basic E-commerce Database';
