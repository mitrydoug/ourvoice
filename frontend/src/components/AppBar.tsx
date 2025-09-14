import React, { FC, useEffect, useState } from "react";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useAccount } from "wagmi";
import jazzicon from '@metamask/jazzicon';
import Avatar from '@mui/material/Avatar';

const metamaskIcon = (address) => {
  console.log(address);
  const jazziconData = jazzicon(16, parseInt(address.slice(2, 10), 16));
  const jazziconSvg = new XMLSerializer().serializeToString(jazziconData.children[0]);
  return `data:image/svg+xml,${encodeURIComponent(jazziconSvg)}`;
}

const AppBar: FC = () => {

    const { address } = useAccount()
    const [avatar, setAvatar] = useState<string | null>(null);

    useEffect(() => {
        if (address) {
            setAvatar(metamaskIcon(address));
        } else {
            setAvatar(null);
        }

    }, [address]);

    return (
        <MuiAppBar position="fixed">
            <Toolbar>
                <IconButton
                        size="large"
                        aria-label="account of current user"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        onClick={() => { }}
                        color="inherit"
                    >
                        <Avatar src="earth.png"/>
                    </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Our Voice
                </Typography>
                <div>
                    <IconButton
                        size="large"
                        aria-label="account of current user"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        onClick={() => { }}
                        color="inherit"
                    >
                        <Avatar src={avatar}/>
                    </IconButton>
                </div>
            </Toolbar>
        </MuiAppBar>
    );
}

export default AppBar;