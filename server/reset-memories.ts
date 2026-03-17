import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { count, error } = await supabase
    .from("memories")
    .update({ embedding_status: "pending" })
    .eq("embedding_status", "failed");

  if (error) console.error("Error:", error.message);
  else console.log(`Reset ${count} memories to pending.`);
}

main();
