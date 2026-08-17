import SiteNav from "@/components/SiteNav";
import SprintSubmitForm from "@/components/SprintSubmitForm";
import { getNavSession } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Money Sprint — SEPi Portal" };

/*
 * Two sprint kinds can run at once: the Current Member sprint (two
 * admin-built teams competing) and the New Member sprint. Each renders
 * as its own block; you can only submit to the one for your role.
 */

type SprintEvent = {
  id: string;
  name: string;
  status: string;
  multiplier: number;
  audience: "current_member" | "new_member";
  team_a_name: string;
  team_b_name: string;
};

type BoardRow = {
  event_id: string;
  profile_id: string;
  full_name: string | null;
  team: string | null;
  delivered: number;
  pre_service: number;
  score: number;
};

export default async function SprintPage() {
  const nav = await getNavSession();

  let events: SprintEvent[] = [];
  let board: BoardRow[] = [];
  let rosters: { event_id: string; profile_id: string; team: string }[] = [];
  let rosterNames = new Map<string, string>();
  let myRole: string | null = null;
  let myPendingByEvent = new Map<string, number>();

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const [eventsRes, meRes] = await Promise.all([
      supabase
        .from("sprint_events")
        .select("id, name, status, multiplier, audience, team_a_name, team_b_name")
        .in("status", ["open", "closed"])
        .order("started_at", { ascending: false, nullsFirst: false }),
      nav.userId
        ? supabase.from("profiles").select("role").eq("id", nav.userId).single()
        : Promise.resolve({ data: null }),
    ]);
    events = (eventsRes.data as SprintEvent[]) ?? [];
    myRole = (meRes.data as { role?: string } | null)?.role ?? null;

    if (events.length > 0) {
      const ids = events.map((e) => e.id);
      const [boardRes, rosterRes, pendingRes, profilesRes] = await Promise.all([
        supabase.from("sprint_leaderboard").select("*").in("event_id", ids),
        supabase.from("sprint_rosters").select("*").in("event_id", ids),
        nav.userId
          ? supabase
              .from("sprint_entries")
              .select("event_id")
              .eq("profile_id", nav.userId)
              .eq("status", "pending")
          : Promise.resolve({ data: [] }),
        supabase.from("profiles").select("id, full_name"),
      ]);
      board = ((boardRes.data as BoardRow[]) ?? []).sort((x, y) => y.score - x.score);
      rosters = (rosterRes.data as typeof rosters) ?? [];
      for (const p of profilesRes.data ?? [])
        rosterNames.set(p.id, p.full_name ?? "Member");
      for (const e of (pendingRes.data as { event_id: string }[]) ?? [])
        myPendingByEvent.set(e.event_id, (myPendingByEvent.get(e.event_id) ?? 0) + 1);
    }
  }

  const myAudience =
    myRole == null ? null : myRole === "new_member" ? "new_member" : "current_member";

  function SprintBlock({ event }: { event: SprintEvent }) {
    const rows = board.filter((r) => r.event_id === event.id);
    const roster = rosters.filter((r) => r.event_id === event.id);
    const teamTotal = (team: "a" | "b") =>
      rows
        .filter((r) => r.team === team)
        .reduce((s, r) => s + Number(r.score), 0);
    const teamed = event.audience === "current_member" && roster.length > 0;
    const canSubmit =
      event.status === "open" && nav.userId && myAudience === event.audience;
    const pending = myPendingByEvent.get(event.id) ?? 0;

    return (
      <section className="mb-16">
        <div className="text-center">
          <span className="rounded-full bg-stone px-3 py-1 text-xs font-bold uppercase tracking-wide text-steel">
            {event.audience === "current_member" ? "Current members" : "New members"}
          </span>
          <p className="mt-3 text-lg text-midnight">
            <b>{event.name}</b> ·{" "}
            {event.status === "open" ? (
              <span className="font-bold text-[#15803d]">OPEN</span>
            ) : (
              <span className="font-bold text-steel">closed</span>
            )}{" "}
            · pre-service ×{event.multiplier}
          </p>
        </div>

        {/* team competition — current-member sprints with a roster */}
        {teamed && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {(["a", "b"] as const).map((t) => (
                <div
                  key={t}
                  className={`rounded-xl border bg-paper p-4 text-center ${
                    teamTotal(t) >= teamTotal(t === "a" ? "b" : "a")
                      ? "border-navy"
                      : "border-stone"
                  }`}
                >
                  <p className="text-sm font-bold uppercase tracking-wide text-steel">
                    {t === "a" ? event.team_a_name : event.team_b_name}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-navy">
                    ${Math.round(teamTotal(t)).toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-steel">
                    {roster
                      .filter((r) => r.team === t)
                      .map((r) => rosterNames.get(r.profile_id))
                      .join(" · ") || "No one assigned yet"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* submission */}
        {canSubmit && (
          <div className="mt-8">
            {pending > 0 && (
              <p className="mb-3 text-sm font-semibold text-[#b45309]">
                {pending} of your entries pending approval.
              </p>
            )}
            <SprintSubmitForm eventId={event.id} profileId={nav.userId!} />
          </div>
        )}
        {event.status === "open" && myAudience && myAudience !== event.audience && (
          <p className="mt-6 text-center text-sm text-steel">
            This sprint is for {event.audience === "current_member" ? "current" : "new"}{" "}
            members — yours is above.
          </p>
        )}

        {/* individual leaderboard */}
        <h2 className="mt-10 text-xl font-extrabold text-midnight">Leaderboard</h2>
        {rows.length === 0 && (
          <p className="mt-3 text-slate-blue">No approved entries yet.</p>
        )}
        <div className="mt-3">
          {rows.map((row, i) => (
            <div
              key={row.profile_id}
              className="flex items-center justify-between border-t border-stone py-3"
            >
              <span className="flex items-center gap-3">
                <span className="w-7 text-lg font-extrabold text-mist">{i + 1}</span>
                <span>
                  <span className="font-bold text-midnight">
                    {row.full_name ?? "Member"}
                  </span>
                  {teamed && row.team && (
                    <span className="ml-2 rounded bg-stone px-1.5 py-0.5 text-xs font-bold uppercase text-steel">
                      {row.team === "a" ? event.team_a_name : event.team_b_name}
                    </span>
                  )}
                  <span className="block text-xs text-steel">
                    ${Number(row.delivered).toLocaleString()} delivered · $
                    {Number(row.pre_service).toLocaleString()} pre-service
                  </span>
                </span>
              </span>
              <span className="text-xl font-extrabold text-navy">
                ${Math.round(Number(row.score)).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Your sprint first, the other one after.
  const ordered = [...events].sort((x, y) =>
    x.audience === myAudience ? -1 : y.audience === myAudience ? 1 : 0
  );

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-2xl px-6 pb-24">
        <h1 className="display-serif py-14 text-center text-6xl">Money Sprint</h1>

        {events.length === 0 && (
          <p className="text-center text-slate-blue">
            No sprint running. The boards appear when one starts.
          </p>
        )}

        {ordered.map((e) => (
          <SprintBlock key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}
