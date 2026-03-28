/**
 * Re-exports from the frontend source — single source of truth.
 * The MCP server uses these types to construct and validate PlanData.
 *
 * Uses the `src/*` path alias (resolved by both tsconfig paths and tsup esbuild alias)
 * to import directly from the frontend source at `../frontend/src/`.
 */

// ── Core plan data types ────────────────────────────────────────────────
export type {
  PlanData,
  PlanNode,
  PlanNodeType,
  PlanLink,
  PlanLinkPathStyle,
  PlanLinkWaypoint,
  PlanLinkPageGeometry,
  PlanLinkBendPoint,
  PlanLinkAccessory,
  PlanConductor,
  ConductorEndpoint,
  ConductorSplice,
  ComponentPin,
  PinLead,
  WireAppearance,
  EndpointTermination,
  ContactMethod,
  PlanWireGroup,
  PlanCable,
  CableCoreMapping,
  PlanSignalDefinition,
  PlanNet,
  MateRelationship,
  PinMateMapping,
  MateType,
  DeviceGroup,
  VisualGroup,
  PlanPage,
  PlanAssemblyRef,
  SubassemblyInstance,
  BomEntry,
  BomEntryType,
  BomEntrySpec,
  SpliceType,
  BranchPointRouting,
  BranchPointPart,
  SchematicDisplayMode,
} from 'src/interfaces/planInterfaces';

// ── Enums (need value re-export, not just type) ─────────────────────────
export { WireGroupMethod } from 'src/interfaces/planInterfaces';
export { ConnectorShape, ConnectorCategory, PartKind, Gender, ConductorType } from 'src/interfaces/harnessInterfaces';

// ── Legacy harness types ────────────────────────────────────────────────
export type {
  ConnectionTermination,
  Connection,
  Position,
  ExpandedBomItem,
  WorkingData,
  WorkingHarness,
  Part,
  BomItem,
  WirePropertyOverrides,
  WireSpec,
  ConnectorSpec,
  Harness,
} from 'src/interfaces/harnessInterfaces';

// ── ID generators ───────────────────────────────────────────────────────
export {
  generateNodeId,
  generateLinkId,
  generateConductorId,
  generatePinId,
  generateCableId,
  generateWireGroupId,
  generateBomEntryId,
  generateConductorSpliceId,
  generateMateId,
  generatePageId,
  generateSignalId,
  generateDeviceGroupId,
  generateVisualGroupId,
  generateAssemblyRefId,
} from 'src/interfaces/planInterfaces';

// ── Factory functions ───────────────────────────────────────────────────
export {
  DEFAULT_PLAN_DATA,
  createNewConductor,
  createConductorSplice,
  createDefaultPin,
  createDefaultCable,
  createDefaultWireGroup,
  createDefaultMate,
  createDefaultDeviceGroup,
  createDefaultBomEntry,
  createDefaultSignalDefinition,
  createDefaultPage,
} from 'src/interfaces/planInterfaces';
