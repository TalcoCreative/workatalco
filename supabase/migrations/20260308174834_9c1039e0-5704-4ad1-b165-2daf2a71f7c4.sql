
-- Add structured message fields to email_templates
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS greeting TEXT NOT NULL DEFAULT 'Hai {{recipient_name}} 👋';
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS main_message TEXT NOT NULL DEFAULT 'Ada update baru buat lo:';
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS button_text TEXT NOT NULL DEFAULT 'Lihat Detail';
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS footer_text TEXT NOT NULL DEFAULT 'Kalau ini penting, jangan di-skip ya 😎';

-- Update specific templates with appropriate default messages
UPDATE public.email_templates SET greeting = 'Hai {{recipient_name}} 👋', main_message = 'Lo baru aja dapet tugas baru nih:', button_text = 'Lihat Task', footer_text = 'Segera cek ya biar nggak kelewat 💪' WHERE template_key = 'task_assignment';
UPDATE public.email_templates SET greeting = 'Hai {{recipient_name}} 👋', main_message = 'Task berikut sudah selesai:', button_text = 'Lihat Detail', footer_text = 'Good job, tim! ✨' WHERE template_key = 'task_completed';
UPDATE public.email_templates SET greeting = 'Hai {{recipient_name}} 👋', main_message = 'Ada update status task:', button_text = 'Lihat Update', footer_text = 'Stay updated ya! 🔄' WHERE template_key = 'task_status_change';
UPDATE public.email_templates SET greeting = 'Hai {{recipient_name}} 👋', main_message = 'Lo baru aja di-mention di sebuah task:', button_text = 'Lihat Mention', footer_text = 'Cek dan reply ya kalau perlu 💬' WHERE template_key = 'task_mention';
UPDATE public.email_templates SET greeting = 'Hai {{recipient_name}} 👋', main_message = 'Task berikut sudah melewati deadline:', button_text = 'Lihat Task', footer_text = 'Segera selesaikan ya 🙏' WHERE template_key = 'task_overdue';
UPDATE public.email_templates SET greeting = 'Hai {{recipient_name}} 👋', main_message = 'Lo diundang ke meeting berikut:', button_text = 'Lihat Meeting', footer_text = 'Jangan lupa hadir ya! 📅' WHERE template_key = 'meeting_invitation';
UPDATE public.email_templates SET greeting = 'Hai {{recipient_name}} 👋', main_message = 'Lo dijadwalkan di shooting berikut:', button_text = 'Lihat Jadwal', footer_text = 'Siap-siap ya! 🎬' WHERE template_key = 'shooting_assignment';
UPDATE public.email_templates SET greeting = 'Hai {{recipient_name}} 👋', main_message = 'Ada update shooting:', button_text = 'Lihat Update', footer_text = 'Stay updated ya! 🎥' WHERE template_key = 'shooting_status_update';
UPDATE public.email_templates SET greeting = 'Hai {{recipient_name}} 👋', main_message = 'Lo ditugaskan di event berikut:', button_text = 'Lihat Event', footer_text = 'Persiapkan dengan baik ya! 🎪' WHERE template_key = 'event_assignment';
UPDATE public.email_templates SET greeting = 'Hai {{recipient_name}} 👋', main_message = 'Lo bergabung di project baru:', button_text = 'Lihat Project', footer_text = 'Semangat ya, tim! 🚀' WHERE template_key = 'project_assignment';
