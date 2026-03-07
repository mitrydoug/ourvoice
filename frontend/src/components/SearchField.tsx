import React from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  fullWidth?: boolean;
}

const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  onClear,
  fullWidth = false,
}) => (
  <TextField
    placeholder="Search..."
    size="small"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    slotProps={{
      input: {
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={onClear} edge="end">
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
        sx: {
          backgroundColor: "white",
          height: 36,
          fontSize: "0.875rem",
        },
      },
    }}
    sx={{
      width: fullWidth ? "100%" : "auto",
      flexGrow: 1,
      "& .MuiOutlinedInput-root": {
        backgroundColor: "white",
      },
    }}
  />
);

export default SearchField;
