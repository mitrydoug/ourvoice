import {
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Modal,
  TextField,
} from "@mui/material";
import { FC, useEffect, useState } from "react";
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

type SearchResult = {
  statement_id: string;
  statement_text: string;
};

type SearchModalProps = {
  open: boolean;
  onClose: () => void;
};

const SEARCH_URL = import.meta.env.VITE_SEARCH_URL ?? "http://localhost:8000";

const fetchSearchResults = async (
  searchText: string,
): Promise<SearchResult[]> => {
  const response = await fetch(
    `${SEARCH_URL}/search?statement_text=${encodeURIComponent(searchText)}`,
  );
  return (await response.json()) as SearchResult[];
};

const SearchModal: FC<SearchModalProps> = ({ open, onClose }) => {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    void fetchSearchResults(searchText).then((docs) => {
      setSearchResults(docs);
      onClose();
    });
  };

  useEffect(() => {
    if (searchText.trim() !== "") {
      void fetchSearchResults(searchText).then(setSearchResults);
    } else {
      setSearchResults([]);
    }
  }, [searchText]);

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
        <List>
          {searchResults.map((result, idx) => (
            <ListItem key={`search-result-${idx}`}>
              <ListItemText primary={result.statement_text} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Modal>
  );
};

export default SearchModal;
