/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single source of truth for what each role may do in the UI.
 *
 * This only decides what to render. It is NOT the security boundary — RLS in
 * Postgres is. Every action listed here is independently enforced by a policy,
 * so a user who bypasses the UI still gets rejected by the database.
 */
import type { Role } from "./types";

export type Action =
  // Product lifecycle
  | "product.create"
  | "product.edit"
  | "product.mark"
  | "product.delete"
  // Logs and bulk clearing
  | "log.delete"
  | "log.clear"
  | "trash.clear"
  | "archive.clear"
  // Administration
  | "branch.create"
  | "branch.edit"
  | "branch.delete"
  | "branch.restore"
  | "user.manage"
  | "user.delete";

const EMPLOYEE: Action[] = ["product.create", "product.edit", "product.mark"];

// A chef runs their branch end to end, and can provision employees for their branch.
const CHEF: Action[] = [
  ...EMPLOYEE,
  "product.delete",
  "log.delete",
  "log.clear",
  "trash.clear",
  "archive.clear",
  "user.manage",
];

const MANAGER: Action[] = [
  ...CHEF,
  "branch.create",
  "branch.edit",
  "branch.delete",
  "branch.restore",
  "user.delete",
];

const MATRIX: Record<Role, Action[]> = {
  employee: EMPLOYEE,
  chef: CHEF,
  master_chef: MANAGER,
  master_admin: MANAGER,
};

export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(action) ?? false;
}

/** Roles a given role is allowed to hand out when creating an account. */
export function assignableRoles(role: Role | null | undefined): Role[] {
  if (role === "master_admin") return ["master_chef", "chef", "employee"];
  if (role === "master_chef") return ["chef", "employee"];
  if (role === "chef") return ["employee"];
  return [];
}
