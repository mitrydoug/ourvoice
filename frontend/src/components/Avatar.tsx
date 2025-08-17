import React, { FC, useContext, useEffect, useState } from 'react';
import MuiAvatar from '@mui/material/Avatar';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import jazzicon from '@metamask/jazzicon';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';

import AppContext from '../context/AppContext';

const metamaskIcon = (address) => {
  console.log(address);
  const jazziconData = jazzicon(16, parseInt(address.slice(2, 10), 16));
  const jazziconSvg = new XMLSerializer().serializeToString(jazziconData.children[0]);
  return `data:image/svg+xml,${encodeURIComponent(jazziconSvg)}`;
}


const Avatar: FC = () => {

    const [avatar, setAvatar] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const { wallet: { address, provider, walletState, setConnectionRequest }  } = useContext(AppContext);

    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

    useEffect(() => {
        if (address) {
            setAvatar(metamaskIcon(address));
        } else {
            setAvatar(null);
        }

    }, [address]);

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const handleClose = () => {
        setModalOpen(false);
    };

    const open = Boolean(anchorEl);

    return (
        <>
            <Box onMouseEnter={handlePopoverOpen} onMouseLeave={handlePopoverClose}>
                <MuiAvatar src={avatar}/>
            </Box>
            { address && (
                <Popover
                    id="mouse-over-popover"
                    sx={{ pointerEvents: 'none', padding: '0.5rem' }}
                    open={open}
                    anchorEl={anchorEl}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    onClose={handlePopoverClose}
                    disableRestoreFocus
                    >
                        <Box sx={{ padding: '0.5rem' }}>
                            <Typography variant="body1">
                                {address.slice(0, 5) + "..." + address.slice(-5)}
                            </Typography>
                        </Box>
                </Popover>
            )}
        </>
    );
};

export default Avatar;