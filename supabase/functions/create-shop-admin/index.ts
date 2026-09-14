import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateShopBody {
  shop_name: string;
  location?: string;
  shop_phone?: string;
  address?: string;
  shop_status?: string;
  owner_name: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
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
      return new Response(JSON.stringify({ error: "Invalid or expired session. Please log in again." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is super_admin
    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !callerProfile) {
      return new Response(JSON.stringify({ error: "Could not verify your account." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (callerProfile.role !== "super_admin" || !callerProfile.is_active) {
      return new Response(JSON.stringify({ error: "Only the system owner can create barber shops and owner accounts." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CreateShopBody = await req.json();
    const { shop_name, location, shop_phone, address, shop_status, owner_name, username, email, phone, password } = body;

    // Validate required fields
    if (!shop_name || !owner_name || !username || !email || !password) {
      return new Response(JSON.stringify({ error: "Shop name, owner name, username, email, and password are all required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters long." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check username uniqueness
    const { data: existingUser } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      return new Response(JSON.stringify({ error: "This username is already taken. Please choose another username." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check email uniqueness
    const { data: existingEmail } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingEmail) {
      return new Response(JSON.stringify({ error: "This email is already registered. Please use a different email." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create the barber shop
    const { data: shop, error: shopError } = await adminClient
      .from("barber_shops")
      .insert({
        name: shop_name,
        location: location || null,
        phone: shop_phone || null,
        address: address || null,
        status: shop_status || "active",
      })
      .select()
      .single();

    if (shopError || !shop) {
      return new Response(JSON.stringify({ error: "Failed to create barber shop: " + (shopError?.message || "Unknown error") }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopId = shop.id;

    // 2. Create the auth user with admin role
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: owner_name, role: "admin", username },
    });

    if (createError) {
      // Rollback: delete the shop
      await adminClient.from("barber_shops").delete().eq("id", shopId);
      return new Response(JSON.stringify({ error: createError.message || "Failed to create authentication user" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newUser.user) {
      await adminClient.from("barber_shops").delete().eq("id", shopId);
      return new Response(JSON.stringify({ error: "Failed to create authentication user." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUser.user.id;

    // 3. Insert the profile with admin role, username, and shop_id
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: newUserId,
      email,
      full_name: owner_name,
      phone: phone || null,
      role: "admin",
      is_active: true,
      shop_id: shopId,
      username,
    });

    if (profileError) {
      // Rollback: delete auth user and shop
      await adminClient.auth.admin.deleteUser(newUserId);
      await adminClient.from("barber_shops").delete().eq("id", shopId);
      return new Response(JSON.stringify({ error: "Failed to create owner profile: " + profileError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Log the audit entry
    await adminClient.rpc("log_audit", {
      p_user_id: user.id,
      p_action: "barber_shop_created",
      p_table_name: "barber_shops",
      p_record_id: shopId,
      p_new_values: { shop_name, owner_name, username, email } as any,
      p_shop_id: shopId,
    });

    await adminClient.rpc("log_audit", {
      p_user_id: user.id,
      p_action: "owner_account_created",
      p_table_name: "profiles",
      p_record_id: newUserId,
      p_new_values: { owner_name, username, email, shop_id: shopId } as any,
      p_shop_id: shopId,
    });

    return new Response(JSON.stringify({
      success: true,
      shop_id: shopId,
      user_id: newUserId,
      message: "Barber Shop and Owner Account Created Successfully",
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
