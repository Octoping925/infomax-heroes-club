import { DoorayResponseType } from ".";

export type DoorayBotMessage = {
  botName?: string;
  botIconImage?: string;
  text?: string;
  attachments?: DoorayBotAttachment[];
  responseType?: DoorayResponseType;
  deleteOriginal?: string;
  channelId?: string;
};

export interface DoorayBotAttachment {
  image_url?: string;
  title?: string;
  text?: string;
  color?: string;
}
