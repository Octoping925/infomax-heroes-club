import { DoorayResponseType } from ".";
import { DoorayAttachment } from "./attachment";

export interface DoorayBotMessage {
  botName?: string;
  botIconImage?: string;
  text?: string;
  attachments?: DoorayAttachment[];
  responseType?: DoorayResponseType;
  deleteOriginal?: string;
  channelId?: string;
}
