INSERT INTO public.landing_content (section, content)
VALUES (
  'scroll_morph_hero',
  '{
    "enabled": true,
    "intro_title": "One system. Every company.",
    "intro_hint": "SCROLL TO EXPLORE",
    "title": "Built for modern operations.",
    "subtitle": "Manage every part of your business in one calm, connected workspace.",
    "icons": [
      {"name": "LayoutDashboard", "label": "Dashboard"},
      {"name": "CheckSquare", "label": "Tasks"},
      {"name": "Users", "label": "Teams"},
      {"name": "Briefcase", "label": "Clients"},
      {"name": "Calendar", "label": "Schedule"},
      {"name": "Wallet", "label": "Finance"},
      {"name": "FileText", "label": "Letters"},
      {"name": "Megaphone", "label": "Marketing"},
      {"name": "Camera", "label": "Shoots"},
      {"name": "BarChart3", "label": "Reports"},
      {"name": "MessageSquare", "label": "Notes"},
      {"name": "Bell", "label": "Alerts"},
      {"name": "Building2", "label": "HR"},
      {"name": "Star", "label": "KOL"},
      {"name": "Package", "label": "Assets"},
      {"name": "Mail", "label": "Email"},
      {"name": "Shield", "label": "Roles"},
      {"name": "Sparkles", "label": "AI"}
    ]
  }'::jsonb
)
ON CONFLICT (section) DO NOTHING;