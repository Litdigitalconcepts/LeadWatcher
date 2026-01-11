// src/storage/supabase_client.mjs
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(`Supabase Config Error: URL length=${SUPABASE_URL.length}, Key length=${SUPABASE_KEY.length}`);
    throw new Error("Missing Supabase URL or Key");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
