import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export type FeedPost = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: { username: string; display_name: string; avatar_url: string | null } | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

export function PostCard({ post, onDelete }: { post: FeedPost; onDelete?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to like posts");
      if (post.liked_by_me) {
        await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["post", post.id] });
      qc.invalidateQueries({ queryKey: ["profile-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      await supabase.from("posts").delete().eq("id", post.id);
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["profile-posts"] });
      onDelete?.();
    },
  });

  const isMine = user?.id === post.user_id;

  return (
    <article className="border-b border-border/60 px-4 py-5 transition-colors hover:bg-accent/30">
      <div className="flex gap-3">
        <Link to="/u/$username" params={{ username: post.author?.username ?? "" }}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-secondary text-sm">
              {post.author?.display_name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 text-sm">
            <Link
              to="/u/$username"
              params={{ username: post.author?.username ?? "" }}
              className="font-medium text-foreground hover:underline"
            >
              {post.author?.display_name}
            </Link>
            <span className="text-muted-foreground">@{post.author?.username}</span>
            <span className="text-muted-foreground">·</span>
            <Link
              to="/p/$id"
              params={{ id: post.id }}
              className="text-muted-foreground hover:underline"
            >
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </Link>
          </div>
          <Link to="/p/$id" params={{ id: post.id }} className="mt-1 block whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
            {post.content}
          </Link>
          <div className="mt-3 flex items-center gap-6 text-sm text-muted-foreground">
            <button
              onClick={() => toggleLike.mutate()}
              disabled={toggleLike.isPending}
              className="group flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Heart
                className={`h-4 w-4 transition-colors ${post.liked_by_me ? "fill-primary text-primary" : "group-hover:text-primary"}`}
              />
              <span className="tabular-nums">{post.like_count}</span>
            </button>
            <Link to="/p/$id" params={{ id: post.id }} className="flex items-center gap-1.5 hover:text-foreground">
              <MessageCircle className="h-4 w-4" />
              <span className="tabular-nums">{post.comment_count}</span>
            </Link>
            {isMine && (
              <button
                onClick={() => { if (confirm("Delete this post?")) remove.mutate(); }}
                className="ml-auto text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
