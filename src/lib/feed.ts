import { supabase } from "@/integrations/supabase/client";
import type { FeedPost } from "@/components/post-card";

type RawPost = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export async function hydratePosts(rows: RawPost[], viewerId: string | null): Promise<FeedPost[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((p) => p.id);
  const userIds = Array.from(new Set(rows.map((p) => p.user_id)));

  const [authorsRes, likesRes, commentsRes, myLikesRes] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds),
    supabase.from("likes").select("post_id").in("post_id", ids),
    supabase.from("comments").select("post_id").in("post_id", ids),
    viewerId
      ? supabase.from("likes").select("post_id").in("post_id", ids).eq("user_id", viewerId)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const authors = new Map((authorsRes.data ?? []).map((a) => [a.id, a]));
  const likeCounts = new Map<string, number>();
  (likesRes.data ?? []).forEach((l) => likeCounts.set(l.post_id, (likeCounts.get(l.post_id) ?? 0) + 1));
  const commentCounts = new Map<string, number>();
  (commentsRes.data ?? []).forEach((c) => commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1));
  const mine = new Set((myLikesRes.data ?? []).map((l) => l.post_id));

  return rows.map((p) => ({
    ...p,
    author: authors.get(p.user_id) ?? null,
    like_count: likeCounts.get(p.id) ?? 0,
    comment_count: commentCounts.get(p.id) ?? 0,
    liked_by_me: mine.has(p.id),
  }));
}
