-- شغّليه مرة واحدة في Supabase → SQL Editor
create table events(id uuid primary key default gen_random_uuid(),name_ar text not null,name_en text not null,event_date date not null,active boolean not null default false,seq int not null default 0);
create unique index one_active on events(active) where active;
create table visitors(id uuid primary key default gen_random_uuid(),event_id uuid not null references events(id),serial int not null,
 name text not null check(char_length(name) between 5 and 80),phone text not null check(phone ~ '^\+?[0-9]{8,15}$'),email text not null,
 ticket uuid not null unique default gen_random_uuid(),created_at timestamptz not null default now(),checked_in_at timestamptz,unique(event_id,email));
create table staff(user_id uuid primary key references auth.users(id) on delete cascade);
alter table events enable row level security;alter table visitors enable row level security;alter table staff enable row level security;

create function is_staff() returns boolean language sql security definer set search_path=public as $$select exists(select 1 from staff where user_id=auth.uid())$$;

create function get_active_event() returns json language sql security definer set search_path=public as
$$select json_build_object('name_ar',name_ar,'name_en',name_en,'event_date',event_date) from events where active limit 1$$;

create function register_visitor(p_name text,p_phone text) returns json language plpgsql security definer set search_path=public as $$
declare ev events; v visitors; s int; em text:=lower(auth.jwt()->>'email');
begin
 if auth.uid() is null or em is null then raise exception 'auth'; end if;
 select * into ev from events where active;
 if not found then raise exception 'no_event'; end if;
 select * into v from visitors where event_id=ev.id and email=em;
 if not found then
  update events set seq=seq+1 where id=ev.id returning seq into s;
  insert into visitors(event_id,serial,name,phone,email) values(ev.id,s,trim(p_name),p_phone,em) returning * into v;
 end if;
 return json_build_object('name',v.name,'serial',v.serial,'ticket',v.ticket,'name_ar',ev.name_ar,'name_en',ev.name_en,'event_date',ev.event_date);
end$$;

create function check_in(p_ticket uuid) returns json language plpgsql security definer set search_path=public as $$
declare v visitors;
begin
 if not is_staff() then raise exception 'staff only'; end if;
 select vi.* into v from visitors vi join events e on e.id=vi.event_id where vi.ticket=p_ticket and e.active;
 if not found then return json_build_object('status','invalid'); end if;
 if v.checked_in_at is not null then return json_build_object('status','duplicate','name',v.name,'serial',v.serial); end if;
 update visitors set checked_in_at=now() where id=v.id;
 return json_build_object('status','ok','name',v.name,'serial',v.serial);
end$$;

create function stats() returns json language plpgsql security definer set search_path=public as $$
begin
 if not is_staff() then raise exception 'staff only'; end if;
 return (select json_build_object('total',count(*),'inside',count(v.checked_in_at)) from visitors v join events e on e.id=v.event_id where e.active);
end$$;

create function visitors_export() returns table(serial int,name text,phone text,email text,registered timestamptz,checked_in timestamptz)
language plpgsql security definer set search_path=public as $$
begin
 if not is_staff() then raise exception 'staff only'; end if;
 return query select v.serial,v.name,v.phone,v.email,v.created_at,v.checked_in_at from visitors v join events e on e.id=v.event_id where e.active order by v.serial;
end$$;

revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function get_active_event() to anon,authenticated;
grant execute on function register_visitor(text,text),check_in(uuid),stats(),visitors_export() to authenticated;

-- أول معرض (عدّلي الاسم والتاريخ):
insert into events(name_ar,name_en,event_date,active) values('معرض بصمات فن 2026 – النسخة 19','ArtMarks Exhibition 2026 – 19th Edition','2026-12-01',true);
