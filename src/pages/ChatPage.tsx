import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["chat_messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, profiles!chat_messages_user_id_fkey(full_name)")
        .order("created_at", { ascending: true })
        .limit(100);
      return data || [];
    },
    refetchInterval: 3000,
  });

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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title="Chat" description="Intern kommunikation" />

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-card p-5 mb-4 space-y-3">
        {(messages || []).map((m, i) => {
          const isSelf = m.user_id === user?.id;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
              className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                isSelf
                  ? "gradient-primary text-white rounded-br-lg shadow-[0_2px_8px_hsl(215_80%_56%/0.3)]"
                  : "bg-muted text-card-foreground rounded-bl-lg"
              }`}>
                {!isSelf && <p className="text-[11px] font-semibold mb-1 opacity-60">{(m.profiles as any)?.full_name || "Ukendt"}</p>}
                <p className="text-sm leading-relaxed">{m.message}</p>
                <p className={`text-[10px] mt-1.5 ${isSelf ? "text-white/50" : "text-muted-foreground/60"}`}>
                  {new Date(m.created_at).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          );
        })}
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
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Skriv en besked..."
          className="flex-1 rounded-xl h-12"
        />
        <Button type="submit" size="icon" className="h-12 w-12 rounded-xl shadow-[0_2px_8px_hsl(215_80%_56%/0.25)]" disabled={sendMessage.isPending || !message.trim()}>
          <Send size={17} />
        </Button>
      </form>
    </div>
  );
}
