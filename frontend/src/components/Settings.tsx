import { FC, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Divider,
  FormHelperText,
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
import { useWalletAuth } from "@/wallet";

import useNickname from "@/hooks/useNickname";
import { metamaskIcon, shortenAddress } from "../util";
import { targetChain } from "../wagmiConfig";
import {
  RPC_URL_STORAGE_KEY,
  normalizeRpcUrlInput,
  validateRpcUrlChain,
} from "../rpcUrl";

type ThemeMode = "light" | "dark" | "system";

const RPC_VALIDATION_DEBOUNCE_MS = 600;

type RpcValidation =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "valid" }
  | { kind: "invalid"; message: string };

const Settings: FC = () => {
  const { address } = useWalletAuth();
  const [nickname, setNickname] = useNickname();
  const [nicknameInput, setNicknameInput] = useState(nickname);
  const [storedRpcUrl] = useState(() => {
    try {
      return localStorage.getItem(RPC_URL_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [rpcUrlInput, setRpcUrlInput] = useState(storedRpcUrl);
  const [rpcValidation, setRpcValidation] = useState<RpcValidation>({
    kind: "idle",
  });
  const { mode, setMode, systemMode } = useColorScheme();

  useEffect(() => {
    setNicknameInput(nickname);
  }, [nickname]);

  // Validate a custom RPC URL in the background (debounced) as the user types,
  // so they know it targets the right chain before saving.
  useEffect(() => {
    const candidate = normalizeRpcUrlInput(rpcUrlInput);
    if (!candidate || candidate === storedRpcUrl) {
      setRpcValidation({ kind: "idle" });
      return;
    }

    setRpcValidation({ kind: "checking" });
    let cancelled = false;
    const handle = window.setTimeout(() => {
      validateRpcUrlChain(candidate, targetChain.id, targetChain.name)
        .then(() => {
          if (!cancelled) setRpcValidation({ kind: "valid" });
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setRpcValidation({
            kind: "invalid",
            message:
              error instanceof Error
                ? error.message
                : "Unable to validate RPC URL.",
          });
        });
    }, RPC_VALIDATION_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [rpcUrlInput, storedRpcUrl]);

  const avatar = useMemo(() => {
    if (address) return metamaskIcon(address);
    return null;
  }, [address]);

  if (!address) return <Navigate to="/" replace />;

  const trimmedNickname = nicknameInput.trim();
  const hasNicknameChange = trimmedNickname !== nickname;
  const selectedThemeMode: ThemeMode = mode ?? "system";
  const hasStoredRpcUrl = storedRpcUrl.length > 0;
  const canSaveRpcUrl = rpcValidation.kind === "valid";

  const handleSaveNickname = () => {
    setNickname(trimmedNickname);
  };

  const handleClearNickname = () => {
    setNickname("");
  };

  const handleThemeModeChange = (_event: unknown, value: ThemeMode | null) => {
    if (value) setMode(value);
  };

  // A validated custom RPC is persisted and applied via a reload, because the
  // wagmi transport is built once at startup from the stored value.
  const handleSaveRpcUrl = () => {
    const candidate = normalizeRpcUrlInput(rpcUrlInput);
    if (!candidate || rpcValidation.kind !== "valid") return;
    localStorage.setItem(RPC_URL_STORAGE_KEY, candidate);
    window.location.reload();
  };

  const handleRemoveRpcUrl = () => {
    localStorage.removeItem(RPC_URL_STORAGE_KEY);
    window.location.reload();
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
              RPC
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                label="Custom RPC URL"
                value={rpcUrlInput}
                onChange={(event) => setRpcUrlInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSaveRpcUrl) {
                    handleSaveRpcUrl();
                  }
                }}
                size="small"
                fullWidth
                placeholder="https://..."
                error={rpcValidation.kind === "invalid"}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  onClick={handleSaveRpcUrl}
                  disabled={!canSaveRpcUrl}
                  sx={{ alignSelf: { sm: "flex-start" } }}
                >
                  Save RPC URL
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleRemoveRpcUrl}
                  disabled={!hasStoredRpcUrl}
                  sx={{ alignSelf: { sm: "flex-start" } }}
                >
                  Remove
                </Button>
              </Stack>
              <FormHelperText error={rpcValidation.kind === "invalid"}>
                {rpcValidation.kind === "checking" && "Checking chain ID..."}
                {rpcValidation.kind === "valid" &&
                  `Looks good — reports ${targetChain.name}.`}
                {rpcValidation.kind === "invalid" && rpcValidation.message}
                {rpcValidation.kind === "idle" &&
                  (hasStoredRpcUrl
                    ? `Using a custom RPC for ${targetChain.name}.`
                    : `Optional. Overrides the built-in RPC for ${targetChain.name} (${targetChain.id}).`)}
              </FormHelperText>
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
