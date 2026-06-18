import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TRENDS = [
  { topic: "Design", posts: "12.4K posts" },
  { topic: "#IndieWeb", posts: "8,210 posts" },
  { topic: "Slow Social", posts: "3,902 posts" },
  { topic: "Writing", posts: "21.1K posts" },
  { topic: "#MorningCoffee", posts: "1,203 posts" },
];

export function RightSuggestions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: suggestions } = useQuery({
    queryKey: ["suggestions", user?.id ?? null],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .limit(20);
      let pool = profiles ?? [];
      if (user) {
        const { data: following } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        const followingIds = new Set((following ?? []).map((f) => f.following_id));
        pool = pool.filter((p) => p.id !== user.id && !followingIds.has(p.id));
      }
      // shuffle
      return pool.sort(() => Math.random() - 0.5).slice(0, 5);
    },
  });

  const follow = useMutation({
    mutationFn: async (followingId: string) => {
      if (!user) throw new Error("Sign in to follow");
      await supabase.from("follows").insert({ follower_id: user.id, following_id: followingId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      qc.invalidateQueries({ queryKey: ["profile-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search Ember"
          className="w-full rounded-full border border-transparent bg-secondary/60 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
        />
      </div>

      {/* Trends */}
      <section className="rounded-2xl bg-secondary/40 p-4">
        <h2 className="mb-2 flex items-center gap-2 font-serif text-lg">
          <TrendingUp className="h-4 w-4 text-primary" /> What's warm
        </h2>
        <ul className="space-y-3">
          {TRENDS.map((t) => (
            <li key={t.topic} className="cursor-pointer rounded-md -mx-2 px-2 py-1 hover:bg-background/60">
              <p className="text-sm font-medium">{t.topic}</p>
              <p className="text-xs text-muted-foreground">{t.posts}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Who to follow */}
      <section className="rounded-2xl bg-secondary/40 p-4">
        <h2 className="mb-3 font-serif text-lg">Who to follow</h2>
        {!suggestions || suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suggestions yet.</p>
        ) : (
          <ul className="space-y-3">
            {suggestions.map((p) => (
              <li key={p.id} className="flex items-start gap-3">
                <Link to="/u/$username" params={{ username: p.username }} className="shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-background text-sm">
                      {p.display_name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/u/$username"
                    params={{ username: p.username }}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {p.display_name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                  {p.bio && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.bio}</p>}
                </div>
                {user ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-full"
                    disabled={follow.isPending}
                    onClick={() => follow.mutate(p.id)}
                  >
                    Follow
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="shrink-0 rounded-full">
                    <Link to="/auth">Follow</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="px-2 text-xs text-muted-foreground">
        <p>© Ember — a quieter social space.</p>
      </footer>
    </div>
  );
}
