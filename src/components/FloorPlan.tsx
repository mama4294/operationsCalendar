import {
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Map24Regular } from '@fluentui/react-icons';

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
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <Map24Regular style={{ fontSize: '64px', marginBottom: '16px' }} />
                    <br />
          <Text size={400}>Floor Plan view coming soon...</Text>
          <br />
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            This page will show the facility layout and equipment placement
          </Text>
        </div>
      </div>
    </div>
  );
}