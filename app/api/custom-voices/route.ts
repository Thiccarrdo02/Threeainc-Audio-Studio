import { NextResponse } from "next/server";

import { listCustomVoices } from "@/lib/local-custom-voices";

export const runtime = "nodejs";

export async function GET() {
  const voices = await listCustomVoices();
  return NextResponse.json({ voices });
}
