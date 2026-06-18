import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Flame, Home, User, Search, Bell, Mail, Bookmark, Settings, LogOut, LogIn, PenSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RightSuggestions } from "@/components/right-suggestions";

type NavItem = { label: string; icon: typeof Home; to: string; params?: Record<string, string> };

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const items: NavItem[] = [
    { label: "Home", icon: Home, to: "/" },
    ...(profile
      ? [{ label: "Profile", icon: User, to: "/u/$username", params: { username: profile.username } } as NavItem]
      : []),
  ];

  const disabledItems = [
    { label: "Explore", icon: Search },
    { label: "Notifications", icon: Bell },
    { label: "Messages", icon: Mail },
    { label: "Bookmarks", icon: Bookmark },
    { label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl">
        {/* Left sidebar */}
        <aside className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col justify-between border-r border-border/60 px-2 py-4 sm:flex xl:w-64 xl:px-4">
          <div className="flex flex-col gap-1">
            <Link
              to="/"
              className="mb-2 flex h-12 items-center gap-2 rounded-full px-3 font-serif text-2xl text-primary"
            >
              <Flame className="h-6 w-6" />
              <span className="hidden xl:inline">Ember</span>
            </Link>
            {items.map((it) => {
              const Icon = it.icon;
              const active =
                it.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(it.to.replace("/$username", `/${it.params?.username ?? ""}`));
              return (
                <Link
                  key={it.label}
                  to={it.to}
                  params={it.params as never}
                  className={`flex items-center gap-4 rounded-full px-3 py-3 text-lg transition-colors hover:bg-accent ${
                    active ? "font-semibold text-foreground" : "text-foreground/80"
                  }`}
                >
                  <Icon className="h-6 w-6 shrink-0" strokeWidth={active ? 2.5 : 2} />
                  <span className="hidden xl:inline">{it.label}</span>
                </Link>
              );
            })}
            {disabledItems.map((it) => {
              const Icon = it.icon;
              return (
                <button
                  key={it.label}
                  type="button"
                  disabled
                  title="Coming soon"
                  className="flex items-center gap-4 rounded-full px-3 py-3 text-lg text-muted-foreground/60 hover:bg-accent/40"
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  <span className="hidden xl:inline">{it.label}</span>
                </button>
              );
            })}
            {user && (
              <Button
                size="lg"
                className="mt-3 hidden h-12 rounded-full text-base xl:flex"
                onClick={() => {
                  if (pathname !== "/") navigate({ to: "/" });
                  setTimeout(() => {
                    document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
                  }, 100);
                }}
              >
                <PenSquare className="mr-2 h-5 w-5" /> Post
              </Button>
            )}
          </div>

          <div className="pb-2">
            {loading ? null : user && profile ? (
              <div className="flex items-center gap-3 rounded-full p-2 hover:bg-accent">
                <Link
                  to="/u/$username"
                  params={{ username: profile.username }}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-secondary text-xs">
                      {profile.display_name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden min-w-0 xl:block">
                    <p className="truncate text-sm font-medium">{profile.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
                  </div>
                </Link>
                <button
                  onClick={signOut}
                  aria-label="Sign out"
                  className="hidden text-muted-foreground hover:text-foreground xl:block"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button asChild size="sm" className="w-full">
                <Link to="/auth">
                  <LogIn className="mr-2 h-4 w-4" /> <span className="hidden xl:inline">Sign in</span>
                </Link>
              </Button>
            )}
          </div>
        </aside>

        {/* Center */}
        <main className="min-h-screen w-full max-w-2xl flex-1 border-x border-border/60">
          {children}
        </main>

        {/* Right sidebar */}
        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto px-4 py-4 lg:block">
          <RightSuggestions />
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border/60 bg-background/95 py-2 backdrop-blur sm:hidden">
        <Link to="/" className="rounded-full p-2 hover:bg-accent">
          <Home className="h-6 w-6" />
        </Link>
        {profile && (
          <Link to="/u/$username" params={{ username: profile.username }} className="rounded-full p-2 hover:bg-accent">
            <User className="h-6 w-6" />
          </Link>
        )}
        {!user && (
          <Link to="/auth" className="rounded-full p-2 hover:bg-accent">
            <LogIn className="h-6 w-6" />
          </Link>
        )}
      </nav>
    </div>
  );
}
