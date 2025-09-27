import { Box, Button, Modal, Stack, TextField } from "@mui/material";
import React, { FC, useCallback, useState } from "react";
import { useWriteContract } from "wagmi";
import { forumContractConfig } from "../contracts";

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

  const submitStatement = useCallback(() => {
    if (text.length > 0) {
      writeContract({
        ...forumContractConfig,
        functionName: "addStatement",
        args: [text],
      });
      setText("");
      onClose();
    }
  }, [text, writeContract, setText, onClose]);

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
          onChange={(e) => setText(e.target.value)}
          multiline
          rows={5}
          fullWidth
        />
        <Stack
          direction="row"
          sx={{ justifyContent: "flex-end", marginTop: 2 }}
          spacing={2}
        >
          <Button onClick={onClose}> Cancel </Button>
          <Button
            variant="contained"
            disabled={text.length === 0}
            onClick={submitStatement}
          >
            Submit
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};

export default WriteModal;
