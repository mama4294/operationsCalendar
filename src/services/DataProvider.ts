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
    throw new Error(result.error?.message || "Failed to get equipment");
  }

  async getOperations(
    startDate: Date,
    endDate: Date
  ): Promise<cr2b6_operations[]> {
    const filter = `cr2b6_starttime le ${endDate.toISOString()} and cr2b6_endtime ge ${startDate.toISOString()}`;
    const result = await getAll<cr2b6_operations>(DATASOURCES.operations, {
      filter,
    });
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error?.message || "Failed to get operations");
  }

  async getBatches(): Promise<cr2b6_batcheses[]> {
    const result = await getAll<cr2b6_batcheses>(DATASOURCES.batches);
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error?.message || "Failed to get batches");
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
    throw new Error("Failed to save equipment");
  }

  async deleteEquipment(): Promise<void> {
    // Equipment deletion disabled by policy
    throw new Error("Equipment deletion is disabled.");
  }

  async saveOperation(
    operation: Partial<cr2b6_operations>
  ): Promise<cr2b6_operations> {
    if (operation.cr2b6_operationid || operation.cr2b6_id) {
      // Update
      const id = operation.cr2b6_operationid || operation.cr2b6_id!;
      const result = await update<Partial<cr2b6_operations>, cr2b6_operations>(
        DATASOURCES.operations,
        id,
        operation
      );
      if (result.success) {
        return result.data;
      }
    } else {
      // Create
      const result = await create<Partial<cr2b6_operations>, cr2b6_operations>(
        DATASOURCES.operations,
        operation
      );
      if (result.success) {
        return result.data;
      }
    }
    throw new Error("Failed to save operation");
  }

  async deleteOperation(id: string): Promise<void> {
    const result = await remove(DATASOURCES.operations, id);
    if (!result.success) {
      throw new Error(result.error?.message || "Failed to delete operation");
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
    throw new Error("Failed to save batch");
  }

  async deleteBatch(): Promise<void> {
    // Batch deletion disabled
    throw new Error("Batch deletion is disabled.");
  }
}

// Provider switch: use Dataverse by default
export const dataProvider: IDataProvider = new DataverseDataProvider();
