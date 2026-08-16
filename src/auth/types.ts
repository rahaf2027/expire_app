/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = "master_admin" | "master_chef" | "chef" | "employee";

export const ROLE_ORDER: Role[] = ["master_admin", "master_chef", "chef", "employee"];

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  ownerId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BranchRecord {
  id: string;
  name: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
}

/** A user row as shown in the management panel, with their branch assignments. */
export interface ManagedUser extends Profile {
  branchIds: string[];
}

export function mapProfileRow(row: any): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || "",
    role: row.role,
    ownerId: row.owner_id ?? null,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapBranchRow(row: any): BranchRecord {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
