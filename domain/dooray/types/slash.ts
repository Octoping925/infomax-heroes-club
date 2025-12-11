import { DoorayResponseType } from ".";
import { DoorayAttachment } from "./attachment";

export interface DooraySlashCommandRequest {
  tenantId: string;
  tenantDomain: string;
  channelId: string;
  channelName: string;
  userId: string;
  command: string;
  text: string;
  responseUrl: string;
  appToken: string;
  cmdToken: string;
  triggerId: string;
}

export interface DooraySlashCommandResponse {
  botName?: string;
  botIconImage?: string;
  text?: string;
  attachments?: DoorayAttachment[];
  responseType?: DoorayResponseType;
  deleteOriginal?: "true" | "false";
  replaceOriginal?: "true" | "false";
  channelId?: string;
}
