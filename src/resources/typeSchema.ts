/**
 * Cross-links bridge command param TYPE NAMES (e.g. "PlanLink") to their field
 * shapes from generated/plan-schema.json.
 *
 * The command catalog (bridge-commands.json) only records a param's top-level
 * name + an opaque type name — so `describe_command("AddLinkCommand")` would say
 * `link: PlanLink` without revealing that PlanLink *requires* sourceNodeId /
 * targetNodeId. That gap led callers to send `{ link: { id } }`, which the app
 * silently accepts as an orphan bundle. Expanding the type here closes it, and
 * the same data powers a conservative nested-required check during validation.
 *
 * Only PlanData domain types are covered (the schema's `types` map). Command
 * option types defined outside PlanData (e.g. AddMateOptions) aren't present and
 * simply aren't expanded.
 */
import planSchemaData from '../../generated/plan-schema.json';

interface JsonSchemaProp {
  type?: string | string[];
  $ref?: string;
  items?: JsonSchemaProp;
  enum?: unknown[];
  properties?: Record<string, JsonSchemaProp>;
}
interface TypeDef {
  properties?: Record<string, JsonSchemaProp>;
  required?: string[];
}
interface SchemaTypeEntry {
  definitions?: Record<string, TypeDef>;
}

const TYPES =
  (planSchemaData as unknown as { types?: Record<string, SchemaTypeEntry> }).types ?? {};

export interface ExpandedField {
  name: string;
  type: string;
  required: boolean;
}

/** Strip array/union noise from a param type string → a bare type name. */
export function resolveTypeName(
  typeStr: string | undefined,
): { name: string; isArray: boolean } | undefined {
  if (!typeStr) return undefined;
  // Drop union members that are null/undefined; take the first meaningful token.
  const first = typeStr
    .split('|')
    .map(t => t.trim())
    .find(t => t && t !== 'null' && t !== 'undefined');
  if (!first) return undefined;
  let name = first;
  let isArray = false;
  const arrayMatch = name.match(/^Array<(.+)>$/);
  if (arrayMatch) {
    isArray = true;
    name = arrayMatch[1]!.trim();
  } else if (name.endsWith('[]')) {
    isArray = true;
    name = name.slice(0, -2).trim();
  }
  return name ? { name, isArray } : undefined;
}

function refName(ref: string): string {
  return ref.split('/').pop() ?? ref;
}

/** Render a single JSON-schema property to a short type string. */
function renderProp(prop: JsonSchemaProp): string {
  if (prop.$ref) return refName(prop.$ref);
  if (prop.type === 'array' && prop.items) return `${renderProp(prop.items)}[]`;
  if (prop.enum) return prop.enum.map(v => JSON.stringify(v)).join(' | ');
  if (Array.isArray(prop.type)) return prop.type.join(' | ');
  if (prop.type === 'object' || (!prop.type && prop.properties)) return 'object';
  return prop.type ?? 'unknown';
}

function defFor(name: string): TypeDef | undefined {
  return TYPES[name]?.definitions?.[name];
}

/**
 * Expand a param type name to its field list, or undefined if it isn't a known
 * PlanData domain type (arrays expand their element type).
 */
export function expandType(typeStr: string | undefined): ExpandedField[] | undefined {
  const resolved = resolveTypeName(typeStr);
  if (!resolved) return undefined;
  const def = defFor(resolved.name);
  if (!def?.properties) return undefined;
  const required = new Set(def.required ?? []);
  return Object.entries(def.properties).map(([name, prop]) => ({
    name,
    type: renderProp(prop),
    required: required.has(name),
  }));
}

/**
 * For a provided param VALUE typed as a known domain object, return the names of
 * required nested fields that are missing. Conservative: only checks plain
 * (non-array) object types we have a schema for; returns [] otherwise, so it can
 * never reject a call whose shape we don't fully understand.
 */
export function missingNestedRequired(typeStr: string | undefined, value: unknown): string[] {
  const resolved = resolveTypeName(typeStr);
  if (!resolved || resolved.isArray) return [];
  const def = defFor(resolved.name);
  if (!def?.required?.length) return [];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
  const obj = value as Record<string, unknown>;
  return def.required.filter(k => obj[k] === undefined || obj[k] === null);
}
