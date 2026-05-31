import { FC, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAccount } from "wagmi";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import { useColorScheme } from "@mui/material/styles";

import useNickname from "@/hooks/useNickname";
import { metamaskIcon, shortenAddress } from "../util";

type ThemeMode = "light" | "dark" | "system";

const Settings: FC = () => {
  const { address } = useAccount();
  const [nickname, setNickname] = useNickname();
  const [nicknameInput, setNicknameInput] = useState(nickname);
  const { mode, setMode, systemMode } = useColorScheme();

  useEffect(() => {
    setNicknameInput(nickname);
  }, [nickname]);

  const avatar = useMemo(() => {
    if (address) return metamaskIcon(address);
    return null;
  }, [address]);

  if (!address) return <Navigate to="/" replace />;

  const trimmedNickname = nicknameInput.trim();
  const hasNicknameChange = trimmedNickname !== nickname;
  const selectedThemeMode: ThemeMode = mode ?? "system";

  const handleSaveNickname = () => {
    setNickname(trimmedNickname);
  };

  const handleClearNickname = () => {
    setNickname("");
  };

  const handleThemeModeChange = (_event: unknown, value: ThemeMode | null) => {
    if (value) setMode(value);
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Box sx={{ width: "100%", maxWidth: 560, py: { xs: 2, sm: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Preferences for this browser and wallet.
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                src={avatar ?? undefined}
                sx={{ width: 48, height: 48 }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700}>Local profile</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {shortenAddress(address)}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.5}>
              <TextField
                label="Display name"
                value={nicknameInput}
                onChange={(event) => setNicknameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSaveNickname();
                }}
                size="small"
                fullWidth
                slotProps={{ htmlInput: { maxLength: 32 } }}
              />
              <Typography variant="body2" color="text.secondary">
                Your display name is stored locally in this browser and is not
                written on-chain.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  onClick={handleSaveNickname}
                  disabled={!hasNicknameChange}
                  sx={{ alignSelf: { sm: "flex-start" } }}
                >
                  Save display name
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClearNickname}
                  disabled={!nickname}
                  sx={{ alignSelf: { sm: "flex-start" } }}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Theme
            </Typography>
            <ToggleButtonGroup
              value={selectedThemeMode}
              exclusive
              onChange={handleThemeModeChange}
              aria-label="Theme"
              size="small"
              fullWidth
            >
              <ToggleButton value="light" aria-label="Light theme">
                <Stack direction="row" spacing={1} alignItems="center">
                  <LightModeIcon fontSize="small" />
                  <span>Light</span>
                </Stack>
              </ToggleButton>
              <ToggleButton value="dark" aria-label="Dark theme">
                <Stack direction="row" spacing={1} alignItems="center">
                  <DarkModeIcon fontSize="small" />
                  <span>Dark</span>
                </Stack>
              </ToggleButton>
              <ToggleButton value="system" aria-label="System theme">
                <Stack direction="row" spacing={1} alignItems="center">
                  <SettingsBrightnessIcon fontSize="small" />
                  <span>System</span>
                </Stack>
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedThemeMode === "system" && systemMode
                ? `Using your system ${systemMode} theme.`
                : "Saved on this device."}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default Settings;
