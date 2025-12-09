export type DooraySlashCommandRequest = {
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
};
