import { DoorayBotMessage } from "./types";

export function sendDoorayBotMessage(url: string, body: DoorayBotMessage) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
