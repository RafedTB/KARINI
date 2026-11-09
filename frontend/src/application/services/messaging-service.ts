import type { CreateConversationInput, SendMessageInput } from "@/domain/entities/messaging";
import { messagingRepository } from "@/infrastructure/repositories/messaging-repository";

export const messagingService = {
  listConversations(token: string) {
    return messagingRepository.listConversations(token);
  },

  createConversation(token: string, input: CreateConversationInput) {
    return messagingRepository.createConversation(token, input);
  },

  listMessages(token: string, conversationId: number) {
    return messagingRepository.listMessages(token, conversationId);
  },

  getUnreadCount(token: string) {
    return messagingRepository.getUnreadCount(token);
  },

  sendMessage(token: string, conversationId: number, input: SendMessageInput) {
    return messagingRepository.sendMessage(token, conversationId, input);
  },

  markAsRead(token: string, conversationId: number) {
    return messagingRepository.markAsRead(token, conversationId);
  },
};
