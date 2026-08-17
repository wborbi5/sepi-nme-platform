import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { inviteMembers, updateMember } from "../actions";

/*
 * Members: invite (single or bulk — newline-separated), assign role,
 * set big/little, set pledge class and position, deactivate.
 */

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  pledge_class: string | null;
  position: string | null;
  big_id: string | null;
  is_active: boolean;
};

export default async function AdminMembers() {
  let members: Row[] = [];
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, pledge_class, position, big_id, is_active")
      .order("full_name");
    members = (data as Row[]) ?? [];
  }

  const th = "border border-[#ddd] bg-[#f5f5f5] px-2 py-1 text-left font-semibold";
  const td = "border border-[#ddd] px-2 py-1 align-middle";
  const input = "border border-[#bbb] px-1.5 py-0.5 text-[13px] min-h-0";
  const btn =
    "border border-[#888] bg-[#eee] px-2 py-0.5 text-[12px] hover:bg-[#ddd] min-h-0 cursor-pointer";

  return (
    <div className="text-[13px]">
      <h1 className="mb-4 text-lg font-bold">Members</h1>

      {/* ---------------------------------------------------------- invite */}
      <form
        action={inviteMembers}
        className="mb-6 flex max-w-2xl flex-col gap-2 border border-[#ddd] p-3"
      >
        <b>Invite members</b>
        <textarea
          name="emails"
          required
          rows={3}
          placeholder={"one@miamioh.edu\ntwo@miamioh.edu"}
          className={`${input} w-full`}
        />
        <div className="flex items-center gap-2">
          <label>
            Role{" "}
            <select name="role" className={input} defaultValue="new_member">
              <option value="new_member">new_member</option>
              <option value="current_member">current_member</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label>
            Pledge class{" "}
            <input
              name="pledge_class"
              placeholder="Fall 2026"
              className={input}
            />
          </label>
          <button type="submit" className={btn}>
            Send invites
          </button>
        </div>
        <span className="text-[12px] text-[#666]">
          Magic-link invites, 7-day expiry, @miamioh.edu only. Bulk: one email
          per line.
        </span>
      </form>

      {/* ----------------------------------------------------------- table */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Name</th>
            <th className={th}>Email</th>
            <th className={th}>Role</th>
            <th className={th}>Pledge class</th>
            <th className={th}>Position</th>
            <th className={th}>Big</th>
            <th className={th}>Active</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {members.length === 0 && (
            <tr>
              <td className={td} colSpan={8}>
                No members yet.
              </td>
            </tr>
          )}
          {members.map((m) => (
            <tr key={m.id} className={m.is_active ? "" : "opacity-50"}>
              <td className={td}>{m.full_name ?? "—"}</td>
              <td className={td}>{m.email}</td>
              <td className={td} colSpan={5}>
                {/* one form per row; every field submits together */}
                <form action={updateMember} className="flex flex-wrap items-center gap-1.5">
                  <input type="hidden" name="id" value={m.id} />
                  <select name="role" defaultValue={m.role} className={input}>
                    <option value="new_member">new_member</option>
                    <option value="current_member">current_member</option>
                    <option value="admin">admin</option>
                  </select>
                  <input
                    name="pledge_class"
                    defaultValue={m.pledge_class ?? ""}
                    placeholder="pledge class"
                    className={`${input} w-24`}
                  />
                  <input
                    name="position"
                    defaultValue={m.position ?? ""}
                    placeholder="position"
                    className={`${input} w-28`}
                  />
                  <select name="big_id" defaultValue={m.big_id ?? ""} className={input}>
                    <option value="">no big</option>
                    {members
                      .filter((b) => b.id !== m.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.full_name ?? b.email}
                        </option>
                      ))}
                  </select>
                  <select
                    name="is_active"
                    defaultValue={String(m.is_active)}
                    className={input}
                  >
                    <option value="true">active</option>
                    <option value="false">deactivated</option>
                  </select>
                  <button type="submit" className={btn}>
                    Save
                  </button>
                </form>
              </td>
              <td className={td}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
