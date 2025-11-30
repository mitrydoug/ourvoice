import { Box, IconButton, InputAdornment, Modal, TextField } from "@mui/material";
import React, { FC, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";

const style = {
  position: "absolute",
  top: "80px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "90%",
  maxWidth: "700px",
  bgcolor: "background.paper",
  border: "1px solid darkgray",
  borderRadius: "8px",
  boxShadow: 24,
  p: 2,
};

type SearchModalProps = {
  open: boolean;
  onClose: () => void;
};

const SearchModal: FC<SearchModalProps> = ({ open, onClose }) => {
  const [searchText, setSearchText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Search submitted:", searchText);
    setSearchText("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} aria-label="Search">
      <Box sx={style}>
        <form onSubmit={handleSubmit}>
          <TextField
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            fullWidth
            autoFocus
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton type="submit" edge="end">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </form>
      </Box>
    </Modal>
  );
};

export default SearchModal;
