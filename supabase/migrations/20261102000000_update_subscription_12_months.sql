-- Update activate_trainee_subscription to 12 months (1 year usage)
create or replace function public.activate_trainee_subscription(trainee_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calling_trainer_id uuid;
begin
  -- Resolve the calling trainer's profile id
  select id into calling_trainer_id
  from public.profiles
  where auth_user_id = auth.uid()
    and role = 'trainer'
  limit 1;

  if calling_trainer_id is null then
    raise exception 'Only trainers can activate subscriptions.';
  end if;

  -- Ensure the trainee is actually assigned to this trainer
  if not exists (
    select 1 from public.profiles
    where id = trainee_profile_id
      and assigned_trainer_id = calling_trainer_id
      and role = 'trainee'
  ) then
    raise exception 'Trainee is not assigned to you.';
  end if;

  update public.profiles
  set
    is_active              = true,
    last_payment_at        = now(),
    subscription_expires_at = now() + interval '12 months',
    updated_at             = now()
  where id = trainee_profile_id;
end;
$$;
