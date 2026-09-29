import { NextRequest } from "next/server";
import { handleHeroMetaCron } from "../handler";

export const maxDuration = 300;

export function GET(request: NextRequest) {
  return handleHeroMetaCron(request, "platinum_plus", false);
}
