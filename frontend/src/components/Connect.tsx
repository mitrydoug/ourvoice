import AppContext from "../context/AppContext";
import { FC, useCallback, useContext, useEffect, useState } from "react";
import { Link, } from "react-router-dom";
import Modal from "@mui/material/Modal";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

const baseUrl = import.meta.env.BASE_URL;

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

interface ConnectProps {
};

const Connect: FC<ConnectProps> = () => {

    const { wallet: { connectWallet, provider, walletState, connectionRequest, setConnectionRequest } } = useContext(AppContext);

    const isModalOpen = !!connectionRequest;

    const handleCancel = useCallback(() => {
        setConnectionRequest(null);
    }, []);

    const handleOk = useCallback(async () => {
        await connectWallet();
        setConnectionRequest(null);
    }, []);

    return (
        <Modal
            open={isModalOpen}
            onClose={handleCancel}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={modalStyle}>
                {!provider ?
                    <Typography variant="body1">No wallet detected. Please install (or enable) <a href="https://metamask.io">MetaMask</a>.</Typography> :
                    walletState === "not_connected" ? (
                        <Button onClick={handleOk} style={{ width: "100%", height: "3rem" }}>
                            <img id="logo" style={{ maxHeight: "3rem" }} src={`${baseUrl}/MetaMask_Fox.svg`} />
                            Connect with MetaMask
                        </Button>
                    ) : (
                        <Typography variant="body1">
                            Already Connected! Go to <Link to="/">home page</Link>.
                        </Typography>
                    )
                }
            </Box>
        </Modal>
    );
}

export default Connect;