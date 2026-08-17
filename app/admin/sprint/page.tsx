import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { createSprintEvent, reviewSprintEntry, setSprintStatus } from "./actions";

type SprintEvent = {
  id: string;
  name: string;
  status: string;
  multiplier: number;
};

type Entry = {
  id: string;
  amount_delivered: number;
  amount_pre_service: number;
  description: string | null;
  proof_path: string | null;
  team: string | null;
  status: string;
  reject_reason: string | null;
  submitted_at: string;
  profiles: { full_name: string | null; email: string } | null;
};

export default async function AdminSprint() {
  let events: SprintEvent[] = [];
  let entriesByEvent = new Map<string, Entry[]>();
  let proofUrls = new Map<string, string>();

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data: ev } = await supabase
      .from("sprint_events")
      .select("id, name, status, multiplier")
      .order("started_at", { ascending: false, nullsFirst: false });
    events = (ev as SprintEvent[]) ?? [];

    if (events.length > 0) {
      const { data: entries } = await supabase
        .from("sprint_entries")
        .select(
          "id, event_id, amount_delivered, amount_pre_service, description, proof_path, team, status, reject_reason, submitted_at, profiles ( full_name, email )"
        )
        .order("submitted_at", { ascending: false });
      for (const e of (entries ?? []) as unknown as (Entry & { event_id: string })[]) {
        entriesByEvent.set(e.event_id, [...(entriesByEvent.get(e.event_id) ?? []), e]);
        // Signed URL minted server-side — private bucket, never proxied.
        if (e.proof_path) {
          const { data: signed } = await supabase.storage
            .from("sprint")
            .createSignedUrl(e.proof_path, 3600);
          if (signed?.signedUrl) proofUrls.set(e.id, signed.signedUrl);
        }
      }
    }
  }

  const th = "border border-[#ddd] bg-[#f5f5f5] px-2 py-1 text-left font-semibold";
  const td = "border border-[#ddd] px-2 py-1 align-middle";
  const input = "border border-[#bbb] px-1.5 py-0.5 text-[13px] min-h-0";
  const btn =
    "border border-[#888] bg-[#eee] px-2 py-0.5 text-[12px] hover:bg-[#ddd] min-h-0 cursor-pointer";

  return (
    <div className="text-[13px]">
      <h1 className="mb-4 text-lg font-bold">Money Sprint</h1>

      <form action={createSprintEvent} className="mb-6 flex items-center gap-2 border border-[#ddd] p-3">
        <b>New event:</b>
        <input name="name" required placeholder="Fall 2026 Sprint" className={`${input} w-48`} />
        <label>
          multiplier <input name="multiplier" defaultValue="1.5" className={`${input} w-14`} />
        </label>
        <button type="submit" className={btn}>Create</button>
      </form>

      {events.map((ev) => (
        <section key={ev.id} className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <b className="text-[15px]">{ev.name}</b>
            <span className="uppercase text-[#666]">{ev.status}</span>
            <span>×{ev.multiplier}</span>
            {ev.status !== "open" && (
              <form action={setSprintStatus}>
                <input type="hidden" name="id" value={ev.id} />
                <input type="hidden" name="status" value="open" />
                <button className={btn}>Open</button>
              </form>
            )}
            {ev.status === "open" && (
              <form action={setSprintStatus}>
                <input type="hidden" name="id" value={ev.id} />
                <input type="hidden" name="status" value="closed" />
                <button className={btn}>Close</button>
              </form>
            )}
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Member</th>
                <th className={th}>Delivered</th>
                <th className={th}>Pre-service</th>
                <th className={th}>Description</th>
                <th className={th}>Proof</th>
                <th className={th}>Status</th>
                <th className={th}>Review</th>
              </tr>
            </thead>
            <tbody>
              {(entriesByEvent.get(ev.id) ?? []).length === 0 && (
                <tr><td className={td} colSpan={7}>No entries.</td></tr>
              )}
              {(entriesByEvent.get(ev.id) ?? []).map((e) => (
                <tr key={e.id} className={e.status === "rejected" ? "opacity-60" : ""}>
                  <td className={td}>{e.profiles?.full_name ?? e.profiles?.email}</td>
                  <td className={`${td} text-right`}>${e.amount_delivered.toLocaleString()}</td>
                  <td className={`${td} text-right`}>${e.amount_pre_service.toLocaleString()}</td>
                  <td className={td}>{e.description}</td>
                  <td className={td}>
                    {proofUrls.get(e.id) ? (
                      <a href={proofUrls.get(e.id)} target="_blank" rel="noreferrer" className="text-[#0b57d0] underline">
                        photo
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>
                    <b>{e.status}</b>
                    {e.reject_reason && <span className="block text-[#b91c1c]">{e.reject_reason}</span>}
                  </td>
                  <td className={td}>
                    {e.status === "pending" ? (
                      <form action={reviewSprintEntry} className="flex flex-wrap items-center gap-1">
                        <input type="hidden" name="entry_id" value={e.id} />
                        <select name="team" defaultValue={e.team ?? ""} className={input}>
                          <option value="">no team</option>
                          <option value="wyatt">wyatt</option>
                          <option value="madison">madison</option>
                        </select>
                        <input name="reject_reason" placeholder="reject reason" className={`${input} w-28`} />
                        <button name="decision" value="approved" className={btn}>Approve</button>
                        <button name="decision" value="rejected" className={btn}>Reject</button>
                      </form>
                    ) : (
                      "resolved"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
