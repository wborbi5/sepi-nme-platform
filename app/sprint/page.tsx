import SiteNav from "@/components/SiteNav";
import SprintSubmitForm from "@/components/SprintSubmitForm";
import { getNavSession } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Money Sprint — SEPi Portal" };

/*
 * Leaderboard ranked by delivered + pre_service × multiplier, via the
 * sprint_leaderboard view (approved entries only). Wyatt vs Madison
 * team totals. Submission form while the event is open.
 */

export default async function SprintPage() {
  const nav = await getNavSession();

  let event: { id: string; name: string; status: string; multiplier: number } | null = null;
  let board: {
    profile_id: string;
    full_name: string | null;
    team: string | null;
    delivered: number;
    pre_service: number;
    score: number;
  }[] = [];
  let myPending = 0;

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data: events } = await supabase
      .from("sprint_events")
      .select("id, name, status, multiplier")
      .in("status", ["open", "closed"])
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(1);
    event = events?.[0] ?? null;

    if (event) {
      const [boardRes, pendingRes] = await Promise.all([
        supabase
          .from("sprint_leaderboard")
          .select("*")
          .eq("event_id", event.id)
          .order("score", { ascending: false }),
        nav.userId
          ? supabase
              .from("sprint_entries")
              .select("id", { count: "exact", head: true })
              .eq("event_id", event.id)
              .eq("profile_id", nav.userId)
              .eq("status", "pending")
          : Promise.resolve({ count: 0 }),
      ]);
      board = (boardRes.data as typeof board) ?? [];
      myPending = pendingRes.count ?? 0;
    }
  }

  const teamTotals = new Map<string, number>();
  for (const row of board) {
    if (row.team)
      teamTotals.set(row.team, (teamTotals.get(row.team) ?? 0) + Number(row.score));
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-2xl px-6 pb-24">
        <h1 className="display-serif py-14 text-center text-6xl">Money Sprint</h1>

        {!event && (
          <p className="text-center text-slate-blue">
            No sprint running. The board appears when one starts.
          </p>
        )}

        {event && (
          <>
            <p className="text-center text-lg text-midnight">
              <b>{event.name}</b> ·{" "}
              {event.status === "open" ? (
                <span className="font-bold text-[#15803d]">OPEN</span>
              ) : (
                <span className="font-bold text-steel">closed</span>
              )}{" "}
              · pre-service ×{event.multiplier}
            </p>

            {/* team totals */}
            {teamTotals.size > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-3">
                {["wyatt", "madison"].map((team) => (
                  <div
                    key={team}
                    className="rounded-xl border border-stone bg-paper p-4 text-center"
                  >
                    <p className="text-sm font-bold uppercase tracking-wide text-steel">
                      Team {team}
                    </p>
                    <p className="mt-1 text-3xl font-extrabold text-navy">
                      ${Math.round(teamTotals.get(team) ?? 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* submission */}
            {event.status === "open" && nav.userId && (
              <div className="mt-8">
                {myPending > 0 && (
                  <p className="mb-3 text-sm font-semibold text-[#b45309]">
                    {myPending} of your entries pending approval — they count
                    once an admin approves.
                  </p>
                )}
                <SprintSubmitForm eventId={event.id} profileId={nav.userId} />
              </div>
            )}

            {/* leaderboard */}
            <h2 className="mt-12 text-xl font-extrabold text-midnight">Leaderboard</h2>
            {board.length === 0 && (
              <p className="mt-3 text-slate-blue">No approved entries yet.</p>
            )}
            <div className="mt-3">
              {board.map((row, i) => (
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
                      {row.team && (
                        <span className="ml-2 rounded bg-stone px-1.5 py-0.5 text-xs font-bold uppercase text-steel">
                          {row.team}
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
          </>
        )}
      </div>
    </div>
  );
}
