import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { createCalEvent, deleteCalEvent, updateCalEvent } from "./actions";

type CalEvent = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  location: string | null;
  description: string | null;
  week_number: number | null;
};

export default async function AdminCalendar() {
  let events: CalEvent[] = [];
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cal_events")
      .select("*")
      .order("event_date")
      .order("start_time");
    events = (data as CalEvent[]) ?? [];
  }

  const th = "border border-[#ddd] bg-[#f5f5f5] px-2 py-1 text-left font-semibold";
  const td = "border border-[#ddd] px-2 py-1 align-middle";
  const input = "border border-[#bbb] px-1.5 py-0.5 text-[13px] min-h-0";
  const btn =
    "border border-[#888] bg-[#eee] px-2 py-0.5 text-[12px] hover:bg-[#ddd] min-h-0 cursor-pointer";

  const fields = (e?: CalEvent) => (
    <>
      <input name="title" required defaultValue={e?.title ?? ""} placeholder="title" className={`${input} w-40`} />
      <input name="event_date" type="date" required defaultValue={e?.event_date ?? ""} className={input} />
      <input name="start_time" type="time" defaultValue={e?.start_time?.slice(0, 5) ?? ""} className={input} />
      <input name="location" defaultValue={e?.location ?? ""} placeholder="location" className={`${input} w-28`} />
      <input name="description" defaultValue={e?.description ?? ""} placeholder="description" className={`${input} w-44`} />
      <input name="week_number" defaultValue={e?.week_number ?? ""} placeholder="wk#" inputMode="numeric" className={`${input} w-12`} />
    </>
  );

  return (
    <div className="text-[13px]">
      <h1 className="mb-4 text-lg font-bold">Calendar</h1>

      <form action={createCalEvent} className="mb-6 flex flex-wrap items-center gap-1.5 border border-[#ddd] p-3">
        <b className="mr-2">New event:</b>
        {fields()}
        <button type="submit" className={btn}>Add</button>
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Event</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 && (
            <tr><td className={td} colSpan={2}>No events yet.</td></tr>
          )}
          {events.map((e) => (
            <tr key={e.id}>
              <td className={td}>
                <form action={updateCalEvent} className="flex flex-wrap items-center gap-1.5">
                  <input type="hidden" name="id" value={e.id} />
                  {fields(e)}
                  <button type="submit" className={btn}>Save</button>
                </form>
              </td>
              <td className={`${td} w-16`}>
                <form action={deleteCalEvent}>
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className={btn}>Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
