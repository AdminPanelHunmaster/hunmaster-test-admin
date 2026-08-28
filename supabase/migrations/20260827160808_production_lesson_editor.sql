-- HunMaster production lesson editor.
-- Keeps the established database enum for Learn compatibility and stores the
-- richer application block kind in the validated JSON content.kind field.

alter table public.lesson_progress
  drop constraint if exists lesson_progress_lesson_id_fkey;

alter table public.lesson_progress
  add constraint lesson_progress_lesson_id_fkey
  foreign key (lesson_id) references public.lessons(id) on delete restrict;

alter table public.lesson_blocks
  drop constraint if exists lesson_blocks_content_is_typed;

alter table public.lesson_blocks
  add constraint lesson_blocks_content_is_typed check (
    jsonb_typeof(content) = 'object'
    and content ? 'kind'
    and (
      (type = 'text' and content->>'kind' in ('text', 'divider', 'callout', 'example'))
      or (type = 'heading' and content->>'kind' = 'heading')
      or (type = 'image' and content->>'kind' = 'image')
      or (type = 'video' and content->>'kind' = 'video')
      or (type = 'audio' and content->>'kind' in ('audio', 'pronunciation'))
      or (type = 'vocabulary' and content->>'kind' = 'vocabulary')
      or (type = 'exercise' and content->>'kind' = 'exercise')
      or (
        type = 'quiz'
        and content->>'kind' in (
          'multipleChoice', 'multiSelect', 'trueFalse', 'fillBlank', 'matching', 'ordering'
        )
      )
    )
  ) not valid;

alter table public.lesson_blocks validate constraint lesson_blocks_content_is_typed;

create or replace function public.admin_save_lesson(
  p_lesson jsonb,
  p_blocks jsonb,
  p_audit_action text default null,
  p_audit_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
set search_path = public, private
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_lesson public.lessons%rowtype;
  v_lesson_id uuid := nullif(p_lesson->>'id', '')::uuid;
  v_course_id uuid := nullif(p_lesson->>'course_id', '')::uuid;
  v_section_id uuid := nullif(p_lesson->>'section_id', '')::uuid;
  v_created boolean := v_lesson_id is null;
  v_block jsonb;
  v_position integer := 0;
  v_blocks jsonb;
begin
  if v_admin_id is null or not private.is_admin(v_admin_id) then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;

  if jsonb_typeof(p_lesson) <> 'object' or jsonb_typeof(p_blocks) <> 'array' then
    raise exception using errcode = '22023', message = 'Invalid lesson editor payload.';
  end if;

  if v_course_id is null or not exists (select 1 from public.courses where id = v_course_id) then
    raise exception using errcode = '22023', message = 'A valid course is required.';
  end if;

  if v_section_id is not null and not exists (
    select 1 from public.course_sections where id = v_section_id and course_id = v_course_id
  ) then
    raise exception using errcode = '22023', message = 'The section does not belong to the selected course.';
  end if;

  if nullif(btrim(p_lesson->>'title'), '') is null
     or nullif(btrim(p_lesson->>'slug'), '') is null then
    raise exception using errcode = '22023', message = 'Lesson title and slug are required.';
  end if;

  if coalesce(p_lesson->>'status', 'draft') not in ('draft', 'published') then
    raise exception using errcode = '22023', message = 'Unsupported lesson status.';
  end if;

  if p_audit_action is not null and p_audit_action not in (
    'lesson.updated', 'lesson.published', 'lesson.unpublished', 'lesson.duplicated'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported lesson audit action.';
  end if;

  if jsonb_array_length(p_blocks) > 500 then
    raise exception using errcode = '22023', message = 'A lesson cannot contain more than 500 blocks.';
  end if;

  if v_created then
    insert into public.lessons (
      course_id, section_id, title, slug, description, content, video_url, position, status
    ) values (
      v_course_id,
      v_section_id,
      btrim(p_lesson->>'title'),
      btrim(p_lesson->>'slug'),
      nullif(p_lesson->>'description', ''),
      coalesce(p_lesson->'content', '{}'::jsonb),
      nullif(p_lesson->>'video_url', ''),
      greatest(coalesce((p_lesson->>'position')::integer, 0), 0),
      coalesce(p_lesson->>'status', 'draft')::public.lesson_status
    ) returning * into v_lesson;
    v_lesson_id := v_lesson.id;
  else
    update public.lessons
    set course_id = v_course_id,
        section_id = v_section_id,
        title = btrim(p_lesson->>'title'),
        slug = btrim(p_lesson->>'slug'),
        description = nullif(p_lesson->>'description', ''),
        content = coalesce(p_lesson->'content', '{}'::jsonb),
        video_url = nullif(p_lesson->>'video_url', ''),
        position = greatest(coalesce((p_lesson->>'position')::integer, 0), 0),
        status = coalesce(p_lesson->>'status', 'draft')::public.lesson_status
    where id = v_lesson_id
    returning * into v_lesson;

    if not found then
      raise exception using errcode = 'P0002', message = 'Lesson not found.';
    end if;
  end if;

  delete from public.lesson_blocks where lesson_id = v_lesson_id;

  for v_block in select value from jsonb_array_elements(p_blocks)
  loop
    if jsonb_typeof(v_block) <> 'object'
       or jsonb_typeof(v_block->'content') <> 'object'
       or nullif(v_block->>'type', '') is null then
      raise exception using errcode = '22023', message = 'Invalid lesson block payload.';
    end if;

    insert into public.lesson_blocks (id, lesson_id, type, content, position)
    values (
      coalesce(nullif(v_block->>'id', '')::uuid, gen_random_uuid()),
      v_lesson_id,
      (v_block->>'type')::public.lesson_block_type,
      v_block->'content',
      v_position
    );
    v_position := v_position + 1;
  end loop;

  if v_created or p_audit_action is not null then
    insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, metadata)
    values (
      v_admin_id,
      case when v_created then 'lesson.created' else p_audit_action end,
      'lesson',
      v_lesson_id,
      coalesce(p_audit_metadata, '{}'::jsonb) || jsonb_build_object(
        'courseId', v_course_id,
        'status', v_lesson.status,
        'blockCount', v_position
      )
    );
  end if;

  select coalesce(jsonb_agg(to_jsonb(b) order by b.position), '[]'::jsonb)
  into v_blocks
  from public.lesson_blocks b
  where b.lesson_id = v_lesson_id;

  return jsonb_build_object('lesson', to_jsonb(v_lesson), 'blocks', v_blocks);
end;
$$;

create or replace function public.admin_duplicate_lesson(p_lesson_id uuid)
returns uuid
language plpgsql
set search_path = public, private
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_source public.lessons%rowtype;
  v_copy_id uuid;
  v_slug text;
  v_suffix integer := 1;
begin
  if v_admin_id is null or not private.is_admin(v_admin_id) then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;

  select * into v_source from public.lessons where id = p_lesson_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Lesson not found.';
  end if;

  v_slug := left(v_source.slug, 210) || '-copy';
  while exists (select 1 from public.lessons where course_id = v_source.course_id and slug = v_slug)
  loop
    v_suffix := v_suffix + 1;
    v_slug := left(v_source.slug, 205) || '-copy-' || v_suffix;
  end loop;

  insert into public.lessons (
    course_id, section_id, title, slug, description, content, video_url, position, status
  ) values (
    v_source.course_id,
    v_source.section_id,
    v_source.title || ' — копия',
    v_slug,
    v_source.description,
    v_source.content,
    v_source.video_url,
    v_source.position + 1,
    'draft'
  ) returning id into v_copy_id;

  insert into public.lesson_blocks (lesson_id, type, content, position)
  select v_copy_id, type, content, position
  from public.lesson_blocks
  where lesson_id = p_lesson_id
  order by position;

  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, metadata)
  values (
    v_admin_id,
    'lesson.duplicated',
    'lesson',
    v_copy_id,
    jsonb_build_object('sourceLessonId', p_lesson_id)
  );

  return v_copy_id;
end;
$$;

create or replace function public.admin_delete_lesson(p_lesson_id uuid)
returns boolean
language plpgsql
set search_path = public, private
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_title text;
  v_progress_count integer;
begin
  if v_admin_id is null or not private.is_admin(v_admin_id) then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;

  select title into v_title from public.lessons where id = p_lesson_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Lesson not found.';
  end if;

  select count(*) into v_progress_count
  from public.lesson_progress
  where lesson_id = p_lesson_id;

  if v_progress_count > 0 then
    raise exception using errcode = '23503',
      message = 'Lesson has student progress and cannot be deleted. Unpublish it instead.';
  end if;

  delete from public.lessons where id = p_lesson_id;

  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, metadata)
  values (
    v_admin_id,
    'lesson.deleted',
    'lesson',
    p_lesson_id,
    jsonb_build_object('title', v_title)
  );

  return true;
end;
$$;

revoke all on function public.admin_save_lesson(jsonb, jsonb, text, jsonb) from public, anon;
revoke all on function public.admin_duplicate_lesson(uuid) from public, anon;
revoke all on function public.admin_delete_lesson(uuid) from public, anon;

grant execute on function public.admin_save_lesson(jsonb, jsonb, text, jsonb) to authenticated;
grant execute on function public.admin_duplicate_lesson(uuid) to authenticated;
grant execute on function public.admin_delete_lesson(uuid) to authenticated;
