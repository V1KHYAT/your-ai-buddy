const TypingIndicator = () => {
  return (
    <div className="flex w-full justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="bg-chat-bot-bg border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
