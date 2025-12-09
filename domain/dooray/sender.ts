import { DoorayBotMessage } from "./types";

export class DoorayBotMessageSender {
  private _header: Record<string, string> = {};
  private _body: DoorayBotMessage = {};

  constructor(private readonly url: string) {}

  static url(url: string) {
    return new DoorayBotMessageSender(url);
  }

  token(token: string) {
    this._header.token = token;
    return this;
  }

  body(body: DoorayBotMessage) {
    this._body = body;
    return this;
  }

  async send() {
    return fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this._header,
      },
      body: JSON.stringify(this._body),
    });
  }
}
