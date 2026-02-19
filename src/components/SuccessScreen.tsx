import { Button, Card, Center, Stack, Text, ThemeIcon, Title } from "@mantine/core";

interface SuccessScreenProps {
  onFillAnother: () => void;
}

export function SuccessScreen({ onFillAnother }: SuccessScreenProps) {
  return (
    <Center py={48} data-testid="success-screen">
      <Card withBorder radius="md" shadow="sm" maw={720} w="100%" p="xl">
        <Stack align="center" gap="md">
          <ThemeIcon
            radius="xl"
            size={64}
            color="green"
            variant="light"
            data-testid="success-icon-container"
          >
            ✓
          </ThemeIcon>
          <Stack align="center" gap={4}>
            <Title order={2} data-testid="success-title">
              Спасибо!
            </Title>
            <Text c="dimmed" ta="center" data-testid="success-message">
              Ваша форма успешно отправлена. Благодарим за участие в опросе.
            </Text>
          </Stack>
          <Button onClick={onFillAnother} data-testid="fill-another-form-button">
            Заполнить еще одну форму
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}
