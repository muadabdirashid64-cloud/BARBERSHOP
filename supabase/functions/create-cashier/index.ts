import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateCashierBody {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  shop_id?: string;
  permissions: {
    can_add_income?: boolean;
    can_add_expense?: boolean;
    can_add_customer?: boolean;
    can_use_pos?: boolean;
    can_delete_income?: boolean;
    can_delete_expense?: boolean;
    can_edit_customer?: boolean;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with anon key to validate the caller's JWT
    const anonClient = createClient(supabaseUrl, anonKey);

    // Client with service role key for admin operations (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get the caller's token to verify they are an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Validate the caller's token using the anon client
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session. Please log in again." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is an admin (using service role client to bypass RLS)
    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !callerProfile) {
      return new Response(JSON.stringify({ error: "Could not verify your account. Please contact support." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((callerProfile.role !== "admin" && callerProfile.role !== "super_admin") || !callerProfile.is_active) {
      return new Response(JSON.stringify({ error: "Only administrators can create cashier accounts." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: CreateCashierBody = await req.json();
    const { email, password, full_name, phone, permissions } = body;

    // Determine shop_id: use provided shop_id, or fall back to caller's shop_id
    let shopId = body.shop_id;
    if (!shopId) {
      const { data: callerFullProfile } = await adminClient
        .from("profiles")
        .select("shop_id")
        .eq("id", user.id)
        .maybeSingle();
      shopId = callerFullProfile?.shop_id;
    }
    if (!shopId) {
      return new Response(JSON.stringify({ error: "No barber shop assigned. Could not determine which shop this cashier belongs to." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Name, email, and password are all required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters long." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the auth user with cashier role
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "cashier" },
    });

    if (createError) {
      console.error("createUser error:", JSON.stringify({ message: createError.message, name: createError.name, status: (createError as any)?.status, code: (createError as any)?.code, details: (createError as any)?.details, hint: (createError as any)?.hint }));
      return new Response(JSON.stringify({
        error: createError.message || "Failed to create authentication user",
        details: { name: createError.name, code: (createError as any)?.code, status: (createError as any)?.status },
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newUser.user) {
      return new Response(JSON.stringify({ error: "Failed to create authentication user. No user returned." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUser.user.id;

    // Insert/update the profile with cashier role and permissions
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: newUserId,
      email,
      full_name,
      phone: phone || null,
      role: "cashier",
      is_active: true,
      shop_id: shopId,
      permissions: {
        can_add_income: permissions.can_add_income ?? true,
        can_add_expense: permissions.can_add_expense ?? true,
        can_add_customer: permissions.can_add_customer ?? true,
        can_use_pos: permissions.can_use_pos ?? true,
        can_delete_income: permissions.can_delete_income ?? false,
        can_delete_expense: permissions.can_delete_expense ?? false,
        can_edit_customer: permissions.can_edit_customer ?? false,
      },
    });

    if (profileError) {
      // If profile creation fails, clean up the auth user
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: "Failed to create cashier profile: " + profileError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also create an employee record linked to this profile
    const { error: empError } = await adminClient.from("employees").insert({
      profile_id: newUserId,
      full_name,
      email,
      phone: phone || null,
      specialization: "Cashier",
      salary: 0,
      commission_rate: 0,
      status: "active",
      shop_id: shopId,
    });

    if (empError) {
      // Employee record is secondary — don't fail the whole operation
      console.error("Failed to create employee record:", empError.message);
    }

    // Verify the auth user was actually created with a password
    const { data: verifyUser, error: verifyError } = await adminClient.auth.admin.getUserById(newUserId);
    if (verifyError || !verifyUser.user) {
      return new Response(JSON.stringify({ error: "Verification failed: user was not created properly." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: newUserId,
      message: "Cashier account created successfully.",
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
