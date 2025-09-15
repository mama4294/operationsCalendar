export interface Operation {
  id: string;
  equipmentId: string; // maps to cr2b6_systemid
  batchId: string | null;
  startTime: Date;
  endTime: Date;
  type: string;
  description: string;
  createdOn?: Date;
  modifiedOn?: Date;
}
