import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import {
  assignSprintTeam,
  createSprintEvent,
  reviewSprintEntry,
  setSprintStatus,
} from "./actions";

type SprintEvent = {
  id: string;
  name: string;
  status: string;
  multiplier: number;
  audience: "current_member" | "new_member";
  team_a_name: string;
  team_b_name: string;
};

type Entry = {
  id: string;
  event_id: string;
  amount_delivered: number;
  amount_pre_service: number;
  description: string | null;
  proof_path: string | null;
  team: string | null;
  status: string;
  reject_reason: string | null;
  profiles: { full_name: string | null; email: string } | null;
};

type Member = { id: string; full_name: string | null; role: string };

export default async function AdminSprint() {
  let events: SprintEvent[] = [];
  let entries: Entry[] = [];
  let members: Member[] = [];
  let rosters: { event_id: string; profile_id: string; team: string }[] = [];
  const proofUrls = new Map<string, string>();

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const [evRes, entryRes, memberRes, rosterRes] = await Promise.all([
      supabase
        .from("sprint_events")
        .select("id, name, status, multiplier, audience, team_a_name, team_b_name")
        .order("started_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("sprint_entries")
        .select(
          "id, event_id, amount_delivered, amount_pre_service, description, proof_path, team, status, reject_reason, profiles ( full_name, email )"
        )
        .order("submitted_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("is_active", true)
        .order("full_name"),
      supabase.from("sprint_rosters").select("*"),
    ]);
    events = (evRes.data as SprintEvent[]) ?? [];
    entries = (entryRes.data as unknown as Entry[]) ?? [];
    members = (memberRes.data as Member[]) ?? [];
    rosters = (rosterRes.data as typeof rosters) ?? [];

    for (const e of entries) {
      if (e.proof_path) {
        const { data: signed } = await supabase.storage
          .from("sprint")
          .createSignedUrl(e.proof_path, 3600);
        if (signed?.signedUrl) proofUrls.set(e.id, signed.signedUrl);
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

      {/* -------------------------------------------------------- create */}
      <form
        action={createSprintEvent}
        className="mb-6 flex flex-wrap items-center gap-2 border border-[#ddd] p-3"
      >
        <b>New sprint:</b>
        <input name="name" required placeholder="Fall 2026 Sprint" className={`${input} w-44`} />
        <select name="audience" required className={input} defaultValue="new_member">
          <option value="new_member">New member sprint</option>
          <option value="current_member">Current member sprint</option>
        </select>
        <label>
          ×<input name="multiplier" defaultValue="1.5" className={`${input} w-12`} />
        </label>
        <input name="team_a_name" placeholder="Team A name" className={`${input} w-28`} />
        <input name="team_b_name" placeholder="Team B name" className={`${input} w-28`} />
        <button type="submit" className={btn}>Create</button>
        <span className="w-full text-[12px] text-[#666]">
          Team names matter for current-member sprints — assign the roster
          after creating, then the two teams compete.
        </span>
      </form>

      {events.map((ev) => {
        const evEntries = entries.filter((e) => e.event_id === ev.id);
        const evRoster = new Map(
          rosters.filter((r) => r.event_id === ev.id).map((r) => [r.profile_id, r.team])
        );
        const eligible = members.filter((m) =>
          ev.audience === "new_member"
            ? m.role === "new_member"
            : m.role !== "new_member"
        );
        return (
          <section key={ev.id} className="mb-10 border border-[#ddd] p-3">
            <div className="mb-2 flex items-center gap-3">
              <b className="text-[15px]">{ev.name}</b>
              <span className="rounded bg-[#eee] px-1.5 text-[11px] uppercase">
                {ev.audience === "current_member" ? "current members" : "new members"}
              </span>
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

            {/* ------------------------------------------------- roster */}
            {ev.audience === "current_member" && (
              <details className="mb-3" open={ev.status !== "closed"}>
                <summary className="cursor-pointer font-semibold">
                  Teams: {ev.team_a_name} vs {ev.team_b_name} (
                  {[...evRoster.values()].filter((t) => t === "a").length} vs{" "}
                  {[...evRoster.values()].filter((t) => t === "b").length} assigned)
                </summary>
                <table className="mt-2 border-collapse">
                  <tbody>
                    {eligible.map((m) => (
                      <tr key={m.id}>
                        <td className={td}>{m.full_name ?? "Member"}</td>
                        <td className={td}>
                          <form action={assignSprintTeam} className="flex items-center gap-1">
                            <input type="hidden" name="event_id" value={ev.id} />
                            <input type="hidden" name="profile_id" value={m.id} />
                            <select
                              name="team"
                              defaultValue={evRoster.get(m.id) ?? "none"}
                              className={input}
                            >
                              <option value="none">— no team</option>
                              <option value="a">{ev.team_a_name}</option>
                              <option value="b">{ev.team_b_name}</option>
                            </select>
                            <button type="submit" className={btn}>Set</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}

            {/* ------------------------------------------------ entries */}
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Member</th>
                  <th className={th}>Team</th>
                  <th className={th}>Delivered</th>
                  <th className={th}>Pre-service</th>
                  <th className={th}>Description</th>
                  <th className={th}>Proof</th>
                  <th className={th}>Status</th>
                  <th className={th}>Review</th>
                </tr>
              </thead>
              <tbody>
                {evEntries.length === 0 && (
                  <tr><td className={td} colSpan={8}>No entries.</td></tr>
                )}
                {evEntries.map((e) => (
                  <tr key={e.id} className={e.status === "rejected" ? "opacity-60" : ""}>
                    <td className={td}>{e.profiles?.full_name ?? e.profiles?.email}</td>
                    <td className={td}>
                      {e.team === "a"
                        ? ev.team_a_name
                        : e.team === "b"
                          ? ev.team_b_name
                          : e.team ?? "—"}
                    </td>
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
                      {e.reject_reason && (
                        <span className="block text-[#b91c1c]">{e.reject_reason}</span>
                      )}
                    </td>
                    <td className={td}>
                      {e.status === "pending" ? (
                        <form action={reviewSprintEntry} className="flex flex-wrap items-center gap-1">
                          <input type="hidden" name="entry_id" value={e.id} />
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
        );
      })}
    </div>
  );
}
