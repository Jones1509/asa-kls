import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = (name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const cls = `h-${size} w-${size} rounded-full flex-shrink-0 object-cover`;
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${cls} shadow-sm`} style={{ height: `${size * 4}px`, width: `${size * 4}px` }} />;
  }
  return (
    <div
      className="rounded-full gradient-primary flex items-center justify-center flex-shrink-0 text-white font-bold shadow-sm"
      style={{ height: `${size * 4}px`, width: `${size * 4}px`, fontSize: `${size * 1.4}px` }}
    >
      {initials}
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: myProfile } = useQuery({
    queryKey: ["my_profile_chat", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: messages } = useQuery({
    queryKey: ["chat_messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, profiles!chat_messages_user_id_fkey(full_name, avatar_url)")
        .order("created_at", { ascending: true })
        .limit(200);
      return data || [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("chat_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: user!.id,
        message: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
      inputRef.current?.focus();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage.mutate();
  };

  // Group messages by date
  const groupedMessages = (messages || []).reduce((groups: any[], msg) => {
    const date = new Date(msg.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({ date, messages: [msg] });
    }
    return groups;
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title="Chat" description="Intern kommunikation" />

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-card p-5 mb-4 space-y-4">
        {groupedMessages.map((group: any) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider">{group.date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-1.5">
              {group.messages.map((m: any, i: number) => {
                const isSelf = m.user_id === user?.id;
                const profile = m.profiles as any;
                const prevMsg = i > 0 ? group.messages[i - 1] : null;
                const nextMsg = i < group.messages.length - 1 ? group.messages[i + 1] : null;
                const isFirstInRun = !prevMsg || prevMsg.user_id !== m.user_id;
                const isLastInRun = !nextMsg || nextMsg.user_id !== m.user_id;
                const displayName = isSelf ? (myProfile?.full_name || "Du") : (profile?.full_name || "Ukendt");
                const displayAvatar = isSelf ? myProfile?.avatar_url : profile?.avatar_url;

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 items-end ${isSelf ? "justify-end" : "justify-start"}`}
                  >
                    {/* Other user avatar */}
                    {!isSelf && (
                      isLastInRun ? (
                        <Avatar name={displayName} avatarUrl={displayAvatar} size={8} />
                      ) : (
                        <div style={{ width: 32 }} />
                      )
                    )}

                    <div className={`max-w-[70%] flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                      {isFirstInRun && (
                        <p className="text-[11px] font-semibold text-muted-foreground/60 mb-1 px-1">
                          {isSelf ? "Du" : displayName}
                        </p>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 ${
                        isSelf
                          ? "gradient-primary text-white rounded-br-sm shadow-[0_2px_8px_hsl(215_80%_56%/0.3)]"
                          : "bg-muted text-card-foreground rounded-bl-sm"
                      } ${!isFirstInRun && isSelf ? "rounded-tr-2xl" : ""} ${!isFirstInRun && !isSelf ? "rounded-tl-2xl" : ""}`}>
                        {m.image_url && (
                          <img src={m.image_url} alt="" className="rounded-xl mb-2 max-w-[200px]" />
                        )}
                        <p className="text-sm leading-relaxed">{m.message}</p>
                        {isLastInRun && (
                          <p className={`text-[10px] mt-1 ${isSelf ? "text-white/40" : "text-muted-foreground/40"}`}>
                            {new Date(m.created_at).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Self avatar */}
                    {isSelf && (
                      isLastInRun ? (
                        <Avatar name={displayName} avatarUrl={displayAvatar} size={8} />
                      ) : (
                        <div style={{ width: 32 }} />
                      )
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
        {(!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquare size={24} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Ingen beskeder endnu – start samtalen!</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Skriv en besked..."
          className="flex-1 rounded-xl h-12"
          autoComplete="off"
        />
        <Button type="submit" size="icon" className="h-12 w-12 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]" disabled={sendMessage.isPending || !message.trim()}>
          <Send size={17} />
        </Button>
      </form>
    </div>
  );
}
