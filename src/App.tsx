import {
  ActionIcon,
  Alert,
  AppShell,
  Button,
  Card,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconAlertCircle, IconMoon, IconSun } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DayMovementsForm } from "./features/dayMovements/DayMovementsForm.tsx";
import {
  extractRespondentKeyFromUrl,
  validateRespondentKey,
} from "./features/dayMovements/formSubmission.ts";
import { ApiHttpError, ApiNetworkError } from "./lib/api.ts";

type AccessStatus = "checking" | "ready" | "missing" | "invalid" | "error";

export default function App() {
  const { setColorScheme } = useMantineColorScheme();
  const { t, i18n } = useTranslation();
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("checking");
  const [respondentKey, setRespondentKey] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const isDark = computedColorScheme === "dark";

  const toggleColorScheme = () => {
    setColorScheme(isDark ? "light" : "dark");
  };
  const activeLanguage = i18n.resolvedLanguage?.startsWith("en") ? "en" : "ru";

  const validateAccess = useCallback(async () => {
    const extractedKey = extractRespondentKeyFromUrl(window.location.href);
    if (!extractedKey) {
      setAccessStatus("missing");
      setRespondentKey(null);
      setAccessError(null);
      return;
    }

    setAccessStatus("checking");
    setRespondentKey(extractedKey);
    setAccessError(null);

    try {
      const isValid = await validateRespondentKey(extractedKey);
      if (isValid) {
        setAccessStatus("ready");
      } else {
        setAccessStatus("invalid");
      }
    } catch (error) {
      if (error instanceof ApiNetworkError || error instanceof ApiHttpError) {
        setAccessError(error.message);
      } else {
        setAccessError(t("errors.respondentKeyValidationFailed"));
      }
      setAccessStatus("error");
    }
  }, [t]);

  useEffect(() => {
    void validateAccess();
  }, [validateAccess]);

  const renderAccessGate = () => {
    if (accessStatus === "checking") {
      return (
        <Card withBorder radius="md" p="lg" shadow="xs" data-testid="respondent-key-checking-card">
          <Center>
            <Stack align="center" gap="xs">
              <Loader size="md" />
              <Text size="sm">{t("form.validatingRespondentKey")}</Text>
            </Stack>
          </Center>
        </Card>
      );
    }

    if (accessStatus === "ready" && respondentKey) {
      return <DayMovementsForm respondentKey={respondentKey} />;
    }

    if (accessStatus === "missing") {
      return (
        <Alert
          variant="light"
          color="red"
          icon={<IconAlertCircle size={16} />}
          title={t("errors.respondentKeyMissingTitle")}
          data-testid="respondent-key-missing-alert"
        >
          {t("errors.respondentKeyMissing")}
        </Alert>
      );
    }

    if (accessStatus === "invalid") {
      return (
        <Alert
          variant="light"
          color="red"
          icon={<IconAlertCircle size={16} />}
          title={t("errors.respondentKeyInvalidTitle")}
          data-testid="respondent-key-invalid-alert"
        >
          {t("errors.respondentKeyInvalid")}
        </Alert>
      );
    }

    return (
      <Stack gap="sm">
        <Alert
          variant="light"
          color="red"
          icon={<IconAlertCircle size={16} />}
          title={t("errors.respondentKeyValidationFailedTitle")}
          data-testid="respondent-key-validation-error-alert"
        >
          {accessError ?? t("errors.respondentKeyValidationFailed")}
        </Alert>
        <Group justify="flex-end">
          <Button onClick={() => void validateAccess()} data-testid="retry-respondent-key-btn">
            {t("common.retry")}
          </Button>
        </Group>
      </Stack>
    );
  };

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Container size="md" h="100%">
          <Group h="100%" justify="space-between">
            <Title order={3}>{t("app.title")}</Title>
            <Group gap="xs">
              <Button.Group>
                <Button
                  variant={activeLanguage === "ru" ? "filled" : "light"}
                  size="xs"
                  onClick={() => void i18n.changeLanguage("ru")}
                >
                  RU
                </Button>
                <Button
                  variant={activeLanguage === "en" ? "filled" : "light"}
                  size="xs"
                  onClick={() => void i18n.changeLanguage("en")}
                >
                  EN
                </Button>
              </Button.Group>
              <ActionIcon
                variant="light"
                size="lg"
                onClick={toggleColorScheme}
                aria-label={isDark ? t("app.switchToLight") : t("app.switchToDark")}
                title={isDark ? t("app.lightTheme") : t("app.darkTheme")}
              >
                {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="md" py="xl">
          {renderAccessGate()}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
