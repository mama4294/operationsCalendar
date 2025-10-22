import {
  Text,
  Input,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { Map24Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import FermenterMap, { FermenterState } from './FermenterMap';
import { dataProvider } from '../services/DataProvider';
import type { cr2b6_systems } from '../generated/models/cr2b6_systemsModel';
import type { cr2b6_operations } from '../generated/models/cr2b6_operationsModel';
import { usePowerReady } from '../PowerProvider';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: tokens.spacingVerticalM,
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    minHeight: '56px',
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    padding: tokens.spacingVerticalM,
  },
  placeholder: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

export default function FloorPlan() {
  const styles = useStyles();
  const powerReady = usePowerReady();
  // format current datetime to yyyy-MM-ddTHH:mm (no seconds)
  const getNowLocal = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  const [selectedDateTime, setSelectedDateTime] = useState<string>(getNowLocal());
  const [equipment, setEquipment] = useState<cr2b6_systems[]>([]);
  const [operations, setOperations] = useState<cr2b6_operations[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Load equipment and operations when SDK is ready
  useEffect(() => {
    if (!powerReady) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [eq, ops] = await Promise.all([
          dataProvider.getEquipment(),
          // getOperations currently returns all; pass dummy dates
          dataProvider.getOperations(new Date(0), new Date()),
        ]);
        if (!cancelled) {
          setEquipment(eq);
          setOperations(ops);
        }
      } catch (e) {
        // Soft-fail: keep placeholders
        console.error('FloorPlan data load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [powerReady]);

  const selectedDate = useMemo(() => new Date(selectedDateTime), [selectedDateTime]);
  const normalizeId = (id?: string) => (id ? id.replace(/[{}]/g, '').toLowerCase() : '');
  // Extract label from description (e.g., "3A fermenter" -> "3A")
  const getLabelFromDescription = (desc?: string) => {
    const d = (desc || '').trim().toUpperCase();
    // take leading token before first space
    const first = d.split(/\s+/)[0] || '';
    // normalize like 3A, 3B...
    return first.replace(/[^0-9A-Z]/g, '');
  };

  const equipmentByLabel = useMemo(() => {
    const map = new Map<string, cr2b6_systems>();
    for (const eq of equipment) {
      const label = getLabelFromDescription(eq.cr2b6_description);
      if (label) map.set(label, eq);
    }
    return map;
  }, [equipment]);

  const activeByLabel: Record<string, FermenterState> = useMemo(() => {
    const labels = ['3A','3B','3C','3D','3E','3F'];
    const result: Record<string, FermenterState> = {};
    const time = selectedDate.getTime();
    for (const label of labels) {
      const eq = equipmentByLabel.get(label);
      if (!eq) { result[label] = { active: false }; continue; }
      const eqId = normalizeId(eq.cr2b6_systemid as any);
      // find an overlapping operation for this system
      const op = operations.find(op => {
        const opSys = normalizeId(op.cr2b6_system);
        const start = op.cr2b6_starttime ? new Date(op.cr2b6_starttime).getTime() : Number.NEGATIVE_INFINITY;
        const end = op.cr2b6_endtime ? new Date(op.cr2b6_endtime).getTime() : Number.POSITIVE_INFINITY;
        return opSys === eqId && start <= time && time <= end;
      });
      result[label] = {
        active: !!op,
        operationDescription: op?.cr2b6_description,
      };
    }
    return result;
  }, [equipmentByLabel, operations, selectedDate]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM }}>
          <Map24Regular />
          <Text size={500} weight="semibold">
            Floor Plan
          </Text>
        </div>
        {/* Date/Time picker (Fluent UI Input using native datetime-local) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
          <Input
            type="datetime-local"
            size="small"
            value={selectedDateTime}
            onChange={(e) => setSelectedDateTime((e.target as HTMLInputElement).value)}
            style={{ maxWidth: 240 }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {loading ? (
          <Spinner label="Loading floor plan data" />
        ) : (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <FermenterMap activeByLabel={activeByLabel} width={"100%"} height={320} />
          </div>
        )}
      </div>
    </div>
  );
}