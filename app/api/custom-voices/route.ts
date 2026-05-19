import { listCustomVoices } from "@/lib/local-custom-voices";
import { withRequestLogging } from "@/lib/logger";

export const runtime = "nodejs";

async function handleGet() {
  const voices = await listCustomVoices();
  return Response.json({ voices });
}

export const GET = withRequestLogging(handleGet, "GET /api/custom-voices");
