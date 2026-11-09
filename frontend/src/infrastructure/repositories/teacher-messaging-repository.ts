import type { Message, SendMessageInput, TeacherConversation } from "@/domain/entities/messaging";
import { apiClient } from "@/infrastructure/http/api-client";

export const teacherMessagingRepository = {
  listConversations(token: string) {
    return apiClient<TeacherConversation[]>("/api/teacher/conversations", { token });
  },
  getUnreadCount(token: string) {
    return apiClient<{ unreadCount: number }>("/api/teacher/conversations/unread-count", { token });
  },
  listMessages(token: string, conversationId: number) {
    return apiClient<Message[]>(`/api/teacher/conversations/${conversationId}/messages`, { token });
  },
  sendMessage(token: string, conversationId: number, input: SendMessageInput) {
    return apiClient<Message>(`/api/teacher/conversations/${conversationId}/messages`, { token, method: "POST", json: input });
  },
  markAsRead(token: string, conversationId: number) {
    return apiClient<void>(`/api/teacher/conversations/${conversationId}/read`, { token, method: "POST" });
  },
};
