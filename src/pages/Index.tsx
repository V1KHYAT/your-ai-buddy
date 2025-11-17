import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import RoomSelector from "@/components/RoomSelector";
import { MessageSquare, LogOut } from "lucide-react";
import { streamChat } from "@/utils/streamChat";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  content: string;
  user_id: string | null;
  is_ai: boolean;
  created_at: string;
  profiles?: {
    display_name: string | null;
  };
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (currentRoomId) {
      loadMessages();
      setupRealtimeSubscription();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentRoomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const loadMessages = async () => {
    if (!currentRoomId) return;

    const { data } = await supabase
      .from("chat_messages")
      .select(`
        *,
        profiles:user_id (display_name)
      `)
      .eq("room_id", currentRoomId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const setupRealtimeSubscription = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`room:${currentRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${currentRoomId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", newMessage.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMessage, profiles: profile },
          ]);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleSendMessage = async (text: string) => {
    if (!currentRoomId || !user) return;

    const { error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        room_id: currentRoomId,
        user_id: user.id,
        content: text,
        is_ai: false,
      });

    if (insertError) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return;
    }

    setIsTyping(true);

    let assistantText = "";
    const conversationHistory = messages.map((m) => ({
      role: m.is_ai ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    try {
      await streamChat({
        messages: [
          ...conversationHistory,
          { role: "user" as const, content: text },
        ],
        onDelta: (chunk) => {
          assistantText += chunk;
        },
        onDone: async () => {
          setIsTyping(false);
          
          await supabase.from("chat_messages").insert({
            room_id: currentRoomId,
            user_id: null,
            content: assistantText,
            is_ai: true,
          });
        },
        onError: (error) => {
          console.error("Chat error:", error);
          setIsTyping(false);
          toast({
            title: "Error",
            description: error.message || "Failed to get response. Please try again.",
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">AI Chat Assistant</h1>
                <p className="text-xs text-muted-foreground">Multi-user • Real-time</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RoomSelector 
                currentRoomId={currentRoomId}
                onRoomChange={setCurrentRoomId}
              />
              <Button size="sm" variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message.content}
                isUser={!message.is_ai && message.user_id === user?.id}
                timestamp={new Date(message.created_at)}
                userName={message.is_ai ? "AI Assistant" : message.profiles?.display_name || "User"}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <ChatInput onSendMessage={handleSendMessage} disabled={isTyping || !currentRoomId} />
        </div>
      </footer>
    </div>
  );
};

export default Index;
