import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Room {
  id: string;
  name: string;
  created_at: string;
}

interface RoomSelectorProps {
  currentRoomId: string | null;
  onRoomChange: (roomId: string) => void;
}

const RoomSelector = ({ currentRoomId, onRoomChange }: RoomSelectorProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    const { data } = await supabase
      .from("chat_rooms")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      setRooms(data);
      if (data.length > 0 && !currentRoomId) {
        onRoomChange(data[0].id);
      }
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("chat_rooms")
      .insert({ name: newRoomName, created_by: user.id })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive",
      });
    } else if (data) {
      setRooms([data, ...rooms]);
      onRoomChange(data.id);
      setNewRoomName("");
      setIsOpen(false);
      toast({
        title: "Success",
        description: "Room created successfully",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentRoomId || ""}
        onChange={(e) => onRoomChange(e.target.value)}
        className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
      >
        <option value="" disabled>Select a room</option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name}
          </option>
        ))}
      </select>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            New Room
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Chat Room</DialogTitle>
          </DialogHeader>
          <form onSubmit={createRoom} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                placeholder="General Chat"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">Create Room</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomSelector;
