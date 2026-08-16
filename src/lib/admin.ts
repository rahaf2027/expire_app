/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Branch and user administration. Every write here goes through a
 * SECURITY DEFINER RPC that re-checks the caller's role in Postgres, so the
 * browser never needs elevated credentials.
 */
import { supabase } from "./supabaseClient";
import { mapBranchRow, mapProfileRow, type BranchRecord, type ManagedUser, type Role } from "../auth/types";

export interface BranchStats {
  total: number;
  expiringSoon: number;
}

/**
 * Active product counts per branch. RLS narrows this to branches the caller
 * may see, so no branch filter is needed here.
 */
export async function fetchBranchStats(): Promise<Record<string, BranchStats>> {
  const { data, error } = await supabase
    .from("products")
    .select("branch_id, expiry_date")
    .eq("status", "active");

  if (error) {
    console.error("[Admin] Failed to load branch stats:", error);
    return {};
  }

  const soonCutoff = new Date();
  soonCutoff.setDate(soonCutoff.getDate() + 7);

  const out: Record<string, BranchStats> = {};
  for (const row of data || []) {
    const id = (row as any).branch_id as string;
    if (!out[id]) out[id] = { total: 0, expiringSoon: 0 };
    out[id].total += 1;

    const expiry = new Date((row as any).expiry_date);
    if (!Number.isNaN(expiry.getTime()) && expiry <= soonCutoff) {
      out[id].expiringSoon += 1;
    }
  }
  return out;
}

export async function createBranch(id: string, name: string): Promise<BranchRecord> {
  const { data, error } = await supabase.rpc("create_branch", { p_id: id, p_name: name });
  if (error) throw new Error(error.message);
  return mapBranchRow(data);
}

export async function createAppUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  branchIds: string[];
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_app_user", {
    p_email: input.email,
    p_password: input.password,
    p_full_name: input.fullName,
    p_role: input.role,
    p_branch_ids: input.branchIds,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_user_active", {
    p_user_id: userId,
    p_active: active,
  });
  if (error) throw new Error(error.message);
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });
  if (error) throw new Error(error.message);
}

/** Users the caller is allowed to see, with their branch assignments. */
export async function fetchManagedUsers(): Promise<ManagedUser[]> {
  const [profilesRes, membersRes] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("branch_members").select("user_id, branch_id"),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const byUser: Record<string, string[]> = {};
  for (const m of membersRes.data || []) {
    const uid = (m as any).user_id as string;
    (byUser[uid] ||= []).push((m as any).branch_id as string);
  }

  return (profilesRes.data || []).map((row) => ({
    ...mapProfileRow(row),
    branchIds: byUser[(row as any).id] || [],
  }));
}
