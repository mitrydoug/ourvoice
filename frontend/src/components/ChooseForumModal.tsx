import { FC, useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Modal,
  TextField,
} from "@mui/material";

export const FORUMS: {
  [key: string]: { label: string; value: string; iconSrc: string };
} = {
  global: { label: "Global", value: "global", iconSrc: "earth.png" },
  USA: { label: "United States", value: "USA", iconSrc: "USA.svg" },
  CAN: { label: "Canada", value: "CAN", iconSrc: "CAN.svg" },
};

const style = {
  position: "absolute",
  top: "80px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "400px",
  bgcolor: "background.paper",
  border: "1px solid darkgray",
  borderRadius: "8px",
  boxShadow: 24,
  p: 2,
};

type ChooseForumModalProps = {
  open: boolean;
  onClose: () => void;
  chooseForum: (forum: string) => void;
};

const ChooseForumModal: FC<ChooseForumModalProps> = ({
  open,
  onClose,
  chooseForum,
}) => {
  const [text, setText] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <TextField
          placeholder="Search by country name ..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          fullWidth
        />
        <List>
          {Object.values(FORUMS)
            .filter((forum) =>
              forum.label.toLowerCase().includes(text.toLowerCase()),
            )
            .map((forum) => (
              <ListItem key={forum.value} disablePadding>
                <ListItemButton
                  onClick={() => {
                    chooseForum(forum.value);
                  }}
                >
                  <ListItemIcon>
                    <img
                      src={forum.iconSrc}
                      alt={`${forum.label} flag`}
                      style={{ height: "1.5rem", width: "1.5rem" }}
                    />
                  </ListItemIcon>
                  {forum.label}
                </ListItemButton>
              </ListItem>
            ))}
        </List>
      </Box>
    </Modal>
  );
};

export default ChooseForumModal;
