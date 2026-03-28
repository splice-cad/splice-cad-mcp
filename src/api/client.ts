import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { Part, PaginatedResponse, Project, ProjectPlan, ProjectResponse, Harness, PlanFragmentSummary, AssemblyInfo } from '../types/api.js';
import type { PlanData } from '../types/plan.js';

export class SpliceApiClient {
  private http: AxiosInstance;

  constructor(baseUrl: string, apiKey: string) {
    this.http = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });
  }

  // ── Parts ─────────────────────────────────────────────────────────────

  async searchConnectors(q: string, limit = 20, offset = 0): Promise<PaginatedResponse<Part>> {
    const { data } = await this.http.get('/api/parts/connectors/search', { params: { q, limit, offset } });
    return data;
  }

  async searchWires(q: string, limit = 20, offset = 0): Promise<PaginatedResponse<Part>> {
    const { data } = await this.http.get('/api/parts/wires/search', { params: { q, limit, offset } });
    return data;
  }

  async searchCables(q: string, limit = 20, offset = 0): Promise<PaginatedResponse<Part>> {
    const { data } = await this.http.get('/api/cables/search', { params: { q, limit, offset } });
    return data;
  }

  async getPart(id: string): Promise<Part> {
    const { data } = await this.http.get(`/api/parts/select/${id}`);
    return data;
  }

  // ── Projects ──────────────────────────────────────────────────────────

  async listProjects(): Promise<Project[]> {
    const { data } = await this.http.get('/api/projects');
    return data;
  }

  async createProject(name: string, description?: string): Promise<Project> {
    const { data } = await this.http.post('/api/projects', { name, description });
    return data;
  }

  async getProject(id: string): Promise<ProjectResponse> {
    const { data } = await this.http.get(`/api/projects/${id}`);
    return data;
  }

  // ── Plans ─────────────────────────────────────────────────────────────

  async getPlan(projectId: string): Promise<ProjectPlan> {
    const { data } = await this.http.get(`/api/projects/${projectId}/plan`);
    return data;
  }

  async savePlan(projectId: string, planData: PlanData): Promise<ProjectPlan> {
    const { data } = await this.http.put(`/api/projects/${projectId}/plan`, planData);
    return data;
  }

  // ── Assemblies ────────────────────────────────────────────────────────

  async generateAssembly(
    projectId: string,
    name: string,
    selectedNodeIds: string[],
    selectedLinkIds: string[],
    description?: string,
  ): Promise<Harness> {
    const { data } = await this.http.post(`/api/projects/${projectId}/assemblies`, {
      name,
      selected_node_ids: selectedNodeIds,
      selected_link_ids: selectedLinkIds,
      description,
    });
    return data;
  }

  // ── Custom Parts (create parts not in DB) ───────────────────────────

  async createGenericComponent(params: {
    category: string;
    mpn: string;
    manufacturer: string;
    description?: string;
    positions: number;
    pin_labels?: string[];
    is_public?: boolean;
    custom_properties?: Record<string, unknown>;
    custom_svg?: { mate_side: string; wire_side: string };
  }): Promise<Part> {
    const { data } = await this.http.post('/api/parts/connectors/generic', params);
    return data;
  }

  async createCustomConnector(params: {
    mpn: string;
    manufacturer: string;
    description?: string;
    img_url?: string;
    datasheet_url?: string;
    connector: {
      contact_gender?: 'male' | 'female' | 'none';
      shape?: string;
      category?: string;
      positions: number;
      rows?: number;
      series?: string;
      pitch_mm?: number;
      wire_awg_min?: number;
      wire_awg_max?: number;
      color?: string;
      pin_mapping?: Record<string, string>;
      custom_properties?: Record<string, unknown>;
      custom_svg?: { mate_side: string; wire_side: string };
      is_public?: boolean;
    };
  }): Promise<Part> {
    const { data } = await this.http.post('/api/parts/connectors/custom', params);
    return data;
  }

  async createCable(params: {
    mpn: string;
    manufacturer: string;
    description?: string;
    core_count: number;
    shielded: boolean;
    is_public: boolean;
    cores: Array<{
      designation: string;
      awg?: number;
      color?: string;
      stripe?: string;
    }>;
    datasheet_url?: string;
    img_url?: string;
    outer_diameter_mm?: number;
    voltage_rating?: number;
    jacket_material?: string;
    jacket_color?: string;
    temperature_rating_c?: number;
    flexibility?: string;
  }): Promise<Part> {
    const { data } = await this.http.post('/api/cables', params);
    return data;
  }

  async getCategoryTemplates(): Promise<Record<string, unknown>[]> {
    const { data } = await this.http.get('/api/parts/connectors/category-templates');
    return data;
  }

  async lookupPart(mpn: string, manufacturer?: string): Promise<Record<string, unknown>> {
    const { data } = await this.http.get('/api/parts/digikey/lookup', {
      params: { mpn, manufacturer },
    });
    return data;
  }

  // ── Legacy Harnesses ─────────────────────────────────────────────────

  async listHarnesses(): Promise<Harness[]> {
    const { data } = await this.http.get('/api/harnesses');
    return data;
  }

  async loadHarness(id: string, revision?: string): Promise<Record<string, unknown>> {
    const params = revision ? { rev: revision } : {};
    const { data } = await this.http.get(`/api/harnesses/${id}/load`, { params });
    return data;
  }

  async saveHarness(id: string, harnessData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.http.put(`/api/harnesses/${id}/save`, harnessData);
    return data;
  }

  async saveNewHarness(harnessData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.http.post('/api/harnesses/save-new', harnessData);
    return data;
  }

  // ── Fragments ─────────────────────────────────────────────────────────

  async searchFragments(q?: string, limit = 20, offset = 0): Promise<PaginatedResponse<PlanFragmentSummary>> {
    const { data } = await this.http.get('/api/plan-fragments/search', { params: { q, limit, offset } });
    return data;
  }

  async getFragment(id: string): Promise<{ template_data: PlanData; name: string; description?: string }> {
    const { data } = await this.http.get(`/api/plan-fragments/${id}`);
    return data;
  }

  // ── Error formatting ─────────────────────────────────────────────────

  static formatError(err: unknown): string {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const body = err.response?.data;
      if (status === 401) return 'Authentication failed (401). Check your SPLICE_API_KEY.';
      if (status === 403) return `Access denied (403). ${typeof body === 'object' && body && 'error' in body ? (body as { error: string }).error : 'MCP API access may require a plan upgrade.'}`.trim();
      if (status === 404) return `Not found (404). ${typeof body === 'object' && body && 'error' in body ? (body as { error: string }).error : ''}`.trim();
      if (status === 409) return `Conflict (409). ${typeof body === 'object' && body && 'error' in body ? (body as { error: string }).error : 'Another user may have edited this resource.'}`.trim();
      if (status === 429) return `Rate limited (429). ${typeof body === 'object' && body && 'error' in body ? (body as { error: string }).error : 'Weekly MCP request limit reached.'}`.trim();
      if (err.code === 'ECONNREFUSED') return `Cannot connect to Splice API. Is the backend running at ${err.config?.baseURL}?`;
      return `API error ${status ?? ''}: ${typeof body === 'object' && body && 'error' in body ? (body as { error: string }).error : err.message}`.trim();
    }
    if (err instanceof Error) return err.message;
    return String(err);
  }
}
