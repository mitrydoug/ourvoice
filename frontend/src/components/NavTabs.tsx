import React, { FC } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useLocation, useNavigate } from 'react-router-dom';

const validLinkNavigation = (
  event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 || // ignore everything but left-click
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return false;
  }
  return true;
}

interface LinkTabProps {
  label: string;
  href: string;
  selected: boolean;
}

const LinkTab: FC<LinkTabProps> = ({ label, href, selected }) => {

    const navigate = useNavigate();


  return (
    <Tab
      component="a"
      onClick={() => {
        navigate(href || '/');
      }}
      aria-current={selected && 'page'}
      label={label}
    />
  );
}

interface NavTabsProps {
    tabs: { label: string; href: string }[];
}

const NavTabs: FC<NavTabsProps> = ({ tabs }) => {

  const location = useLocation();

  const value = tabs.findIndex((tab) => tab.href === location.pathname);
  console.log("Current path:", location.pathname, "Value:", value);

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        role="navigation"
        value={value !== -1 ? value : false}
      >
        {tabs.map((tab, index) => (
          <LinkTab key={index} label={tab.label} href={tab.href} selected={value === index} />
        ))}
      </Tabs>
    </Box>
  );
}

export default NavTabs;