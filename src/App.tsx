import { DayMovementsForm } from "./features/dayMovements/DayMovementsForm.tsx";
import {
  ActionIcon,
  AppShell,
  Button,
  Container,
  Group,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export default function App() {
  const { setColorScheme } = useMantineColorScheme();
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const isDark = computedColorScheme === "dark";

  const toggleColorScheme = () => {
    setColorScheme(isDark ? "light" : "dark");
  };
  const activeLanguage = i18n.resolvedLanguage?.startsWith("en") ? "en" : "ru";

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
                aria-label={isDark
                  ? t("app.switchToLight")
                  : t("app.switchToDark")}
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
          <DayMovementsForm />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
