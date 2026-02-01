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

const fetchSolrDocs = async (searchText: string) => {
  console.log("Fetching Solr docs for:", searchText);
  const response = await fetch(
    `http://localhost:8000/search?statement_text=${encodeURIComponent(searchText)}`,
  );
  const data = await response.json();
  console.log("Solr Response:", data);
  return data;
};

const SearchModal: FC<SearchModalProps> = ({ open, onClose }) => {
  const [searchText, setSearchText] = useState("");
  const [solrDocs, setSolrDocs] = useState<SearchResult[]>([]);

  console.log("Solr Docs:", solrDocs);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Search submitted:", searchText);
    setSolrDocs(await fetchSolrDocs(searchText));
    onClose();
  };

  useEffect(() => {
    (async () => {
      if (searchText.trim() !== "") {
        setSolrDocs(await fetchSolrDocs(searchText));
      } else {
        setSolrDocs([]);
      }
    })();
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
          {solrDocs.map((doc, idx) => (
            <ListItem key={`solr-doc-${idx}`}>
              <ListItemText primary={doc.statement_text} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Modal>
  );
};

export default SearchModal;
