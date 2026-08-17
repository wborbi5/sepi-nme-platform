import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/* Every submission, every pass, side by side. Admin reads the private
 * applications table directly — RLS allows it. */
export default async function AdminApplications() {
  let rows: {
    id: string;
    pass_number: number;
    submitted_at: string;
    answers: Record<string, string>;
    companies: { name: string } | null;
  }[] = [];

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("applications")
      .select("id, pass_number, submitted_at, answers, companies ( name )")
      .order("submitted_at", { ascending: false });
    rows = (data as unknown as typeof rows) ?? [];
  }

  const th = "border border-[#ddd] bg-[#f5f5f5] px-2 py-1 text-left font-semibold";
  const td = "border border-[#ddd] px-2 py-1 align-top";

  return (
    <div className="text-[13px]">
      <h1 className="mb-4 text-lg font-bold">Applications</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Company</th>
            <th className={th}>Pass</th>
            <th className={th}>Submitted</th>
            <th className={th}>Answers</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className={td} colSpan={4}>
                No submissions yet.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={td}>{r.companies?.name}</td>
              <td className={td}>{r.pass_number}</td>
              <td className={td}>{new Date(r.submitted_at).toLocaleDateString()}</td>
              <td className={td}>
                <details>
                  <summary className="cursor-pointer">
                    {Object.keys(r.answers ?? {}).length} answers
                  </summary>
                  <dl className="mt-1">
                    {Object.entries(r.answers ?? {}).map(([k, v]) => (
                      <div key={k} className="mb-1">
                        <dt className="font-semibold">{k}</dt>
                        <dd className="text-[#444]">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
