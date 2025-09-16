import { getPowerSdkInstance } from "@microsoft/power-apps/lib";
import { dataSourcesInfo } from "../../.power/appschemas/dataSourcesInfo";
import type { IOperationResult } from "@microsoft/power-apps/lib";
import type {
  IGetOptions,
  IGetAllOptions,
} from "../generated/models/CommonModels";
import type { cr2b6_batcheses } from "../generated/models/cr2b6_batchesesModel";
import type { cr2b6_systems } from "../generated/models/cr2b6_systemsModel";
import type { cr2b6_operations } from "../generated/models/cr2b6_operationsModel";
import { showErrorToast } from "../utils/toastUtils";

// Safely extract a readable error message from Dataverse/SDK error payloads
function formatErrorMessage(defaultMessage: string, error?: unknown): string {
  try {
    // Common SDK shape: { message: string(JSON) | string, status, requestId }
    const errObj = (error ?? {}) as any;
    const raw = errObj?.message ?? error;
    if (typeof raw === "string") {
      // Try JSON first (Dataverse often returns JSON string in message)
      try {
        const parsed = JSON.parse(raw);
        const msg =
          parsed?.error?.message ||
          parsed?.message ||
          parsed?.error?.innererror?.message;
        if (msg && typeof msg === "string") {
          return `${defaultMessage}: ${msg}`;
        }
      } catch {
        // Not JSON, use raw string
        return `${defaultMessage}: ${raw}`;
      }
    } else if (raw && typeof raw === "object") {
      const msg = (raw as any)?.error?.message || (raw as any)?.message;
      if (msg && typeof msg === "string") {
        return `${defaultMessage}: ${msg}`;
      }
    }
  } catch {
    // fall through to default
  }
  return defaultMessage;
}

// Centralized access to the Power Apps Data client
export function getDataClient() {
  const sdk = getPowerSdkInstance(dataSourcesInfo);
  if (!sdk || !sdk.Data) {
    throw new Error(
      "Power Apps data client not available; ensure SDK is initialized before calling the data provider."
    );
  }
  return sdk.Data;
}

// Canonical data source names (note: equipment has been updated to systems)
export const DATASOURCES = {
  systems: "cr2b6_systems",
  operations: "cr2b6_operations",
  batches: "cr2b6_batcheses",
} as const;

// Generic helpers
export async function getAll<T>(
  dataSourceName: string,
  options?: IGetAllOptions
): Promise<IOperationResult<T[]>> {
  const client = getDataClient();
  return client.retrieveMultipleRecordsAsync<T>(dataSourceName, options);
}

export async function getById<T>(
  dataSourceName: string,
  id: string,
  options?: IGetOptions
): Promise<IOperationResult<T>> {
  const client = getDataClient();
  return client.retrieveRecordAsync<T>(dataSourceName, id, options);
}

export async function create<TCreate, TReturn>(
  dataSourceName: string,
  record: TCreate
): Promise<IOperationResult<TReturn>> {
  const client = getDataClient();
  return client.createRecordAsync<TCreate, TReturn>(dataSourceName, record);
}

export async function update<TUpdate, TReturn>(
  dataSourceName: string,
  id: string,
  changedFields: TUpdate
): Promise<IOperationResult<TReturn>> {
  const client = getDataClient();
  return client.updateRecordAsync<TUpdate, TReturn>(
    dataSourceName,
    id,
    changedFields
  );
}

export async function remove(
  dataSourceName: string,
  id: string
): Promise<IOperationResult<void>> {
  const client = getDataClient();
  return client.deleteRecordAsync(dataSourceName, id);
}

export interface IDataProvider {
  getEquipment(): Promise<cr2b6_systems[]>;
  getOperations(startDate: Date, endDate: Date): Promise<cr2b6_operations[]>;
  getBatches(): Promise<cr2b6_batcheses[]>;
  saveEquipment(equipment: Partial<cr2b6_systems>): Promise<cr2b6_systems>;
  deleteEquipment(): Promise<void>;
  saveOperation(
    operation: Partial<cr2b6_operations>
  ): Promise<cr2b6_operations>;
  deleteOperation(id: string): Promise<void>;
  saveBatch(batch: Partial<cr2b6_batcheses>): Promise<cr2b6_batcheses>;
  deleteBatch(): Promise<void>;
}

class DataverseDataProvider implements IDataProvider {
  async getEquipment(): Promise<cr2b6_systems[]> {
    const result = await getAll<cr2b6_systems>(DATASOURCES.systems);
    if (result.success) {
      return result.data.sort(
        (a: cr2b6_systems, b: cr2b6_systems) =>
          (a.cr2b6_order ?? 0) - (b.cr2b6_order ?? 0)
      );
    }
    const msg = formatErrorMessage("Failed to get equipment", result.error);
    showErrorToast(msg);
    throw new Error(msg);
  }

  async getOperations(
    _startDate: Date,
    _endDate: Date
  ): Promise<cr2b6_operations[]> {
    // Temporarily remove date filter to see all operations
    // const filter = `cr2b6_starttime le ${endDate.toISOString()} and cr2b6_endtime ge ${startDate.toISOString()}`;
    const result = await getAll<cr2b6_operations>(DATASOURCES.operations); // , { filter }
    console.log("getOperations result:", result);
    if (result.success) {
      console.log("getOperations raw data:", result.data);
      return result.data;
    }
    const msg = formatErrorMessage("Failed to get operations", result.error);
    showErrorToast(msg);
    throw new Error(msg);
  }

  async getBatches(): Promise<cr2b6_batcheses[]> {
    const result = await getAll<cr2b6_batcheses>(DATASOURCES.batches);
    if (result.success) {
      return result.data;
    }
    const msg = formatErrorMessage("Failed to get batches", result.error);
    showErrorToast(msg);
    throw new Error(msg);
  }

  async saveEquipment(
    equipment: Partial<cr2b6_systems>
  ): Promise<cr2b6_systems> {
    if (equipment.cr2b6_systemid) {
      // Update
      const result = await update<Partial<cr2b6_systems>, cr2b6_systems>(
        DATASOURCES.systems,
        equipment.cr2b6_systemid,
        equipment
      );
      if (result.success) {
        return result.data;
      }
    } else {
      // Create
      const result = await create<Partial<cr2b6_systems>, cr2b6_systems>(
        DATASOURCES.systems,
        equipment
      );
      if (result.success) {
        return result.data;
      }
    }
    const msg = "Failed to save equipment";
    showErrorToast(msg);
    throw new Error(msg);
  }

  async deleteEquipment(): Promise<void> {
    // Equipment deletion disabled by policy
    const msg = "Equipment deletion is disabled.";
    showErrorToast(msg);
    throw new Error(msg);
  }

  async saveOperation(
    operation: Partial<cr2b6_operations>
  ): Promise<cr2b6_operations> {
    console.log("saveOperation called with:", operation);

    // Prepare the operation data for save
    const operationData: any = { ...operation };

    // Normalize picklists and required fields
    // cr2b6_type is a PicklistType and expects an integer option value.
    // UI passes human-readable strings; map them to numeric options.
    const typeMap: Record<string, number> = {
      production: 566210000,
      maintenance: 566210001,
      engineering: 566210002,
      miscellaneous: 566210003,
    };
    if (operationData.cr2b6_type != null) {
      if (typeof operationData.cr2b6_type === "string") {
        const key = operationData.cr2b6_type.trim().toLowerCase();
        const mapped = typeMap[key];
        if (typeof mapped === "number") {
          operationData.cr2b6_type = mapped;
        } else {
          delete operationData.cr2b6_type; // drop unknown label to avoid type mismatch
        }
      } else if (typeof operationData.cr2b6_type !== "number") {
        delete operationData.cr2b6_type; // remove invalid type
      }
    }

    // Do not send statecode/statuscode on create; Dataverse manages these.
    // If updates include numeric values, we can allow them later via a dedicated state change call.
    if (operationData.statecode !== undefined) delete operationData.statecode;
    if (operationData.statuscode !== undefined) delete operationData.statuscode;

    // Dates: ensure plain Date objects are fine; SDK will serialize. If strings, keep ISO strings.
    // Lookups: cr2b6_system and cr2b6_batch should be GUID strings; leave as is if provided.

    // For create operations, ensure required system fields are set
    if (!operation.cr2b6_operationid && !operation.cr2b6_id) {
      // Ensure required primary name is present (schema requires cr2b6_id as primary name)
      if (!operationData.cr2b6_id) {
        // Generate a simple human-readable id; could be timestamp-based
        operationData.cr2b6_id = `OP-${Date.now()}`;
      }
    }

    // Ensure dates are in the correct format
    // Note: Power Apps SDK should handle Date objects correctly
    // if (operationData.cr2b6_starttime instanceof Date) {
    //   operationData.cr2b6_starttime = operationData.cr2b6_starttime.toISOString();
    // }
    // if (operationData.cr2b6_endtime instanceof Date) {
    //   operationData.cr2b6_endtime = operationData.cr2b6_endtime.toISOString();
    // }

    // Build a sanitized payload with only writable attributes
    const writableFields = new Set([
      "cr2b6_id", // primary name
      "cr2b6_starttime",
      "cr2b6_endtime",
      "cr2b6_type", // option set (int)
      "cr2b6_description",
    ]);

    const payload: Record<string, any> = {};
    for (const key of Object.keys(operationData)) {
      if (writableFields.has(key)) {
        payload[key] = operationData[key];
      }
    }

    // Handle lookups using Web API navigation binding
    if (operationData.cr2b6_system) {
      const systemGuid = operationData.cr2b6_system.replace(/[{}]/g, "");
      payload["cr2b6_System@odata.bind"] = `/cr2b6_systems(${systemGuid})`;
    }
    if (operationData.cr2b6_batch) {
      const batchGuid = operationData.cr2b6_batch.replace(/[{}]/g, "");
      payload["cr2b6_Batch@odata.bind"] = `/cr2b6_batcheses(${batchGuid})`;
    }

    // Ensure picklist is number if present
    if (
      payload["cr2b6_type"] != null &&
      typeof payload["cr2b6_type"] !== "number"
    ) {
      delete payload["cr2b6_type"];
    }

    // Ensure required writable fields on create
    const isCreate = !operation.cr2b6_operationid;
    if (isCreate) {
      // Ensure we don't accidentally send system-managed IDs
      delete payload["cr2b6_operationid"];
    }

    console.log("Prepared operation payload:", payload);

    if (operation.cr2b6_operationid) {
      // Update
      const id = operation.cr2b6_operationid;
      console.log("Attempting update for id:", id);
      const result = await update<Partial<cr2b6_operations>, cr2b6_operations>(
        DATASOURCES.operations,
        id,
        payload as any
      );
      console.log("Update result:", result);
      if (result.success) {
        return result.data;
      } else {
        console.error("Update failed:", result.error);
        showErrorToast(
          formatErrorMessage("Failed to update operation", result.error)
        );
      }
    } else {
      // Create
      console.log("Attempting create");
      const result = await create<Partial<cr2b6_operations>, cr2b6_operations>(
        DATASOURCES.operations,
        payload as any
      );
      console.log("Create result:", result);
      if (result.success) {
        return result.data;
      } else {
        console.error("Create failed:", result.error);
        showErrorToast(
          formatErrorMessage("Failed to create operation", result.error)
        );
      }
    }
    const msg = "Failed to save operation";
    showErrorToast(msg);
    throw new Error(msg);
  }

  async deleteOperation(id: string): Promise<void> {
    const result = await remove(DATASOURCES.operations, id);
    if (!result.success) {
      const msg = formatErrorMessage(
        "Failed to delete operation",
        result.error
      );
      showErrorToast(msg);
      throw new Error(msg);
    }
  }

  async saveBatch(batch: Partial<cr2b6_batcheses>): Promise<cr2b6_batcheses> {
    if (batch.cr2b6_batchesid) {
      // Update
      const result = await update<Partial<cr2b6_batcheses>, cr2b6_batcheses>(
        DATASOURCES.batches,
        batch.cr2b6_batchesid,
        batch
      );
      if (result.success) {
        return result.data;
      }
    } else {
      // Create
      const result = await create<Partial<cr2b6_batcheses>, cr2b6_batcheses>(
        DATASOURCES.batches,
        batch
      );
      if (result.success) {
        return result.data;
      }
    }
    const msg = "Failed to save batch";
    showErrorToast(msg);
    throw new Error(msg);
  }

  async deleteBatch(): Promise<void> {
    // Batch deletion disabled
    const msg = "Batch deletion is disabled.";
    showErrorToast(msg);
    throw new Error(msg);
  }
}

// Provider switch: use Dataverse by default
export const dataProvider: IDataProvider = new DataverseDataProvider();
