import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export default async function AdminEmail() {
  let rows: {
    id: string;
    to_email: string;
    type: string;
    subject: string;
    status: string;
    created_at: string;
  }[] = [];

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("email_log")
      .select("id, to_email, type, subject, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    rows = (data as typeof rows) ?? [];
  }

  const th = "border border-[#ddd] bg-[#f5f5f5] px-2 py-1 text-left font-semibold";
  const td = "border border-[#ddd] px-2 py-1";

  return (
    <div className="text-[13px]">
      <h1 className="mb-4 text-lg font-bold">Email log</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Date</th>
            <th className={th}>To</th>
            <th className={th}>Type</th>
            <th className={th}>Subject</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className={td} colSpan={5}>
                Nothing sent yet.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={td}>{new Date(r.created_at).toLocaleString()}</td>
              <td className={td}>{r.to_email}</td>
              <td className={td}>{r.type}</td>
              <td className={td}>{r.subject}</td>
              <td className={td}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
