import { AdminHead } from "@/components/admin/table";
import { requireAdmin } from "@/lib/auth";

import { PostEditor } from "../post-editor";

export const metadata = { title: "New post · Admin" };

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <div>
      <AdminHead title="New post" note="Goes straight to the home feed." />
      <PostEditor post={null} />
    </div>
  );
}
