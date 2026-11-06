-- ==============================================================================
-- DARKWATCH INTELLIGENCE - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Migration: 20261106_darkwatch_schema.sql
-- Description: Core tables, enums, indexes, constraints, RLS policies, and seed data
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'super_admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. EMAIL VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. DOMAIN VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.domain_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    token TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'dns_txt' CHECK (method IN ('dns_txt', 'html_file')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. SCANS TABLE
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('email', 'domain')),
    target_value TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('idle', 'validating', 'awaiting_verification', 'queued', 'scanning', 'completed', 'no_findings', 'failed', 'unauthorized')),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    severity TEXT NOT NULL DEFAULT 'Informational' CHECK (severity IN ('Informational', 'Low', 'Medium', 'High', 'Critical')),
    breach_count INTEGER NOT NULL DEFAULT 0,
    provider TEXT NOT NULL DEFAULT 'Have I Been Pwned v3',
    scoring_factors JSONB DEFAULT '[]'::jsonb,
    ai_summary TEXT,
    ai_remediation JSONB DEFAULT '[]'::jsonb,
    is_public_scan BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

-- 5. SCAN FINDINGS TABLE
CREATE TABLE IF NOT EXISTS public.scan_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    breach_name TEXT NOT NULL,
    title TEXT NOT NULL,
    domain TEXT,
    breach_date TEXT,
    added_date TEXT,
    modified_date TEXT,
    pwn_count BIGINT DEFAULT 0,
    description TEXT,
    logo_path TEXT,
    data_classes JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_verified BOOLEAN DEFAULT false,
    is_fabricated BOOLEAN DEFAULT false,
    is_sensitive BOOLEAN DEFAULT false,
    is_retired BOOLEAN DEFAULT false,
    is_spam_list BOOLEAN DEFAULT false,
    is_malware BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. THREAT SOURCES TABLE
CREATE TABLE IF NOT EXISTS public.threat_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    provider_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'degraded')),
    description TEXT,
    breach_count INTEGER DEFAULT 0,
    pwn_count BIGINT DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. PRICING PLANS TABLE
CREATE TABLE IF NOT EXISTS public.pricing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    billing_interval TEXT NOT NULL DEFAULT 'one_time' CHECK (billing_interval IN ('free', 'one_time', 'monthly', 'annual')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. PAYMENT ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.pricing_plans(id),
    scan_id UUID REFERENCES public.scans(id),
    order_reference TEXT NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_category TEXT NOT NULL CHECK (payment_category IN ('local', 'card')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('evc_plus', 'waafi', 'card')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'setup_required')),
    provider_reference TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_reference TEXT NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending',
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.payment_orders(id),
    report_type TEXT NOT NULL DEFAULT 'free' CHECK (report_type IN ('free', 'premium')),
    title TEXT NOT NULL,
    storage_path TEXT,
    is_unlocked BOOLEAN NOT NULL DEFAULT false,
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. WATCHLISTS TABLE
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('email', 'domain')),
    asset_value TEXT NOT NULL,
    is_monitored BOOLEAN NOT NULL DEFAULT true,
    verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified')),
    last_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, asset_type, asset_value)
);

-- 12. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.pricing_plans(id),
    order_id UUID REFERENCES public.payment_orders(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('scan_completed', 'exposure_found', 'payment_confirmed', 'report_unlocked', 'verification', 'system')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_target_value ON public.scans(target_value);
CREATE INDEX IF NOT EXISTS idx_scan_findings_scan_id ON public.scan_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_ref ON public.payment_orders(order_reference);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verif_email ON public.email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_domain_verif_domain ON public.domain_verifications(domain);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read own profile; Super admins can read all
CREATE POLICY "Users read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Scans: Users can view own scans or public scans
CREATE POLICY "Users access own scans" ON public.scans
    FOR SELECT USING (auth.uid() = user_id OR is_public_scan = true);

-- Scan findings: accessible if scan is accessible
CREATE POLICY "Findings accessible via scan ownership" ON public.scan_findings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.scans
            WHERE scans.id = scan_findings.scan_id
            AND (scans.user_id = auth.uid() OR scans.is_public_scan = true)
        )
    );

-- Watchlists: strictly isolated per user
CREATE POLICY "Users manage own watchlists" ON public.watchlists
    FOR ALL USING (auth.uid() = user_id);

-- Pricing plans: publicly viewable
CREATE POLICY "Pricing plans publicly viewable" ON public.pricing_plans
    FOR SELECT USING (is_active = true);

-- Threat sources: publicly viewable
CREATE POLICY "Threat sources publicly viewable" ON public.threat_sources
    FOR SELECT USING (true);

-- Payment orders: user can view own orders
CREATE POLICY "Users view own payment orders" ON public.payment_orders
    FOR SELECT USING (auth.uid() = user_id);

-- Reports: user can view own reports
CREATE POLICY "Users view own reports" ON public.reports
    FOR SELECT USING (auth.uid() = user_id);

-- Notifications: user can view and update own notifications
CREATE POLICY "Users access own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- SEED INITIAL DATA: PRICING PLANS & THREAT SOURCES
-- ==============================================================================
INSERT INTO public.pricing_plans (name, slug, description, amount, currency, billing_interval, is_active, features)
VALUES 
(
    'Free Exposure Summary',
    'free-summary',
    'Essential exposure scan with masked metadata and baseline remediation steps.',
    0.00,
    'USD',
    'free',
    true,
    '["Masked breach identifiers", "Overall risk score calculation", "High-level severity classification", "Basic remediation guidance", "1 monitored asset"]'::jsonb
),
(
    'Single Deep Threat Report',
    'single-deep-report',
    'Comprehensive forensic exposure report for a single verified email or authorized domain.',
    9.99,
    'USD',
    'one_time',
    true,
    '["Unmasked breach metadata & sources", "Detailed breach timeline & data classes", "AI-generated executive remediation briefing", "Downloadable branded PDF report", "Structured CSV findings export", "Permanent report archive in account"]'::jsonb
),
(
    'Individual Pro Monthly',
    'pro-monthly',
    'Continuous dark web exposure surveillance with instant breach notifications.',
    19.99,
    'USD',
    'monthly',
    true,
    '["Continuous automated asset surveillance", "Up to 5 verified emails and domains", "Instant alert notifications upon new breaches", "Unlimited Deep Forensic PDF & CSV reports", "Priority risk classification", "Advanced AI remediation strategies"]'::jsonb
),
(
    'Individual Pro Annual',
    'pro-annual',
    'Year-round threat intelligence monitoring with 2 months free.',
    189.99,
    'USD',
    'annual',
    true,
    '["All Pro Monthly features included", "Up to 10 verified emails and domains", "2 months complimentary savings", "Priority threat feed ingestion", "Dedicated account security audit logs", "Unlimited PDF & CSV report exports"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.threat_sources (name, provider_code, status, description, breach_count, pwn_count, last_sync_at)
VALUES 
(
    'Have I Been Pwned v3',
    'hibp_v3',
    'active',
    'Primary threat intelligence provider. Aggregates commercial and public breach records with cryptographic range queries.',
    820,
    14500000000,
    timezone('utc'::text, now())
),
(
    'Pwned Passwords Range API',
    'pwned_passwords',
    'active',
    'k-Anonymity model for checking password hashes without revealing user secrets.',
    1,
    900000000,
    timezone('utc'::text, now())
)
ON CONFLICT (provider_code) DO NOTHING;
