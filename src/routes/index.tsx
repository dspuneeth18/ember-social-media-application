import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Composer } from "@/components/composer";
import { PostCard } from "@/components/post-card";
import { hydratePosts } from "@/lib/feed";
import { Button } from "@/components/ui/button";
import { Flame, Sparkles, MessageCircle, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ember — a quieter social space" },
      { name: "description", content: "Share short thoughts, follow people you care about, talk in the margins." },
      { property: "og:title", content: "Ember" },
      { property: "og:description", content: "A quieter social space for short thoughts." },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed", user?.id ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, content, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return hydratePosts(data, user?.id ?? null);
    },
  });

  return (
    <AppShell>
      <div className="sticky top-0 z-30 flex h-14 items-center border-b border-border/60 bg-background/80 px-4 backdrop-blur">
        <h1 className="font-serif text-xl">Home</h1>
      </div>
      {!loading && !user && <Hero />}
      <Composer />
      {!isLoading && (!posts || posts.length === 0) && !user && <PlaceholderFeed />}
      <div className="pb-24">
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : posts && posts.length > 0 ? (
          posts.map((p) => <PostCard key={p.id} post={p} />)
        ) : user ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            No posts yet. Be the first.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

function Hero() {
  return (
    <section className="border-b border-border/60 px-6 py-12 text-center">
      <Flame className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-4 font-serif text-4xl text-foreground">A quieter social space.</h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-muted-foreground">
        Short thoughts. Real conversations. No algorithms shouting in the margins.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/auth">Join Ember</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
      <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3 text-left">
        {[
          { icon: Sparkles, title: "Slow feed", body: "Chronological. No surprises." },
          { icon: MessageCircle, title: "Thoughtful replies", body: "Conversations over clout." },
          { icon: Users, title: "Real follows", body: "Hear from people you chose." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border/60 bg-card/40 p-3">
            <f.icon className="h-4 w-4 text-primary" />
            <p className="mt-2 text-xs font-medium">{f.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlaceholderFeed() {
  const samples = [
    {
      name: "Iris Wren",
      handle: "iris",
      time: "2h",
      content:
        "morning ritual: fresh notebook, terrible handwriting, one cup of coffee that goes cold before I finish a sentence.",
      likes: 42,
      comments: 6,
    },
    {
      name: "Otis Vale",
      handle: "otis",
      time: "5h",
      content:
        "the internet was better when people had personal websites with weird fonts and a guestbook nobody signed.",
      likes: 128,
      comments: 19,
    },
    {
      name: "Marisol Park",
      handle: "marisol",
      time: "1d",
      content:
        "shipped the redesign today. minimal palette, generous whitespace, and one warm accent color doing all the heavy lifting.",
      likes: 87,
      comments: 11,
    },
  ];

  return (
    <>
      <div className="border-b border-border/60 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        Preview — sign in to see the real feed
      </div>
      {samples.map((s) => (
        <article key={s.handle} className="border-b border-border/60 px-4 py-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-sm">
              {s.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">@{s.handle}</span>
                <span className="text-muted-foreground">· {s.time}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{s.content}</p>
              <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
                <span>♥ {s.likes}</span>
                <span>💬 {s.comments}</span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
