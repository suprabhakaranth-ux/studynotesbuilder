import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type MarginNote = Tables<"topic_margin_notes">;

export function useMarginNotes(topicId: string, userId: string | undefined, enabled: boolean) {
  const [notes, setNotes] = useState<MarginNote[]>([]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const pending = useRef(new Map<string, MarginNote>());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const retryTimer = useRef<ReturnType<typeof setTimeout>>();
  const retryCount = useRef(0);
  const queue = useRef(Promise.resolve());

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    const batch = [...pending.current.values()];
    pending.current.clear();
    if (!batch.length) return queue.current;
    setStatus("saving");
    queue.current = queue.current.then(async () => {
      const { error } = await supabase.from("topic_margin_notes").upsert(batch);
      if (error) {
        for (const note of batch) if (!pending.current.has(note.id)) pending.current.set(note.id, note);
        setStatus("error");
      } else setStatus(pending.current.size ? "saving" : "saved");
    }).catch(() => {
      for (const note of batch) if (!pending.current.has(note.id)) pending.current.set(note.id, note);
      setStatus("error");
    });
    return queue.current;
  };

  useEffect(() => {
    if (!enabled || !userId) return;
    let active = true;
    setReady(false);
    supabase.from("topic_margin_notes").select("*").eq("topic_id", topicId).eq("user_id", userId)
      .order("created_at").then(({ data, error }) => {
        if (!active) return;
        if (error) { setStatus("error"); return; }
        setNotes(data || []);
        setReady(true);
      });
    return () => { active = false; void flush(); };
    // Persist only explicit annotation edits, never on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, userId, enabled]);

  const persist = (note: MarginNote) => {
    pending.current.set(note.id, note);
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 650);
  };
  const update = (id: string, patch: Partial<MarginNote>) => {
    setNotes(previous => previous.map(note => {
      if (note.id !== id) return note;
      const next = { ...note, ...patch };
      persist(next);
      return next;
    }));
  };
  const add = (x: number, y: number, tab: string, anchor: string) => {
    if (!userId || !ready) return;
    const note: MarginNote = {
      id: crypto.randomUUID(), topic_id: topicId, user_id: userId,
      text_content: "", drawing_content: "", anchor_text: anchor,
      x, y, page_tab: tab, deleted_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    setNotes(previous => [...previous, note]);
    persist(note);
    return note.id;
  };
  return { notes, ready, status, add, update, flush };
}