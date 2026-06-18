import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { hydratePosts } from "@/lib/feed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Ember` },
      { name: "description", content: `Posts by @${params.username} on Ember.` },
      { property: "og:title", content: `@${params.username}` },
      { property: "og:description", content: `Posts by @${params.username} on Ember.` },
    ],
  }),
  component: ProfilePage,
  errorComponent: ({ error }) => <p className="p-10 text-center text-sm">{error.message}</p>,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">User not found.</p></div>
  ),
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user: viewer } = useAuth();
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, created_at")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const profile = profileQuery.data;
  const isMe = viewer?.id === profile?.id;

  const stats = useQuery({
    queryKey: ["profile-stats", profile?.id, viewer?.id],
    enabled: !!profile,
    queryFn: async () => {
      const [followers, following, mine] = await Promise.all([
        supabase.from("follows").select("follower_id").eq("following_id", profile!.id),
        supabase.from("follows").select("following_id").eq("follower_id", profile!.id),
        viewer
          ? supabase.from("follows").select("follower_id").eq("follower_id", viewer.id).eq("following_id", profile!.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        followers: followers.data?.length ?? 0,
        following: following.data?.length ?? 0,
        i_follow: !!mine.data,
      };
    },
  });

  const postsQuery = useQuery({
    queryKey: ["profile-posts", profile?.id, viewer?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, content, created_at")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return hydratePosts(data, viewer?.id ?? null);
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!viewer) throw new Error("Sign in to follow");
      if (!profile) return;
      if (stats.data?.i_follow) {
        await supabase.from("follows").delete().eq("follower_id", viewer.id).eq("following_id", profile.id);
      } else {
        await supabase.from("follows").insert({ follower_id: viewer.id, following_id: profile.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile-stats"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (profileQuery.isLoading) {
    return (
      <AppShell>
        <p className="py-20 text-center text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }
  if (!profile) return null;

  return (
    <AppShell>
      <div className="sticky top-0 z-30 flex h-14 items-center border-b border-border/60 bg-background/80 px-4 backdrop-blur">
        <div>
          <h1 className="font-serif text-xl leading-tight">{profile.display_name}</h1>
          <p className="text-xs text-muted-foreground">@{profile.username}</p>
        </div>
      </div>
      <div className="h-32 bg-gradient-to-br from-primary/30 via-accent/40 to-secondary" />
      <div className="px-4 pb-5">
        <div className="-mt-12 flex items-end justify-between">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-secondary text-2xl font-serif">
              {profile.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="mb-2">
            {isMe ? (
              <EditProfileDialog profile={profile} />
            ) : viewer ? (
              <Button
                size="sm"
                variant={stats.data?.i_follow ? "outline" : "default"}
                onClick={() => toggleFollow.mutate()}
                disabled={toggleFollow.isPending}
              >
                {stats.data?.i_follow ? "Following" : "Follow"}
              </Button>
            ) : (
              <Button asChild size="sm"><Link to="/auth">Sign in to follow</Link></Button>
            )}
          </div>
        </div>
        <h2 className="mt-3 font-serif text-2xl">{profile.display_name}</h2>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        {profile.bio && <p className="mt-3 text-[15px] leading-relaxed">{profile.bio}</p>}
        <div className="mt-4 flex gap-5 text-sm">
          <span><span className="font-medium">{stats.data?.following ?? 0}</span> <span className="text-muted-foreground">following</span></span>
          <span><span className="font-medium">{stats.data?.followers ?? 0}</span> <span className="text-muted-foreground">followers</span></span>
        </div>
      </div>
      <h2 className="border-t border-border/60 px-4 py-3 font-serif text-sm uppercase tracking-widest text-muted-foreground">
        Posts
      </h2>
      <div className="pb-24">
        {postsQuery.data && postsQuery.data.length > 0 ? (
          postsQuery.data.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">No posts yet.</p>
        )}
      </div>
    </AppShell>
  );
}

function EditProfileDialog({ profile }: { profile: { id: string; display_name: string; bio: string | null; avatar_url: string | null } }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        display_name: displayName.trim() || profile.display_name,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      }).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Edit profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatar">Avatar URL</Label>
            <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
