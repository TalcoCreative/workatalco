
-- Subscriptions table to track company billing
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  tier text NOT NULL DEFAULT 'trial',
  max_users integer NOT NULL DEFAULT 3,
  price_per_user integer NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Payment transactions from Midtrans
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  midtrans_order_id text UNIQUE NOT NULL,
  midtrans_transaction_id text,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_type text,
  tier text NOT NULL,
  user_count integer NOT NULL DEFAULT 1,
  snap_token text,
  snap_redirect_url text,
  metadata jsonb DEFAULT '{}',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: Company owners can view their subscriptions
CREATE POLICY "Company members can view their subscription"
ON public.subscriptions FOR SELECT TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

CREATE POLICY "Company members can view their payments"
ON public.payment_transactions FOR SELECT TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

-- Platform admins can do everything (via service role in edge functions)
-- Updated_at trigger
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
