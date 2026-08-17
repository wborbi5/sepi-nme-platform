import "server-only";
import { createServiceClient, serviceRoleConfigured } from "@/lib/supabase/admin";

/*
 * Resume parsing via LlamaExtract (LlamaCloud v2 stateless API).
 *
 * The raw PDF in the resumes bucket is the source of truth and never
 * changes. This pipeline reads it server-side, sends it to LlamaExtract
 * with an inline schema, and stores the structured result on
 * profiles.resume_parsed for the profile page to render.
 *
 * Without LLAMA_CLOUD_API_KEY the whole thing no-ops — upload flow and
 * raw PDF behave identically.
 */

const API = "https://api.cloud.llamaindex.ai";

export type ParsedResume = {
  status: "done" | "failed";
  parsed_at: string;
  summary?: string;
  skills?: string[];
  experience?: {
    title?: string;
    organization?: string;
    start_date?: string;
    end_date?: string;
    location?: string;
    highlights?: string[];
  }[];
  education?: { institution?: string; degree?: string; grad_year?: string }[];
  error?: string;
};

const RESUME_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "A 2-3 sentence plain-English summary of this person's background and what they're strongest at, written in third person. Translate any jargon into clear language a non-specialist understands.",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description:
        "Professional skills, tools, and technologies, deduplicated, each 1-3 words.",
    },
    experience: {
      type: "array",
      description: "Work, internship, and leadership experience, most recent first.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Role title" },
          organization: { type: "string", description: "Company or organization" },
          start_date: { type: "string", description: "e.g. 'May 2025'" },
          end_date: { type: "string", description: "e.g. 'Aug 2025' or 'Present'" },
          location: { type: "string" },
          highlights: {
            type: "array",
            items: { type: "string" },
            description:
              "1-3 short plain-English bullets on what they actually did and achieved.",
          },
        },
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          degree: { type: "string", description: "Degree and major" },
          grad_year: { type: "string" },
        },
      },
    },
  },
  required: ["summary", "skills", "experience"],
};

async function poll(jobId: string, apiKey: string): Promise<Record<string, unknown>> {
  const deadline = Date.now() + 50_000;
  for (;;) {
    const res = await fetch(`${API}/api/v2/extract/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`poll failed: ${res.status}`);
    const body = (await res.json()) as {
      status: string;
      extract_result?: Record<string, unknown>;
      error?: string;
    };
    if (body.status === "COMPLETED" || body.status === "SUCCESS")
      return body.extract_result ?? {};
    if (body.status === "FAILED" || body.status === "ERROR")
      throw new Error(body.error ?? "extraction failed");
    if (Date.now() > deadline) throw new Error("extraction timed out");
    await new Promise((r) => setTimeout(r, 2500));
  }
}

/** Parse a member's uploaded resume and store the result on their profile. */
export async function parseResumeForProfile(
  profileId: string
): Promise<{ ok: boolean; message: string }> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) return { ok: false, message: "Resume parsing is not configured yet" };
  if (!serviceRoleConfigured()) return { ok: false, message: "Supabase not configured" };

  const service = createServiceClient();
  try {
    const { data: profile } = await service
      .from("profiles")
      .select("resume_path")
      .eq("id", profileId)
      .single();
    if (!profile?.resume_path) return { ok: false, message: "No resume on file" };

    // Read the raw PDF from storage (server-side; the bucket is private).
    const { data: pdf, error: dlErr } = await service.storage
      .from("resumes")
      .download(profile.resume_path);
    if (dlErr || !pdf) throw new Error(dlErr?.message ?? "could not read resume");

    // 1. Hand the file to LlamaCloud.
    const form = new FormData();
    form.set("file", new File([pdf], "resume.pdf", { type: "application/pdf" }));
    form.set("purpose", "extract");
    const fileRes = await fetch(`${API}/api/v1/beta/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!fileRes.ok)
      throw new Error(`file upload failed: ${fileRes.status} ${(await fileRes.text()).slice(0, 200)}`);
    const { id: fileId } = (await fileRes.json()) as { id: string };

    // 2. Stateless extraction with the schema inline.
    const jobRes = await fetch(`${API}/api/v2/extract`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_input: fileId,
        configuration: {
          extraction_target: "per_doc",
          data_schema: RESUME_SCHEMA,
        },
      }),
    });
    if (!jobRes.ok)
      throw new Error(`extract job failed: ${jobRes.status} ${(await jobRes.text()).slice(0, 200)}`);
    const { id: jobId } = (await jobRes.json()) as { id: string };

    // 3. Poll to completion and persist.
    const result = await poll(jobId, apiKey);
    const data = (result.data ?? result) as Record<string, unknown>;

    const parsed: ParsedResume = {
      status: "done",
      parsed_at: new Date().toISOString(),
      summary: typeof data.summary === "string" ? data.summary : undefined,
      skills: Array.isArray(data.skills) ? (data.skills as string[]).slice(0, 30) : [],
      experience: Array.isArray(data.experience)
        ? (data.experience as ParsedResume["experience"])!.slice(0, 12)
        : [],
      education: Array.isArray(data.education)
        ? (data.education as ParsedResume["education"])!.slice(0, 6)
        : [],
    };

    await service.from("profiles").update({ resume_parsed: parsed }).eq("id", profileId);
    return { ok: true, message: "Resume parsed" };
  } catch (err) {
    const parsed: ParsedResume = {
      status: "failed",
      parsed_at: new Date().toISOString(),
      error: err instanceof Error ? err.message.slice(0, 300) : "unknown",
    };
    // Best-effort failure record; never throw past here.
    await service
      .from("profiles")
      .update({ resume_parsed: parsed })
      .eq("id", profileId);
    console.error("resume parse failed:", err);
    return { ok: false, message: "Parsing failed — the raw PDF is still available" };
  }
}
