
-- Insert profile for existing users if missing
INSERT INTO public.profiles (user_id, full_name, email)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', ''), email
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.users.id)
ON CONFLICT DO NOTHING;

-- Insert admin role for admin user if missing
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'asaelektriker@admin.dk'
AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.users.id)
ON CONFLICT DO NOTHING;

-- Insert employee role for other users if missing
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'employee'
FROM auth.users
WHERE email != 'asaelektriker@admin.dk'
AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.users.id)
ON CONFLICT DO NOTHING;
