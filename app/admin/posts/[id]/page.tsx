import { notFound } from "next/navigation";

import { AdminHead } from "@/components/admin/table";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

import { PostEditor } from "../post-editor";

export const metadata = { title: "Edit post · Admin" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  const post = data as Post | null;
  if (!post) notFound();

  return (
    <div>
      <AdminHead title="Edit post" />
      <PostEditor post={post} />
    </div>
  );
}
