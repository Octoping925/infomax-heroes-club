export type DoorayAttachment =
  | {
      image_url?: string;
      title?: string;
      text?: string;
      color?: string;
      authorName?: string;
      authorLink?: string;
    }
  | {
      fields: DoorayAttachmentField[];
    }
  | {
      callbackId?: string;
      actions: DoorayAttachmentAction[];
    };

export interface DoorayAttachmentField {
  title: string;
  value: string;
  short?: boolean;
}

export interface DoorayAttachmentAction {
  type: "button" | "select";
  name: string; // 커맨드 서버에 전달되는 필드명
  text: string; // 버튼, 드롭다운 메뉴에 표시될 텍스트
  value: string; // 커맨드 서버에 전달되는 필드값
  style?: "primary" | "default";
}
