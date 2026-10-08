export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  image: string | null;
  createdAt: string;
  read: boolean;
};
