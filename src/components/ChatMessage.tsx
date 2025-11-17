import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  userName?: string;
}

const ChatMessage = ({ message, isUser, timestamp, userName }: ChatMessageProps) => {
  return (
    <div
      className={`flex w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div className="flex items-start gap-3 max-w-[80%]">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-gradient-to-br from-accent to-secondary text-secondary-foreground"
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>
        
        <div className="flex-1 space-y-1">
          {userName && (
            <p className="text-xs font-medium text-muted-foreground">
              {userName}
            </p>
          )}
          <div
            className={`rounded-2xl px-4 py-3 inline-block max-w-full ${
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-card-foreground"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
