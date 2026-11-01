CREATE OR REPLACE FUNCTION public.finish_recall_session(p_session_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
 s public.study_sessions%ROWTYPE;
 n integer; max_points integer; points numeric; percent numeric;
 successful integer; step integer; days integer; very_correct integer;
 conf jsonb; tag_row record; task_row record; studied_at timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO s FROM public.study_sessions WHERE id=p_session_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
 IF s.status='completed' THEN RETURN s.id; END IF;
 IF s.status<>'in_progress' THEN RAISE EXCEPTION 'Session is not active'; END IF;
 SELECT count(*), count(*) FILTER (WHERE evaluation_status<>'unable'),
 coalesce(sum(CASE evaluation_status WHEN 'correct' THEN 1 WHEN 'partial' THEN 0.5 ELSE 0 END),0),
 count(*) FILTER (WHERE confidence_level='very' AND evaluation_status='correct'),
 jsonb_build_object('guessing',count(*) FILTER (WHERE confidence_level='guessing'),'somewhat',count(*) FILTER (WHERE confidence_level='somewhat'),'very',count(*) FILTER (WHERE confidence_level='very'),'veryCorrect',count(*) FILTER (WHERE confidence_level='very' AND evaluation_status='correct'),'engine','mfe-1.0')
 INTO n,max_points,points,very_correct,conf FROM public.answers WHERE session_id=s.id AND user_id=auth.uid() AND question_id=ANY(s.question_ids);
 IF n<>cardinality(s.question_ids) OR n=0 THEN RAISE EXCEPTION 'Answer or skip every question before finishing'; END IF;
 percent := CASE WHEN max_points>0 THEN round(points/max_points*100,1) ELSE 0 END;
 UPDATE public.study_sessions SET status='completed',completed_at=now(),duration_seconds=greatest(0,extract(epoch FROM now()-s.started_at)::integer),score=points,maximum_score=max_points WHERE id=s.id;
 SELECT created_at INTO studied_at FROM public.topics WHERE id=s.topic_id;
 IF max_points>0 THEN
 INSERT INTO public.memory_observations(user_id,topic_id,session_id,recall_score,elapsed_time_since_study,confidence_summary,observation_type) VALUES(auth.uid(),s.topic_id,s.id,percent,greatest(0,extract(epoch FROM now()-coalesce(studied_at,s.started_at))::integer),conf,s.session_type);
 END IF;
 FOR tag_row IN SELECT coalesce(q.concept_tag,'General') AS tag,
 count(*) FILTER (WHERE a.evaluation_status IN ('incorrect','partial','skipped')) AS misses,
 count(*) FILTER (WHERE a.evaluation_status='correct') AS hits,
 count(*) FILTER (WHERE a.confidence_level='very' AND a.evaluation_status IN ('incorrect','partial')) AS overconfident
 FROM public.answers a JOIN public.questions q ON q.id=a.question_id WHERE a.session_id=s.id AND a.user_id=auth.uid() GROUP BY coalesce(q.concept_tag,'General') LOOP
 IF tag_row.misses>0 THEN
 INSERT INTO public.weak_spots(user_id,topic_id,concept_tag,occurrence_count,diagnostic_category,evidence_summary)
 VALUES(auth.uid(),s.topic_id,tag_row.tag,tag_row.misses,CASE WHEN tag_row.overconfident>0 THEN 'overconfidence' ELSE 'recurring_error' END,'Missed '||tag_row.misses||' question(s) in this session.')
 ON CONFLICT(user_id,topic_id,concept_tag) DO UPDATE SET occurrence_count=weak_spots.occurrence_count+excluded.occurrence_count,status='active',diagnostic_category=excluded.diagnostic_category,last_observed_at=now(),updated_at=now(),evidence_summary='Missed '||(weak_spots.occurrence_count+excluded.occurrence_count)||' time(s) across recorded sessions.';
 ELSIF tag_row.hits>0 THEN
 UPDATE public.weak_spots SET status='improving',updated_at=now() WHERE user_id=auth.uid() AND topic_id=s.topic_id AND concept_tag=tag_row.tag AND status='active';
 END IF;
 END LOOP;
 FOR task_row IN SELECT id FROM public.revision_tasks WHERE user_id=auth.uid() AND topic_id=s.topic_id AND status='pending' AND planned_for<=current_date FOR UPDATE LOOP
 UPDATE public.revision_tasks SET status='completed',completed_at=now(),session_id=s.id,updated_at=now() WHERE id=task_row.id;
 INSERT INTO public.revision_history(user_id,topic_id,revision_task_id,session_id,outcome_summary) VALUES(auth.uid(),s.topic_id,task_row.id,s.id,'Scored '||percent||'%');
 END LOOP;
 IF max_points>0 THEN
 SELECT count(*) INTO successful FROM public.memory_observations WHERE topic_id=s.topic_id AND user_id=auth.uid() AND recall_score>=70 AND session_id IS DISTINCT FROM s.id;
 IF percent<50 THEN days:=1;
 ELSE
 step:=successful+CASE WHEN percent>=70 THEN 1 ELSE 0 END+CASE WHEN percent>=85 AND very_correct::numeric/n>=0.6 THEN 1 ELSE 0 END;
 step:=greatest(0,step-1);
 days:=CASE step WHEN 0 THEN 1 WHEN 1 THEN 3 WHEN 2 THEN 7 WHEN 3 THEN 14 ELSE least(3650,14*power(2,least(step-3,8)))::integer END;
 END IF;
 DELETE FROM public.revision_tasks WHERE topic_id=s.topic_id AND user_id=auth.uid() AND status='pending' AND is_manual=false;
 INSERT INTO public.revision_tasks(user_id,topic_id,planned_for,planned_duration_minutes,reason) VALUES(auth.uid(),s.topic_id,current_date+days,greatest(10,least(30,n*2)),'Scored '||percent||'% — next spaced review in '||days||' day(s).');
 END IF;
 RETURN s.id;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_recall_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_recall_session(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.finish_recall_session(uuid) IS 'Owner-scoped, row-locked atomic recall scoring, evidence, weak spots and review scheduling.';