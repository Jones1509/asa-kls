import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Ikke autoriseret");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify requester is admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: requestingUser } } = await supabaseUser.auth.getUser();
    if (!requestingUser) throw new Error("Ikke logget ind");

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) throw new Error("Kun administratorer kan udføre denne handling");

    const body = await req.json();
    const { action } = body;

    // --- CREATE ---
    if (action === "create") {
      const { email, password, full_name, phone, role_label, make_admin } = body;

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) throw createError;

      const userId = newUser.user!.id;

      // Upsert profile (trigger may already have created it)
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        user_id: userId,
        email,
        full_name: full_name || "",
        phone: phone || null,
        role_label: role_label || null,
      }, { onConflict: "user_id" });

      if (profileError) throw profileError;

      // Set role
      const chosenRole = make_admin ? "admin" : "employee";
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: chosenRole,
      });
      if (roleError) throw roleError;

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CHANGE PASSWORD ---
    if (action === "change_password") {
      const { user_id, new_password } = body;
      if (!user_id || !new_password) throw new Error("Mangler user_id eller new_password");

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: new_password,
      });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- DELETE ---
    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) throw new Error("Mangler user_id");

      // Delete related data first
      await Promise.all([
        supabaseAdmin.from("time_entries").delete().eq("user_id", user_id),
        supabaseAdmin.from("schedules").delete().eq("user_id", user_id),
        supabaseAdmin.from("user_roles").delete().eq("user_id", user_id),
        supabaseAdmin.from("case_assignments").delete().eq("user_id", user_id),
      ]);
      await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);

      // Delete auth user
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Ukendt handling");
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
