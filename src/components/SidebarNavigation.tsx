import { useState } from 'react';
import {
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { 
  CalendarLtr16Regular, 
  Map16Regular,
  Navigation16Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  sidebar: {
    minWidth: '48px', // Minimum width for collapsed state
    backgroundColor: '#f3f2f1',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 0',
    gap: '2px',
    flexShrink: 0,
    transition: 'width 0.2s ease-in-out',
  },
  sidebarExpanded: {
    width: '180px',
    maxWidth: '180px',
  },
  sidebarCollapsed: {
    width: '48px',
    maxWidth: '48px',
  },
  header: {
    padding: '12px 16px 8px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '32px',
  },
  headerCollapsed: {
    padding: '12px 8px 8px 8px',
    justifyContent: 'center',
  },
  hamburgerButton: {
    minWidth: '32px',
    width: '32px',
    height: '32px',
    padding: '8px',
    borderRadius: '0',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: '#605e5c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      backgroundColor: '#edebe9',
      color: '#605e5c',
    },
    '&:focus': {
      outline: 'none',
      border: 'none',
      boxShadow: 'none',
    },
    '& .fui-Button__icon': {
      color: 'inherit !important',
    },
  },
  navButton: {
    justifyContent: 'flex-start',
    width: 'calc(100% - 8px)',
    padding: '8px 16px',
    minHeight: '32px',
    margin: '0 4px',
    borderRadius: '0',
    border: 'none',
    outline: 'none',
    position: 'relative',
    fontSize: '13px',
    fontWeight: '400',
    '&:focus': {
      outline: 'none',
      border: 'none',
      boxShadow: 'none',
    },
    '&:focus-visible': {
      outline: 'none',
      border: 'none',
      boxShadow: 'none',
    },
    '& .fui-Button__icon': {
      width: '16px',
      height: '16px',
      minWidth: '16px',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: '8px',
      color: 'inherit !important',
    },
    '&:hover .fui-Button__icon': {
      color: 'inherit !important',
    },
    '&:active .fui-Button__icon': {
      color: 'inherit !important',
    },
  },
  buttonContainer: {
    position: 'relative',
    width: '100%',
  },
  buttonContainerCollapsed: {
    margin: '0 6px 0 10px',
    width: '32px',
  },
  blueBar: {
    position: 'absolute',
    left: '4px',
    top: '0',
    bottom: '0',
    width: '3px',
    backgroundColor: '#0078d4',
    borderRadius: '0',
    zIndex: 1,
  },
  blueBarCollapsed: {
    left: '0px',
    top: '4px',
    bottom: '4px',
    width: '2px',
  },
  activeButton: {
    backgroundColor: 'transparent !important',
    color: '#323130 !important',
    '&:hover': {
      backgroundColor: 'transparent !important',
      color: '#323130 !important',
    },
    '&:active': {
      backgroundColor: 'transparent !important',
      color: '#323130 !important',
    },
  },
  inactiveButton: {
    backgroundColor: 'transparent !important',
    color: '#605e5c !important',
    '&:hover': {
      backgroundColor: 'transparent !important',
      color: '#605e5c !important',
    },
    '&:active': {
      backgroundColor: 'transparent !important',
      color: '#605e5c !important',
    },
  },
});

export type PageType = 'timeline' | 'floorplan';

interface SidebarNavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export default function SidebarNavigation({ currentPage, onPageChange }: SidebarNavigationProps) {
  const styles = useStyles();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const navigationItems = [
    {
      key: 'timeline' as PageType,
      label: 'Timeline',
      icon: CalendarLtr16Regular,
    },
    {
      key: 'floorplan' as PageType,
      label: 'Floor Plan',
      icon: Map16Regular,
    },
  ];

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded}`}>
      <div className={`${styles.header} ${isCollapsed ? styles.headerCollapsed : ''}`}>
        <Button
          appearance="subtle"
          icon={<Navigation16Regular />}
          className={styles.hamburgerButton}
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        />
      </div>
      
      {navigationItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = currentPage === item.key;
        
        return (
          <div key={item.key} className={`${styles.buttonContainer} ${isCollapsed ? styles.buttonContainerCollapsed : ''}`}>
            {isActive && <div className={`${styles.blueBar} ${isCollapsed ? styles.blueBarCollapsed : ''}`} />}
            <Button
              appearance="subtle"
              icon={<IconComponent />}
              className={`${styles.navButton} ${isActive ? styles.activeButton : styles.inactiveButton}`}
              onClick={() => onPageChange(item.key)}
              title={isCollapsed ? item.label : undefined}
              style={{
                backgroundColor: isActive && !isCollapsed ? '#ffffff' : 'transparent',
                color: isActive ? '#323130' : '#605e5c',
                boxShadow: isActive && !isCollapsed ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '8px' : '8px 16px',
                width: isCollapsed ? '32px' : 'calc(100% - 8px)',
                margin: isCollapsed ? '0' : '0 4px',
              }}
              onMouseEnter={(e) => {
                if (!isActive || isCollapsed) {
                  e.currentTarget.style.backgroundColor = '#edebe9';
                }
              }}
              onMouseLeave={(e) => {
                if (isActive && !isCollapsed) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                } else {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {!isCollapsed && item.label}
            </Button>
          </div>
        );
      })}
    </div>
  );
}