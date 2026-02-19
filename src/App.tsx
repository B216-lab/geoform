import { DayMovementsForm } from "@/features/dayMovements/DayMovementsForm";
import {
  ActionIcon,
  AppShell,
  Container,
  Group,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

export default function App() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const isDark = computedColorScheme === "dark";

  const toggleColorScheme = () => {
    setColorScheme(isDark ? "light" : "dark");
  };

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Container size="md" h="100%">
          <Group h="100%" justify="space-between">
            <Title order={3}>Транспортное анкетирование</Title>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={toggleColorScheme}
              aria-label={isDark ? "Включить светлую тему" : "Включить темную тему"}
              title={isDark ? "Светлая тема" : "Темная тема"}
            >
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
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
