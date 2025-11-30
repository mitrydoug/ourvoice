import {
  Box,
  Button,
  Modal,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { FC, useCallback, useState } from "react";
import { useWriteContract } from "wagmi";
import { FORUM_ABI, useForum } from "../state/Forum";

const MAX_STATEMENT_LENGTH = 280;

const style = {
  position: "absolute",
  top: "80px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "700px",
  bgcolor: "background.paper",
  border: "1px solid darkgray",
  borderRadius: "8px",
  boxShadow: 24,
  p: 2,
};

type WriteModalProps = {
  open: boolean;
  onClose: () => void;
};

const WriteModal: FC<WriteModalProps> = ({ open, onClose }) => {
  const { writeContract } = useWriteContract();
  const [text, setText] = useState("");
  const { forumContractAddress } = useForum();

  const submitStatement = useCallback(() => {
    if (text.length > 0) {
      writeContract({
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "addStatement",
        args: [text],
      });
      setText("");
      onClose();
    }
  }, [text, writeContract, setText, onClose, forumContractAddress]);

  const updateText = useCallback(
    (textVal: string) => {
      if (textVal.length <= MAX_STATEMENT_LENGTH) {
        setText(textVal);
      }
    },
    [setText],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <TextField
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => updateText(e.target.value)}
          multiline
          rows={5}
          fullWidth
        />
        <Stack
          direction="row"
          sx={{ justifyContent: "flex-end", marginTop: 2 }}
          spacing={2}
        >
          <Typography
            variant="body2"
            color={
              text.length < MAX_STATEMENT_LENGTH * 0.8
                ? "text.secondary"
                : text.length < MAX_STATEMENT_LENGTH * 0.9
                  ? "DarkOrange"
                  : "red"
            }
            sx={{
              alignSelf: "center",
              fontWeight:
                text.length < MAX_STATEMENT_LENGTH * 0.9 ? "normal" : "bold",
            }}
          >
            {text.length} / {MAX_STATEMENT_LENGTH}
          </Typography>
          <Button onClick={onClose}> Cancel </Button>
          <Button disabled={text.length === 0} onClick={submitStatement}>
            Submit
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};

export default WriteModal;
