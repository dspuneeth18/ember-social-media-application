import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { hydratePosts } from "@/lib/feed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/p/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Post — Ember` },
      { name: "description", content: `An Ember post.` },
      { property: "og:title", content: `Post on Ember` },
      { property: "og:url", content: `/p/${params.id}` },
    ],
  }),
  component: PostPage,
  errorComponent: ({ error }) => <p className="p-10 text-center text-sm">{error.message}</p>,
  notFoundComponent: () => <p className="p-10 text-center text-sm">Post not found.</p>,
});

function PostPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const postQuery = useQuery({
    queryKey: ["post", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, content, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [hydrated] = await hydratePosts([data], user?.id ?? null);
      return hydrated;
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, user_id, content, created_at")
        .eq("post_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const userIds = Array.from(new Set(data.map((c) => c.user_id)));
      const { data: authors } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);
      const map = new Map((authors ?? []).map((a) => [a.id, a]));
      return data.map((c) => ({ ...c, author: map.get(c.user_id) }));
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to comment");
      const trimmed = comment.trim();
      if (!trimmed) throw new Error("Write something");
      const { error } = await supabase.from("comments").insert({
        post_id: id, user_id: user.id, content: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["comments", id] });
      qc.invalidateQueries({ queryKey: ["post", id] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      await supabase.from("comments").delete().eq("id", commentId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", id] }),
  });

  return (
    <AppShell>
      <div className="sticky top-0 z-30 flex h-14 items-center border-b border-border/60 bg-background/80 px-4 backdrop-blur">
        <h1 className="font-serif text-xl">Post</h1>
      </div>
      <div className="pb-24">
        {postQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : postQuery.data ? (
          <PostCard post={postQuery.data} />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">Post not found.</p>
        )}

        <div className="border-b border-border/60 px-4 py-4">
          {user ? (
            <>
              <Textarea
                placeholder="Add a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={2}
                className="resize-none border-0 bg-transparent p-0 text-[15px] shadow-none focus-visible:ring-0"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={() => addComment.mutate()} disabled={addComment.isPending || !comment.trim()}>
                  Reply
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to join the conversation.
            </p>
          )}
        </div>

        <div>
          {commentsQuery.data && commentsQuery.data.length > 0 ? (
            commentsQuery.data.map((c) => (
              <div key={c.id} className="border-b border-border/60 px-4 py-4">
                <div className="flex gap-3">
                  <Link to="/u/$username" params={{ username: c.author?.username ?? "" }}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={c.author?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-secondary text-xs">
                        {c.author?.display_name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 text-sm">
                      <Link to="/u/$username" params={{ username: c.author?.username ?? "" }} className="font-medium hover:underline">
                        {c.author?.display_name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                      {user?.id === c.user_id && (
                        <button
                          onClick={() => { if (confirm("Delete comment?")) deleteComment.mutate(c.id); }}
                          className="ml-auto text-muted-foreground hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[15px]">{c.content}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No comments yet.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
