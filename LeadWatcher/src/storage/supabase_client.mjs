// src/storage/supabase_client.mjs
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const clean = (val) => (val || "").trim().replace(/["']/g, "");

const SUPABASE_URL = clean(process.env.SUPABASE_URL);
const SUPABASE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

console.log(`Supabase Client: URL length=${SUPABASE_URL.length}, Key length=${SUPABASE_KEY.length}`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing Supabase URL or Key");
}

if (!SUPABASE_KEY.startsWith("ey")) {
    throw new Error("Supabase Key appears malformed (does not start with 'ey')");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
