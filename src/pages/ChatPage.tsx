import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const mockMessages = [
  { id: 1, sender: "Martin Sørensen", text: "Hej alle – brandtætningen på etage 3 er klar til kontrol.", time: "09:15", self: false },
  { id: 2, sender: "Anne Larsen", text: "Godt, jeg kigger forbi i eftermiddag.", time: "09:22", self: false },
  { id: 3, sender: "Dig", text: "Perfekt. Martin, husk at uploade billeder inden kl 15.", time: "09:30", self: true },
  { id: 4, sender: "Peter Hansen", text: "Jeg har fundet et problem med brandspjæld i kælder – sender rapport nu.", time: "10:05", self: false },
  { id: 5, sender: "Dig", text: "Ok, Peter. Prioriter det.", time: "10:08", self: true },
];

export default function ChatPage() {
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title="Chat" description="Intern kommunikation" />

      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card shadow-card p-4 mb-4 space-y-3">
        {mockMessages.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`flex ${m.self ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
              m.self
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-card-foreground rounded-bl-md"
            }`}>
              {!m.self && <p className="text-xs font-medium mb-0.5 opacity-70">{m.sender}</p>}
              <p className="text-sm">{m.text}</p>
              <p className={`text-[10px] mt-1 ${m.self ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{m.time}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Skriv en besked..."
          className="flex-1"
        />
        <Button size="icon">
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
