export type Conversation = {
  id: number;
  studentId: number;
  teacherId: number;
  teacherName?: string | null;
  subject?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
};

export type TeacherConversation = {
  id: number;
  studentId: number;
  teacherId: number;
  parentName: string;
  studentName: string;
  subject: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
};

export type Message = {
  id: number | string;
  conversationId: number;
  senderId: number;
  body: string;
  isRead: boolean;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
};

export type SendMessageInput = {
  body: string;
};

export type CreateConversationInput = {
  studentId: number;
  teacherId: number;
  subject: string;
};

export type UnreadMessageCount = {
  unreadCount: number;
};
