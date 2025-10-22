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
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    padding: tokens.spacingVerticalXXL,
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
        <Map24Regular />
        <Text size={500} weight="semibold">
          Floor Plan
        </Text>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <Map24Regular style={{ fontSize: '64px', marginBottom: '16px' }} />
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