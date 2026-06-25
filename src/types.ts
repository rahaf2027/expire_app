/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MultilingualName {
  language: string;
  name: string;
}

export interface ProductLog {
  employeeName: string;
  action: string;
  timestamp: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  multilingualNames: MultilingualName[];
  expiryDate: string; // YYYY-MM-DD
  imageUrl: string; // Package image base64 or mock sample URL
  expiryImageUrl?: string; // Expiry image base64 or mock sample URL
  status: 'active' | 'sold' | 'shelf_checked' | 'handled';
  quantity: number; // total units in pieces
  quantityUnit?: 'pcs' | 'cartons';
  unitsPerCarton?: number;
  looseUnits?: number;
  createdAt: string;
  updatedAt: string;
  logs: ProductLog[];
}

export interface ActivityLog {
  id: string;
  branchId: string;
  productId: string;
  productName: string;
  brand: string;
  employeeName: string;
  action: 'sold' | 'shelf_checked' | 'handled' | 'created' | 'quantity_incremented';
  timestamp: string;
}

export interface Branch {
  id: string;
  name: string;
}

export interface AppState {
  products: Product[];
  logs: ActivityLog[];
}
