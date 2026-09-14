import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResetPasswordBody {
  user_id: string;
  new_password: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is super_admin
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "super_admin" || !callerProfile.is_active) {
      return new Response(JSON.stringify({ error: "Only the system owner can reset passwords." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ResetPasswordBody = await req.json();
    const { user_id, new_password } = body;

    if (!user_id || !new_password) {
      return new Response(JSON.stringify({ error: "User ID and new password are required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters long." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the target user's profile for audit logging
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("id, username, email, shop_id")
      .eq("id", user_id)
      .maybeSingle();

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: "Target user not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the user's password via admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to reset password: " + updateError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the audit entry
    await adminClient.rpc("log_audit", {
      p_user_id: user.id,
      p_action: "owner_password_reset",
      p_table_name: "profiles",
      p_record_id: user_id,
      p_new_values: { username: targetProfile.username, email: targetProfile.email } as any,
      p_shop_id: targetProfile.shop_id,
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Password reset successfully.",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Server error: " + msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
