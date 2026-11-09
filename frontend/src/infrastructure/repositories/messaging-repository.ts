import type {
  Conversation,
  CreateConversationInput,
  Message,
  SendMessageInput,
  UnreadMessageCount,
} from "@/domain/entities/messaging";
import { apiClient } from "@/infrastructure/http/api-client";

export const messagingRepository = {
  listConversations(token: string) {
    return apiClient<Conversation[]>("/api/parent/conversations", { token });
  },

  createConversation(token: string, input: CreateConversationInput) {
    return apiClient<Conversation>("/api/parent/conversations", {
      token,
      method: "POST",
      json: input,
    });
  },

  listMessages(token: string, conversationId: number) {
    return apiClient<Message[]>(`/api/parent/conversations/${conversationId}/messages`, { token });
  },

  getUnreadCount(token: string) {
    return apiClient<UnreadMessageCount>("/api/parent/conversations/unread-count", { token });
  },

  sendMessage(token: string, conversationId: number, input: SendMessageInput) {
    return apiClient<Message>(`/api/parent/conversations/${conversationId}/messages`, {
      token,
      method: "POST",
      json: input,
    });
  },

  markAsRead(token: string, conversationId: number) {
    return apiClient<void>(`/api/parent/conversations/${conversationId}/read`, {
      token,
      method: "POST",
    });
  },
};
