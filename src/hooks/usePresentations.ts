import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Presentation {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  slug: string | null;
  file_path: string | null;
  file_size: number | null;
  page_count: number | null;
  presentation_order: number;
  created_at: string;
  updated_at: string;
}

const BUCKET = "presentations";

export const getPresentationPublicUrl = (filePath: string | null | undefined) => {
  if (!filePath) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
};

export const usePresentations = (subjectId: string | null, ownerUserId?: string) => {
  const [items, setItems] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!subjectId) {
      setItems([]);
      return;
    }
    setLoading(true);
    let q = supabase.from("presentations").select("*").eq("subject_id", subjectId).order("presentation_order").order("created_at");
    if (ownerUserId) q = q.eq("user_id", ownerUserId);
    const { data } = await q;
    setItems((data as Presentation[]) || []);
    setLoading(false);
  }, [subjectId, ownerUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh, setItems };
};

export const uploadPresentation = async (params: {
  userId: string;
  subjectId: string;
  title: string;
  file: File;
}) => {
  const { userId, subjectId, title, file } = params;

  // 1. Determine next order
  const { data: existing } = await supabase
    .from("presentations")
    .select("presentation_order")
    .eq("subject_id", subjectId)
    .order("presentation_order", { ascending: false })
    .limit(1);
  const nextOrder = existing && existing[0] ? (existing[0].presentation_order || 0) + 1 : 0;

  // 2. Insert row
  const { data: row, error: insertError } = await supabase
    .from("presentations")
    .insert({
      user_id: userId,
      subject_id: subjectId,
      title: title || file.name.replace(/\.pdf$/i, ""),
      file_size: file.size,
      presentation_order: nextOrder,
    })
    .select()
    .single();
  if (insertError || !row) throw insertError;

  // 3. Upload to storage at userId/<id>.pdf
  const path = `${userId}/${row.id}.pdf`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) {
    await supabase.from("presentations").delete().eq("id", row.id);
    throw upErr;
  }

  // 4. Update row with file_path
  const { data: updated } = await supabase
    .from("presentations")
    .update({ file_path: path })
    .eq("id", row.id)
    .select()
    .single();
  return updated as Presentation;
};

export const renamePresentation = async (id: string, title: string) => {
  const { data, error } = await supabase
    .from("presentations")
    .update({ title })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Presentation;
};

export const deletePresentation = async (p: Presentation) => {
  // Soft delete: store in deleted_items
  await supabase.from("deleted_items").insert({
    user_id: p.user_id,
    item_type: "presentation",
    item_id: p.id,
    item_name: p.title,
    presentations_data: p as any,
  });
  if (p.file_path) {
    await supabase.storage.from("presentations").remove([p.file_path]);
  }
  await supabase.from("presentations").delete().eq("id", p.id);
};

export const reorderPresentations = async (ordered: Presentation[]) => {
  await Promise.all(
    ordered.map((p, idx) =>
      supabase.from("presentations").update({ presentation_order: idx }).eq("id", p.id)
    )
  );
};

export const updatePageCount = async (id: string, pageCount: number) => {
  await supabase.from("presentations").update({ page_count: pageCount }).eq("id", id);
};
