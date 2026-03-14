import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Fade,
  LinearProgress,
  Link,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useWriteContract } from "wagmi";
import {
  registryContractConfig,
  mockRegistryContractConfig,
  isDevMode,
} from "../contracts";

// Icons
import VerifiedIcon from "@mui/icons-material/Verified";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import PublicIcon from "@mui/icons-material/Public";
import FlagIcon from "@mui/icons-material/Flag";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AppleIcon from "@mui/icons-material/Apple";
import AndroidIcon from "@mui/icons-material/Android";

// ─── Constants ───────────────────────────────────────────────────────────────

const MY_ICON_URL = "https://i.imgur.com/I86xH4n.png";
const MY_SCOPE = "our-voice-verify";

const ZKPASSPORT_URL = "https://zkpassport.id";
const ZKPASSPORT_IOS_URL = "https://apps.apple.com/app/zkpassport/id6477371975";
const ZKPASSPORT_ANDROID_URL =
  "https://play.google.com/store/apps/details?id=app.zkpassport.zkpassport";

const STEP_LABELS = [
  "Why Verify?",
  "Get ZKPassport",
  "Scan Passport",
  "Choose Level",
  "Scan & Verify",
];

type VerifyPhase =
  | "PRE_SCAN"
  | "GENERATING_PROOF"
  | "PROOF_GENERATED"
  | "VERIFIED"
  | "REJECTED"
  | "ERROR";

// ─── Shared Layout ───────────────────────────────────────────────────────────

/** Consistent card-style wrapper used by every step. */
const StepContainer: FC<{
  children: React.ReactNode;
  maxWidth?: "sm" | "md";
}> = ({ children, maxWidth = "sm" }) => (
  <Fade in timeout={400}>
    <Paper
      elevation={0}
      sx={{
        mx: "auto",
        width: "100%",
        maxWidth: maxWidth === "sm" ? 560 : 720,
        p: { xs: 2.5, sm: 3 },
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
      }}
    >
      {children}
    </Paper>
  </Fade>
);

const NavButtons: FC<{
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  backLabel?: string;
}> = ({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  backLabel = "Back",
}) => (
  <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
    <Button
      variant="text"
      startIcon={<ArrowBackIcon />}
      onClick={onBack}
      size="medium"
    >
      {backLabel}
    </Button>
    {onNext && (
      <Button
        endIcon={<ArrowForwardIcon />}
        onClick={onNext}
        disabled={nextDisabled}
        size="medium"
      >
        {nextLabel}
      </Button>
    )}
  </Stack>
);

// ─── Step 0: Why Verify ──────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: "What is ZKPassport?",
    answer:
      "ZKPassport is an open-source app that reads the chip in your passport using your phone's NFC reader. It creates a cryptographic proof that you're a real person — without sharing your name, photo, or any other personal details.",
  },
  {
    question: "What are zero-knowledge proofs?",
    answer:
      'Zero-knowledge proofs are a breakthrough in cryptography that let you prove something is true without revealing the underlying data. For example, you can prove "I am over 18" without revealing your date of birth, or "I hold a valid passport" without revealing any passport details.',
  },
  {
    question: "What data do you collect?",
    answer:
      "None. The verification happens entirely on your device and on-chain. Symvolia never sees your passport data, name, photo, or date of birth. The only thing recorded is a cryptographic proof that a unique human completed verification.",
  },
  {
    question: "Why is verification required?",
    answer:
      "Symvolia uses quadratic voting to surface genuine public sentiment. Without one-person-one-vote integrity, bad actors could create thousands of fake accounts to manipulate results. Verification ensures every voice is real — and equal.",
  },
  {
    question: "Can I be tracked or identified?",
    answer:
      "No. The zero-knowledge proof contains no personally identifiable information. Even the smart contract cannot determine who you are. Your participation on Symvolia remains pseudonymous.",
  },
];

const StepWhyVerify: FC<{ onBack: () => void; onNext: () => void }> = ({
  onBack,
  onNext,
}) => (
  <StepContainer>
    <Stack spacing={2.5} alignItems="center">
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "primary.main",
          color: "primary.contrastText",
        }}
      >
        <FingerprintIcon sx={{ fontSize: 26 }} />
      </Box>

      <Typography variant="h6" fontWeight={700} textAlign="center">
        Prove you&apos;re human — privately
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        textAlign="center"
        sx={{ maxWidth: 440 }}
      >
        Symvolia uses{" "}
        <Link href={ZKPASSPORT_URL} target="_blank" rel="noopener">
          ZKPassport
        </Link>{" "}
        to verify that every participant is a unique, real person — without
        collecting any personal data. The process takes about two minutes.
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ width: "100%" }}
      >
        {[
          {
            icon: <VisibilityOffIcon color="primary" />,
            label: "No personal data shared",
          },
          {
            icon: <LockOutlinedIcon color="primary" />,
            label: "Cryptographically secure",
          },
          {
            icon: <PublicIcon color="primary" />,
            label: "Open-source & auditable",
          },
        ].map(({ icon, label }) => (
          <Paper
            key={label}
            variant="outlined"
            sx={{
              flex: 1,
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              borderRadius: 2,
              textAlign: "center",
            }}
          >
            {icon}
            <Typography variant="body2">{label}</Typography>
          </Paper>
        ))}
      </Stack>

      <Divider sx={{ width: "100%" }} />

      <Box sx={{ width: "100%" }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Frequently asked questions
        </Typography>
        {FAQ_ITEMS.map(({ question, answer }) => (
          <Accordion
            key={question}
            disableGutters
            elevation={0}
            sx={{
              "&:before": { display: "none" },
              border: 0,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" fontWeight={600}>
                {question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                {answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Stack>

    <NavButtons onBack={onBack} onNext={onNext} />
  </StepContainer>
);

// ─── Step 1: Get ZKPassport ────────────────────────────────────────────────── ──────────────────────────────────────────────────

const StepGetApp: FC<{ onBack: () => void; onNext: () => void }> = ({
  onBack,
  onNext,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [platform, setPlatform] = useState<"iphone" | "android">("iphone");

  const storeUrl =
    platform === "iphone" ? ZKPASSPORT_IOS_URL : ZKPASSPORT_ANDROID_URL;

  return (
    <StepContainer>
      <Stack spacing={2.5} alignItems="center">
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "primary.main",
            color: "primary.contrastText",
          }}
        >
          <PhoneIphoneIcon sx={{ fontSize: 26 }} />
        </Box>

        <Typography variant="h6" fontWeight={700} textAlign="center">
          Download ZKPassport
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          sx={{ maxWidth: 440 }}
        >
          {isMobile
            ? "Tap your platform to install the free, open-source ZKPassport app."
            : "Select your platform and scan the QR code with your phone to install the app."}
        </Typography>

        {/* Platform toggle */}
        <ToggleButtonGroup
          value={platform}
          exclusive
          onChange={(_, val: "iphone" | "android" | null) => {
            if (val) setPlatform(val);
          }}
          sx={{ width: "100%" }}
        >
          <ToggleButton
            value="iphone"
            sx={{ flex: 1, textTransform: "none", gap: 1 }}
          >
            <AppleIcon fontSize="small" /> iPhone
          </ToggleButton>
          <ToggleButton
            value="android"
            sx={{ flex: 1, textTransform: "none", gap: 1 }}
          >
            <AndroidIcon fontSize="small" /> Android
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Desktop: QR code  |  Mobile: direct button */}
        {isMobile ? (
          <Button
            variant="outlined"
            size="large"
            startIcon={platform === "iphone" ? <AppleIcon /> : <AndroidIcon />}
            href={storeUrl}
            target="_blank"
            rel="noopener"
            sx={{ width: "100%", textTransform: "none" }}
          >
            {platform === "iphone"
              ? "Download on the App Store"
              : "Get it on Google Play"}
          </Button>
        ) : (
          <Fade in key={platform}>
            <Paper
              elevation={2}
              sx={{ p: 2.5, borderRadius: 3, display: "inline-block" }}
            >
              <QRCodeSVG value={storeUrl} size={200} level="M" />
            </Paper>
          </Fade>
        )}
      </Stack>

      <NavButtons onBack={onBack} onNext={onNext} nextLabel="I have the app" />
    </StepContainer>
  );
};

// ─── Step 2: Scan Passport ───────────────────────────────────────────────────

const StepScanPassport: FC<{ onBack: () => void; onNext: () => void }> = ({
  onBack,
  onNext,
}) => (
  <StepContainer>
    <Stack spacing={2.5} alignItems="center">
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "primary.main",
          color: "primary.contrastText",
        }}
      >
        <FingerprintIcon sx={{ fontSize: 26 }} />
      </Box>

      <Typography variant="h6" fontWeight={700} textAlign="center">
        Register your passport
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        textAlign="center"
        sx={{ maxWidth: 440 }}
      >
        Open the ZKPassport app on your phone and scan your passport. This reads
        the NFC chip inside the cover — no photos or uploads needed.
      </Typography>

      <Divider sx={{ width: "100%" }} />

      <Box sx={{ width: "100%" }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          How it works
        </Typography>
        <Stack spacing={1.5}>
          {[
            'Open ZKPassport and tap "Scan Passport"',
            "Hold your phone against the back cover of your passport",
            "Wait a few seconds for the NFC chip to be read",
            "You&apos;ll see a confirmation once your passport is registered",
          ].map((text, i) => (
            <Stack key={i} direction="row" spacing={1.5} alignItems="center">
              <Chip
                label={i + 1}
                size="small"
                color="primary"
                sx={{
                  fontWeight: 700,
                  minWidth: 28,
                  height: 28,
                }}
              />
              <Typography variant="body2">{text}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Alert severity="info" sx={{ width: "100%" }}>
        <AlertTitle>Already registered?</AlertTitle>
        If you&apos;ve already scanned your passport in ZKPassport, skip ahead —
        you&apos;re ready to go.
      </Alert>
    </Stack>

    <NavButtons onBack={onBack} onNext={onNext} nextLabel="Passport ready" />
  </StepContainer>
);

// ─── Step 3: Choose Level ────────────────────────────────────────────────────

type LevelOption = {
  id: "personhood" | "nationality";
  icon: React.ReactNode;
  title: string;
  tagline: string;
  bullets: string[];
};

const LEVEL_OPTIONS: LevelOption[] = [
  {
    id: "personhood",
    icon: <PublicIcon sx={{ fontSize: 32 }} />,
    title: "Personhood Only",
    tagline: "Prove you're human — nothing more",
    bullets: [
      "Participate in the global Earth forum",
      "No nationality data disclosed",
      "Maximum privacy",
    ],
  },
  {
    id: "nationality",
    icon: <FlagIcon sx={{ fontSize: 32 }} />,
    title: "Personhood + Nationality",
    tagline: "Unlock country-specific forums",
    bullets: [
      "Everything in Personhood, plus…",
      "Join your country's forum",
      "Only your country code is disclosed — no other data",
    ],
  },
];

const StepChooseLevel: FC<{
  selected: "personhood" | "nationality" | null;
  onSelect: (level: "personhood" | "nationality") => void;
  onBack: () => void;
  onNext: () => void;
}> = ({ selected, onSelect, onBack, onNext }) => {
  const theme = useTheme();

  return (
    <StepContainer maxWidth="md">
      <Stack spacing={2.5} alignItems="center">
        <Typography variant="h6" fontWeight={700} textAlign="center">
          Choose your verification level
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          sx={{ maxWidth: 500 }}
        >
          Both options verify you as a unique human. The only difference is
          whether you&apos;d like to share your nationality to access
          country-specific forums.
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ width: "100%" }}
        >
          {LEVEL_OPTIONS.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <Card
                key={opt.id}
                variant="outlined"
                sx={{
                  flex: 1,
                  borderWidth: 2,
                  borderColor: isSelected
                    ? "primary.main"
                    : theme.palette.divider,
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxShadow: isSelected
                    ? `0 0 0 1px ${theme.palette.primary.main}`
                    : "none",
                }}
              >
                <CardActionArea
                  onClick={() => onSelect(opt.id)}
                  sx={{ height: "100%" }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ color: "primary.main" }}>{opt.icon}</Box>
                        <Typography variant="h6" fontWeight={700}>
                          {opt.title}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {opt.tagline}
                      </Typography>
                      <Divider />
                      <Stack spacing={1}>
                        {opt.bullets.map((b) => (
                          <Stack
                            key={b}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <CheckCircleIcon
                              sx={{ fontSize: 18, color: "success.main" }}
                            />
                            <Typography variant="body2">{b}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>

        <Alert
          severity="info"
          sx={{ width: "100%" }}
          icon={<LockOutlinedIcon />}
        >
          Whichever option you choose, your name, date of birth, passport
          number, and photo are <strong>never</strong> shared or stored.
        </Alert>
      </Stack>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continue"
        nextDisabled={selected === null}
      />
    </StepContainer>
  );
};

// ─── Step 3: Scan & Verify ───────────────────────────────────────────────────

/** Human-readable labels for each verification phase. */
const PHASE_META: Record<
  VerifyPhase,
  { label: string; detail: string; progress: number }
> = {
  PRE_SCAN: {
    label: "Waiting for scan",
    detail: "Scan the QR code with your ZKPassport app to begin.",
    progress: 0,
  },
  GENERATING_PROOF: {
    label: "Generating proof",
    detail:
      "Your phone is building a zero-knowledge proof. This may take a moment…",
    progress: 40,
  },
  PROOF_GENERATED: {
    label: "Submitting on-chain",
    detail:
      "Proof generated! Sending verification transaction to the blockchain…",
    progress: 70,
  },
  VERIFIED: {
    label: "Verified!",
    detail: "You're all set. Redirecting you home…",
    progress: 100,
  },
  REJECTED: {
    label: "Verification failed",
    detail:
      "The proof could not be verified. Please try again or contact support.",
    progress: 0,
  },
  ERROR: {
    label: "Something went wrong",
    detail: "An unexpected error occurred. Please try again.",
    progress: 0,
  },
};

const StepScanVerify: FC<{
  revealNationality: boolean;
  onBack: () => void;
}> = ({ revealNationality, onBack }) => {
  const navigate = useNavigate();
  const [verifyPhase, setVerifyPhase] = useState<VerifyPhase>("PRE_SCAN");
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  const zkPassport = useMemo(() => new ZKPassport(), []);
  const { writeContract } = useWriteContract();

  const devModeRegister = useCallback(() => {
    writeContract(
      {
        ...mockRegistryContractConfig,
        functionName: "register",
        args: [""],
      },
      {
        onError: (error) => {
          console.error("Error writing contract:", error);
        },
      },
    );
    setTimeout(() => {
      void navigate("/");
    }, 5000);
  }, [writeContract, navigate]);

  useEffect(() => {
    const constructRequest = async () => {
      const queryBuilder = await zkPassport.request({
        name: "Symvolia",
        purpose: "Roll call",
        logo: MY_ICON_URL,
        scope: MY_SCOPE,
        mode: "compressed-evm",
        devMode: isDevMode,
      });

      const {
        url,
        onRequestReceived,
        onGeneratingProof,
        onProofGenerated,
        onResult,
        onReject,
        onError,
      } = revealNationality
        ? queryBuilder
            .gte("age", 18)
            .disclose("nationality")
            .bind("chain", "ethereum_sepolia")
            .done()
        : queryBuilder.gte("age", 18).bind("chain", "ethereum_sepolia").done();

      let proof: ProofResult;

      onProofGenerated((proofResult) => {
        console.log("Proof generated:", proofResult);
        proof = proofResult;
        setVerifyPhase("PROOF_GENERATED");
      });

      onResult(({ uniqueIdentifier, verified, result }) => {
        console.log("Result received:", uniqueIdentifier, verified, result);
        setVerifyPhase(verified ? "VERIFIED" : "REJECTED");

        if (!verified) {
          console.log("Proof is not verified");
          return;
        }

        const verifierParams = zkPassport.getSolidityVerifierParameters({
          proof,
          scope: MY_SCOPE,
          devMode: isDevMode,
        });

        console.log("Submitting on-chain verification transaction...");
        writeContract(
          {
            ...registryContractConfig,
            functionName: "register",
            // The zkpassport SDK types `version` as `string` rather than
            // `0x${string}`, causing a mismatch with the on-chain ABI.
            // The runtime value is always a valid hex string.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            args: [verifierParams as any],
          },
          {
            onError: (error) => {
              console.error("Error writing contract:", error);
            },
          },
        );

        setTimeout(() => {
          void navigate("/");
        }, 5000);
      });

      onRequestReceived(() => {
        console.log("Request received");
      });

      onGeneratingProof(() => {
        setVerifyPhase("GENERATING_PROOF");
        console.log("Generating proof...");
      });

      onReject(() => {
        setVerifyPhase("REJECTED");
        console.log("Rejected");
      });

      onError((error) => {
        setVerifyPhase("ERROR");
        console.error("Error:", error);
      });

      setVerifyUrl(url);
    };

    void constructRequest();
  }, [zkPassport, revealNationality, navigate, writeContract]);

  const phase = PHASE_META[verifyPhase];
  const isTerminal = verifyPhase === "VERIFIED";
  const isError = verifyPhase === "REJECTED" || verifyPhase === "ERROR";
  const isInProgress =
    verifyPhase === "GENERATING_PROOF" || verifyPhase === "PROOF_GENERATED";

  return (
    <StepContainer>
      <Stack spacing={2.5} alignItems="center">
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: isTerminal
              ? "success.main"
              : isError
                ? "error.main"
                : "primary.main",
            color: "#fff",
            transition: "background-color 0.3s",
          }}
        >
          {isTerminal ? (
            <VerifiedIcon sx={{ fontSize: 26 }} />
          ) : isError ? (
            <ErrorOutlineIcon sx={{ fontSize: 26 }} />
          ) : (
            <QrCode2Icon sx={{ fontSize: 26 }} />
          )}
        </Box>

        <Typography variant="h6" fontWeight={700} textAlign="center">
          {verifyPhase === "PRE_SCAN" ? "Scan to verify" : phase.label}
        </Typography>

        <Typography variant="body2" color="text.secondary" textAlign="center">
          {phase.detail}
        </Typography>

        {/* QR code or progress indicator */}
        <Box sx={{ position: "relative", mt: 1 }}>
          {verifyPhase === "PRE_SCAN" && verifyUrl ? (
            <Fade in>
              <Paper
                elevation={2}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  display: "inline-block",
                }}
              >
                <QRCodeSVG value={verifyUrl} size={220} level="L" />
              </Paper>
            </Fade>
          ) : isInProgress ? (
            <Fade in>
              <Stack spacing={2} alignItems="center" sx={{ minWidth: 260 }}>
                <CircularProgress size={56} thickness={4} />
                <LinearProgress
                  variant="determinate"
                  value={phase.progress}
                  sx={{ width: "100%", borderRadius: 1, height: 6 }}
                />
                {/* Mini progress steps */}
                <Stack spacing={1} sx={{ width: "100%" }}>
                  {(
                    [
                      ["Proof generation", "GENERATING_PROOF"],
                      ["On-chain submission", "PROOF_GENERATED"],
                    ] as const
                  ).map(([label, gate]) => {
                    const phases: VerifyPhase[] = [
                      "PRE_SCAN",
                      "GENERATING_PROOF",
                      "PROOF_GENERATED",
                      "VERIFIED",
                    ];
                    const current = phases.indexOf(verifyPhase);
                    const target = phases.indexOf(gate);
                    const done = current > target;
                    const active = current === target;
                    return (
                      <Stack
                        key={label}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                      >
                        {done ? (
                          <CheckCircleIcon
                            sx={{ fontSize: 18, color: "success.main" }}
                          />
                        ) : active ? (
                          <CircularProgress size={16} thickness={5} />
                        ) : (
                          <Box
                            sx={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              border: 2,
                              borderColor: "divider",
                            }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          color={done ? "text.primary" : "text.secondary"}
                          fontWeight={active ? 600 : 400}
                        >
                          {label}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
            </Fade>
          ) : isTerminal ? (
            <Fade in>
              <Stack spacing={1} alignItems="center">
                <CheckCircleIcon sx={{ fontSize: 64, color: "success.main" }} />
              </Stack>
            </Fade>
          ) : null}

          {/* Loading placeholder while URL is generated */}
          {verifyPhase === "PRE_SCAN" && !verifyUrl && (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ width: 220, height: 220 }}
            >
              <CircularProgress />
            </Stack>
          )}
        </Box>

        {/* Error / rejection actions */}
        {isError && (
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
            size="medium"
          >
            Try Again
          </Button>
        )}

        {/* Dev mode shortcut */}
        {isDevMode && verifyPhase === "PRE_SCAN" && (
          <Button
            variant="text"
            size="small"
            onClick={() => devModeRegister()}
            sx={{ opacity: 0.6 }}
          >
            [DEV] Skip verification
          </Button>
        )}
      </Stack>

      {!isTerminal && <NavButtons onBack={onBack} backLabel="Back" />}
    </StepContainer>
  );
};

// ─── Main Orchestrator ───────────────────────────────────────────────────────

export const GetVerified: FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [verificationLevel, setVerificationLevel] = useState<
    "personhood" | "nationality" | null
  >(null);

  const goBack = () => {
    if (activeStep === 0) {
      void navigate("/");
    } else {
      setActiveStep((s) => s - 1);
    }
  };

  const goNext = () => setActiveStep((s) => s + 1);

  return (
    <Box
      sx={{
        height: "100vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <Container
        maxWidth="md"
        sx={{ py: { xs: 2, sm: 3 }, position: "relative" }}
      >
        <Stack spacing={2.5} alignItems="center">
          {/* Back to home */}
          <Button
            variant="text"
            size="small"
            startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            onClick={() => void navigate("/")}
            sx={{
              position: "absolute",
              top: { xs: 16, sm: 24 },
              left: 0,
              textTransform: "none",
              color: "text.secondary",
              fontSize: "0.8rem",
              p: 0,
              minWidth: 0,
            }}
          >
            Home
          </Button>

          {/* Stepper */}
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            sx={{
              "& .MuiStepLabel-label": { fontSize: "0.8rem" },
            }}
          >
            {STEP_LABELS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step content */}
          {activeStep === 0 && (
            <StepWhyVerify onBack={goBack} onNext={goNext} />
          )}
          {activeStep === 1 && <StepGetApp onBack={goBack} onNext={goNext} />}
          {activeStep === 2 && (
            <StepScanPassport onBack={goBack} onNext={goNext} />
          )}
          {activeStep === 3 && (
            <StepChooseLevel
              selected={verificationLevel}
              onSelect={setVerificationLevel}
              onBack={goBack}
              onNext={goNext}
            />
          )}
          {activeStep === 4 && (
            <StepScanVerify
              revealNationality={verificationLevel === "nationality"}
              onBack={goBack}
            />
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default GetVerified;
