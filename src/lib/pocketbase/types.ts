export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "admin" | "editor" | "viewer";

export type AssetType =
  | "domain"
  | "server"
  | "firewall"
  | "m365_tenant"
  | "wifi"
  | "printer"
  | "workstation"
  | "other";

export type PocketBaseRecord = {
  id: string;
  created?: string;
  updated?: string;
  created_at: string;
  updated_at: string;
};

export type RawPocketBaseRecord = Record<string, unknown> & {
  id: string;
  created?: string;
  updated?: string;
  created_at?: string;
  updated_at?: string;
};

export type UserProfile = PocketBaseRecord & {
  email: string | null;
  username: string | null;
  full_name: string | null;
  role: AppRole;
};

export type Company = PocketBaseRecord & {
  name: string;
  slug?: string | null;
  description: string | null;
  website?: string | null;
  created_by?: string | null;
};

export type Article = PocketBaseRecord & {
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  company_id: string | null;
  category: string | null;
  tags: string[];
  is_pinned: boolean;
  is_internal: boolean;
  created_by: string | null;
};

export type Asset = PocketBaseRecord & {
  company_id: string | null;
  name: string;
  asset_type: AssetType;
  description: string | null;
  metadata?: Json;
  created_by: string | null;
};

export type Attachment = PocketBaseRecord & {
  article_id: string | null;
  asset_id?: string | null;
  file?: string | null;
  file_name: string;
  file_path?: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
};

export type PocketBaseAuth = {
  token: string;
  user: UserProfile;
};

export type PocketBaseList<T> = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
};

export type PocketBaseError = Error & {
  status?: number;
};
