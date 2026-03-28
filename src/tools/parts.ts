import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SpliceApiClient } from '../api/client.js';

export function registerPartsTools(server: McpServer, getClient: () => SpliceApiClient) {
  server.tool(
    'search_connectors',
    'Search the Splice connector parts database. Only use this when the user asks you to find a part in the database, or when you need a sourcePartId for linking. For most cases, prefer creating BOM entries directly with the MPN/manufacturer you already know (from datasheets, user input, or web research). Supports fuzzy queries like "molex 24 pin male".',
    {
      query: z.string().describe('Search query (e.g. "molex micro-fit 4 pin male")'),
      limit: z.number().int().min(1).max(100).default(20).describe('Max results'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
    },
    async ({ query, limit, offset }) => {
      const result = await getClient().searchConnectors(query, limit, offset);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ total: result.total, results: result.data }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'search_wires',
    'Search the Splice wire parts database. Only use when the user asks to find a wire in the database. For most cases, create wire BOM entries directly with gauge/color you already know. Supports "22 awg red", "18 awg black white stripe".',
    {
      query: z.string().describe('Search query (e.g. "22 awg red")'),
      limit: z.number().int().min(1).max(100).default(20).describe('Max results'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
    },
    async ({ query, limit, offset }) => {
      const result = await getClient().searchWires(query, limit, offset);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ total: result.total, results: result.data }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'search_cables',
    'Search the Splice cable parts database. Only use when the user asks to find a cable in the database. For most cases, create cable BOM entries directly. Supports "4 core shielded 20 awg", "belden 2 conductor".',
    {
      query: z.string().describe('Search query (e.g. "4 core shielded 20 awg")'),
      limit: z.number().int().min(1).max(100).default(20).describe('Max results'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
    },
    async ({ query, limit, offset }) => {
      const result = await getClient().searchCables(query, limit, offset);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ total: result.total, results: result.data }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'get_part',
    'Get full details for a specific part by ID, including its specification (pin count, gauge, etc.).',
    {
      id: z.string().describe('Part UUID'),
    },
    async ({ id }) => {
      const part = await getClient().getPart(id);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(part, null, 2),
        }],
      };
    },
  );

  server.tool(
    'create_component',
    'Create a component in the Splice parts database with full specs, images, and pin labels. Use lookup_part first to get image/datasheet URLs. Categories: "connector" (default), "circuit_breaker", "fuse", "relay", "contactor", "switch", "push_button", "motor", "pcb", "power_supply", "battery", "diode", "fan", "timer", "inductor", "capacitor", "resistor", "transformer", "solar_cell", "inverter", "flying_lead", "splice", "terminal_point", "other".',
    {
      mpn: z.string().describe('Manufacturer Part Number (e.g. "DT04-4P")'),
      manufacturer: z.string().describe('Manufacturer name (e.g. "Deutsch")'),
      description: z.string().optional().describe('Part description'),
      category: z.string().default('connector').describe('Component category'),
      positions: z.number().int().min(1).describe('Number of pins/positions'),
      // Images & docs
      img_url: z.string().optional().describe('URL to product image'),
      datasheet_url: z.string().optional().describe('URL to datasheet PDF'),
      // Pin detail
      pin_labels: z.array(z.string()).optional().describe('Pin labels in order (e.g. ["VCC","GND","TX","RX"])'),
      // Connector specs
      gender: z.enum(['male', 'female', 'none']).optional().describe('Connector gender'),
      shape: z.string().optional().describe('Connector shape: rectangular, circular, dsub, terminal_block, ferrule, ring, quickdisconnect, other'),
      series: z.string().optional().describe('Connector series (e.g. "DT", "Micro-Fit 3.0")'),
      rows: z.number().int().optional().describe('Number of pin rows'),
      pitch_mm: z.number().optional().describe('Pin pitch in mm'),
      wire_awg_min: z.number().int().optional().describe('Min wire gauge (AWG)'),
      wire_awg_max: z.number().int().optional().describe('Max wire gauge (AWG)'),
      // Category-specific specs
      category_specs: z.record(z.unknown()).optional().describe('Category-specific properties (e.g. current_rating, voltage_rating, coil_voltage)'),
      // Custom SVG
      custom_svg: z.object({
        mate_side: z.string().describe('SVG markup for connector mate face'),
        wire_side: z.string().describe('SVG markup for wire side'),
      }).optional().describe('Custom SVG graphics for both sides of the connector'),
      is_public: z.boolean().default(false).describe('Make visible to other users'),
    },
    async (params) => {
      let part;
      if (params.custom_svg || params.img_url || params.datasheet_url || params.gender || params.shape) {
        // Use custom connector endpoint for full-featured creation
        part = await getClient().createCustomConnector({
          mpn: params.mpn,
          manufacturer: params.manufacturer,
          description: params.description,
          img_url: params.img_url,
          datasheet_url: params.datasheet_url,
          connector: {
            contact_gender: params.gender,
            shape: params.shape,
            category: params.category === 'connector' ? undefined : params.category,
            positions: params.positions,
            rows: params.rows,
            series: params.series,
            pitch_mm: params.pitch_mm,
            wire_awg_min: params.wire_awg_min,
            wire_awg_max: params.wire_awg_max,
            pin_mapping: params.pin_labels ? Object.fromEntries(params.pin_labels.map((l, i) => [String(i), l])) : undefined,
            custom_properties: params.category_specs,
            custom_svg: params.custom_svg,
            is_public: params.is_public,
          },
        });
      } else {
        // Use generic component endpoint for simpler creation
        part = await getClient().createGenericComponent({
          category: params.category,
          mpn: params.mpn,
          manufacturer: params.manufacturer,
          description: params.description,
          positions: params.positions,
          pin_labels: params.pin_labels,
          is_public: params.is_public,
          custom_properties: params.category_specs,
        });
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: part.id,
            mpn: part.mpn,
            manufacturer: part.manufacturer,
            description: part.description,
            message: 'Component created. Use this part ID in BOM entries.',
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'get_category_templates',
    'Get default properties, specs, and SVG templates for all component categories (fuse, relay, circuit breaker, etc.). Use this to discover what category-specific fields are available when creating components.',
    {},
    async () => {
      const templates = await getClient().getCategoryTemplates();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(templates, null, 2),
        }],
      };
    },
  );

  server.tool(
    'lookup_part',
    'Look up a real-world part on DigiKey by MPN. Returns image URL, datasheet URL, specs, and parameters. Use this to enrich components before creating them with create_component.',
    {
      mpn: z.string().describe('Manufacturer Part Number to look up'),
      manufacturer: z.string().optional().describe('Manufacturer name (helps disambiguate)'),
    },
    async ({ mpn, manufacturer }) => {
      try {
        const result = await getClient().lookupPart(mpn, manufacturer);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              error: `Part "${mpn}" not found on DigiKey. Create the component manually with create_component.`,
            }, null, 2),
          }],
        };
      }
    },
  );

  server.tool(
    'create_cable',
    'Create a custom multi-conductor cable in the parts database. Use when a cable is not found via search — e.g. from a datasheet. Returns a part ID for BOM entries.',
    {
      mpn: z.string().describe('Manufacturer Part Number'),
      manufacturer: z.string().describe('Manufacturer name'),
      description: z.string().optional().describe('Cable description'),
      core_count: z.number().int().min(1).describe('Number of conductors'),
      shielded: z.boolean().default(false).describe('Has overall shield'),
      cores: z.array(z.object({
        designation: z.string().describe('Core designation (e.g. "1", "2", "Shield")'),
        awg: z.number().int().optional().describe('Wire gauge in AWG'),
        color: z.string().optional().describe('Core insulation color name (e.g. "red", "black")'),
        stripe: z.string().optional().describe('Stripe color name'),
      })).describe('Core specifications'),
      datasheet_url: z.string().optional().describe('URL to datasheet PDF'),
      is_public: z.boolean().default(false).describe('Make visible to other users'),
    },
    async ({ mpn, manufacturer, description, core_count, shielded, cores, datasheet_url, is_public }) => {
      const part = await getClient().createCable({
        mpn,
        manufacturer,
        description,
        core_count,
        shielded,
        is_public,
        cores,
        datasheet_url,
      });
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: part.id,
            mpn: part.mpn,
            manufacturer: part.manufacturer,
            core_count,
            message: 'Cable created. Use this part ID in BOM entries to assign it to plan links.',
          }, null, 2),
        }],
      };
    },
  );
}
