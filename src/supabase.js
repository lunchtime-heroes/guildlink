import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://zpalkpcqihxamedymnwe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYWxrcGNxaWh4YW1lZHltbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDc3MTQsImV4cCI6MjA4ODQyMzcxNH0.8V9MEXpcCH8dibm65PVtaPZseDbPvYCwSPJQ-9Cu-Zo"
);

export default supabase;
