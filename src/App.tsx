import React from 'react';
import { 
  Text, 
  makeStyles, 
  shorthands, 
  tokens, 
  FluentProvider, 
  webLightTheme,
  Card,
  Badge,
  Button
} from '@fluentui/react-components';
import { CodeRegular, HeartRegular } from '@fluentui/react-icons';

import './App.css';

const useStyles = makeStyles({
  root: {
    height: '100vh',
    width: '100vw',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding('20px'),
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflowY: 'auto',
    overflowX: 'auto',
    boxSizing: 'border-box',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    maxWidth: '600px',
    width: '100%',
    minHeight: '100%',
    ...shorthands.gap('32px'),
    ...shorthands.padding('20px', '0'),
  },
  card: {
    width: '100%',
    ...shorthands.padding('40px'),
    textAlign: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  heroText: {
    fontSize: tokens.fontSizeHero900,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightHero900,
    marginBottom: '16px',
    '@media (max-width: 768px)': {
      fontSize: tokens.fontSizeHero700,
    },
  },
  heartIcon: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: '1.2em',
    verticalAlign: 'middle',
    ...shorthands.margin('0', '8px'),
  },
  subtitle: {
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase400,
    marginBottom: '24px',
    '@media (max-width: 768px)': {
      fontSize: tokens.fontSizeBase300,
    },
  },
  badgeContainer: {
    display: 'flex',
    justifyContent: 'center',
    ...shorthands.gap('12px'),
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  buttonContainer: {
    display: 'flex',
    ...shorthands.gap('16px'),
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    minWidth: '120px',
  },
  footer: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
});

const App: React.FC = () => {
  const styles = useStyles();

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.root}>
        <div className={styles.container}>
          <Card className={styles.card}>
            <Text className={styles.heroText}>
              Power Platform
              <HeartRegular className={styles.heartIcon} />
              Code
            </Text>            
            <Text className={styles.subtitle}>
              Build modern business applications with the power of code and the simplicity of Power Platform—a secure, scalable, and fully managed platform designed to accelerate innovation.
            </Text>            
            <div className={styles.badgeContainer}>
              <Badge appearance="filled" color="brand">
                Power Apps Code Apps
              </Badge>
              <Badge appearance="outline" color="success">
                Fluent UI v9
              </Badge>
              <Badge appearance="outline" color="important">
                React + TypeScript
              </Badge>
            </div>

            <div className={styles.buttonContainer}>
              <Button 
                appearance="primary" 
                icon={<CodeRegular />}
                className={styles.button}
                onClick={() => window.open('https://aka.ms/codeapps', '_blank')}
              >
                Get Started
              </Button>
            </div>
          </Card>

          <Text className={styles.footer}>
            Ready to build amazing applications? Start coding with Power Platform today!
          </Text>
        </div>
      </div>
    </FluentProvider>
  );
};

export default App;
