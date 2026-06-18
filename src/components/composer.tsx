import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function Composer() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in first");
      const trimmed = content.trim();
      if (!trimmed) throw new Error("Write something first");
      const { error } = await supabase.from("posts").insert({ user_id: user.id, content: trimmed });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["profile-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <div className="border-b border-border/60 p-4">
      <Textarea
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        rows={3}
        className="resize-none border-0 bg-transparent p-0 text-[15px] shadow-none focus-visible:ring-0"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          {content.length}/500
        </span>
        <Button
          size="sm"
          onClick={() => create.mutate()}
          disabled={create.isPending || !content.trim()}
        >
          Post
        </Button>
      </div>
    </div>
  );
}
