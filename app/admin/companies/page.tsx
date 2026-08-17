import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { updateCompany } from "../actions";

type Row = {
  id: string;
  slug: string;
  name: string;
  one_liner: string;
  status: string;
  investable: boolean;
  industry: string | null;
  founded_year: number | null;
};

export default async function AdminCompanies() {
  let companies: Row[] = [];
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("companies")
      .select("id, slug, name, one_liner, status, investable, industry, founded_year")
      .order("name");
    companies = (data as Row[]) ?? [];
  }

  const th = "border border-[#ddd] bg-[#f5f5f5] px-2 py-1 text-left font-semibold";
  const td = "border border-[#ddd] px-2 py-1 align-middle";
  const input = "border border-[#bbb] px-1.5 py-0.5 text-[13px] min-h-0";
  const btn =
    "border border-[#888] bg-[#eee] px-2 py-0.5 text-[12px] hover:bg-[#ddd] min-h-0 cursor-pointer";

  return (
    <div className="text-[13px]">
      <h1 className="mb-4 text-lg font-bold">Companies</h1>
      <p className="mb-3 text-[12px] text-[#666]">
        `investable` gates the Invest button — founding-class companies stay
        off. Status `killed` hides nothing; it just tags the row.
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Company</th>
            <th className={th}>One-liner</th>
            <th className={th}>Controls</th>
          </tr>
        </thead>
        <tbody>
          {companies.length === 0 && (
            <tr>
              <td className={td} colSpan={3}>
                No companies yet.
              </td>
            </tr>
          )}
          {companies.map((c) => (
            <tr key={c.id}>
              <td className={td}>
                <a href={`/companies/${c.slug}`} className="font-bold hover:underline">
                  {c.name}
                </a>
              </td>
              <td className={td}>{c.one_liner}</td>
              <td className={td}>
                <form action={updateCompany} className="flex flex-wrap items-center gap-1.5">
                  <input type="hidden" name="id" value={c.id} />
                  <select name="investable" defaultValue={String(c.investable)} className={input}>
                    <option value="true">investable</option>
                    <option value="false">not investable</option>
                  </select>
                  <select name="status" defaultValue={c.status} className={input}>
                    <option value="active">active</option>
                    <option value="pivoted">pivoted</option>
                    <option value="killed">killed</option>
                  </select>
                  <input
                    name="industry"
                    defaultValue={c.industry ?? ""}
                    placeholder="industry"
                    className={`${input} w-28`}
                  />
                  <input
                    name="founded_year"
                    defaultValue={c.founded_year ?? ""}
                    placeholder="founded"
                    inputMode="numeric"
                    className={`${input} w-16`}
                  />
                  <button type="submit" className={btn}>
                    Save
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
