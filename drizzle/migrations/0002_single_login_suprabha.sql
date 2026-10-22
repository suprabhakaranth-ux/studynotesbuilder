INSERT INTO public.user_roles (user_id, role) VALUES ('b6dc6569-25ba-4ea0-a7bf-607219aa8daf', 'admin') ON CONFLICT (user_id, role) DO NOTHING;
DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_admin ON auth.users;
DROP FUNCTION IF EXISTS public.grant_admin_for_allowlisted_email();
DELETE FROM public.user_roles WHERE user_id = 'd4f7af68-d4cc-4b98-bee0-3c7e969be795';
DELETE FROM auth.users WHERE id = 'd4f7af68-d4cc-4b98-bee0-3c7e969be795';