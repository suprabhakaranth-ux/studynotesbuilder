import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const PUBLIC_OWNER_ID = "b6dc6569-25ba-4ea0-a7bf-607219aa8daf";
const SITE = "https://studynotesbuilder.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [{ data: subjects }, { data: chapters }, { data: topics }] = await Promise.all([
    supabase.from("subjects").select("id,slug,updated_at").eq("user_id", PUBLIC_OWNER_ID),
    supabase.from("chapters").select("id,slug,subject_id,updated_at").eq("user_id", PUBLIC_OWNER_ID),
    supabase.from("topics").select("id,slug,subject_id,chapter_id,updated_at").eq("user_id", PUBLIC_OWNER_ID),
  ]);

  const subjBySlug = new Map((subjects || []).map((s: any) => [s.id, s]));
  const chapBySlug = new Map((chapters || []).map((c: any) => [c.id, c]));

  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${SITE}/` },
    { loc: `${SITE}/library` },
  ];

  for (const s of subjects || []) {
    urls.push({ loc: `${SITE}/library/${s.slug}`, lastmod: s.updated_at });
  }
  for (const c of chapters || []) {
    const s: any = subjBySlug.get(c.subject_id);
    if (!s) continue;
    urls.push({ loc: `${SITE}/library/${s.slug}/${c.slug}`, lastmod: c.updated_at });
  }
  for (const t of topics || []) {
    const s: any = subjBySlug.get(t.subject_id);
    if (!s || !t.slug) continue;
    const cSlug = t.chapter_id ? (chapBySlug.get(t.chapter_id) as any)?.slug || "_" : "_";
    urls.push({ loc: `${SITE}/library/${s.slug}/${cSlug}/${t.slug}`, lastmod: t.updated_at });
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc>${
            u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""
          }</url>`
      )
      .join("\n") +
    `\n</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
});
