/**
 * API response types for the Splice REST API.
 */

export interface Part {
  id: string;
  kind: 'connector' | 'terminal' | 'wire' | 'cable' | 'assembly';
  mpn: string;
  manufacturer: string;
  description?: string;
  img_url?: string;
  datasheet_url?: string;
  created_at?: string;
  spec?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  share_token?: string;
  created_at: string;
  modified_at: string;
}

export interface ProjectPlan {
  id: string;
  project_id: string;
  doc: Record<string, unknown>;
  generation: number;
  created_at: string;
  modified_at: string;
}

export interface ProjectResponse {
  project: Project;
  plan?: ProjectPlan;
  assemblies?: AssemblyInfo[];
}

export interface AssemblyInfo {
  harness_id: string;
  harness_name: string;
  config?: Record<string, unknown>;
}

export interface Harness {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  modified_at: string;
  project_id?: string;
}

export interface PlanFragmentSummary {
  id: string;
  name: string;
  description?: string;
  node_count: number;
  link_count: number;
  conductor_count: number;
  is_public: boolean;
  created_at: string;
}
