-- Seed data for Addis

-- Preload a trainer
insert into public.profiles (display_name, role, phone_number, is_active)
values ('Admin Trainer', 'trainer', '+251911223344', true);

-- Get the trainer id (we'll assume it's the first one created)
do $$
declare
  trainer_id uuid;
begin
  select id into trainer_id from public.profiles where role = 'trainer' limit 1;

  -- Preload some trainees assigned to this trainer
  insert into public.profiles (display_name, role, phone_number, assigned_trainer_id, is_active, focus_area, farm_size, flock_count)
  values 
  ('Abebe Kebede', 'trainee', '+251922334455', trainer_id, true, 'Poultry', 'Small', 50),
  ('Chala Bekele', 'trainee', '+251933445566', trainer_id, true, 'Egg Production', 'Medium', 200),
  ('Mulu Tesfaye', 'trainee', '+251944556677', trainer_id, true, 'Broiler', 'Large', 1000);
end $$;
