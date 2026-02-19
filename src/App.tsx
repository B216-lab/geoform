import { DayMovementsForm } from "@/features/dayMovements/DayMovementsForm";
import { AppShell, Container, Title } from "@mantine/core";

export default function App() {
  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Container size="md" h="100%" style={{ display: "flex", alignItems: "center" }}>
          <Title order={3}>Транспортное анкетирование</Title>
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
