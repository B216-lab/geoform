import { expect, test } from "@playwright/test";

const HOME_ADDRESS_QUERY = "Lenina";
const ARRIVAL_ADDRESS_QUERY = "Karl";

test("submits the day movements form successfully", async ({ page }) => {
  await page.route("**/suggest/address**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("query") ?? "";
    const normalizedQuery = query.toLowerCase();

    const suggestion = normalizedQuery.includes("karl")
      ? {
          value: "Russia, Irkutsk, Karl Marx street, 10",
          unrestricted_value: "Russia, Irkutsk, Karl Marx street, 10",
          data: {
            house: "10",
            geo_lat: "52.2871",
            geo_lon: "104.2791",
          },
        }
      : {
          value: "Russia, Irkutsk, Lenina street, 1",
          unrestricted_value: "Russia, Irkutsk, Lenina street, 1",
          data: {
            house: "1",
            geo_lat: "52.2869",
            geo_lon: "104.3050",
          },
        };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ suggestions: [suggestion] }),
    });
  });

  await page.goto("/");

  await page.getByTestId("birthday-input").fill("1990-01-01");

  await page.getByTestId("gender-select").click();
  await page.getByRole("option", { name: "male" }).click();

  await page.getByTestId("social-status-select").click();
  await page.getByRole("option", { name: "employed" }).click();

  await page.getByTestId("home-address-input").fill(HOME_ADDRESS_QUERY);
  await expect(page.getByRole("option", { name: /Lenina street, 1/ })).toBeVisible();
  await page.getByRole("option", { name: /Lenina street, 1/ }).click();

  await page.getByTestId("next-step-btn").click();
  await page.getByTestId("movements-date-input").fill("2026-03-20");

  await page.getByTestId("movement-0-departure-time").locator("input").fill("08:00");
  await page.getByTestId("movement-0-departure-place").click();
  await page.getByRole("option").first().click();

  await page.getByTestId("movement-0-arrival-time").locator("input").fill("09:00");
  await page.getByTestId("movement-0-arrival-place").click();
  await page.getByRole("option").nth(1).click();

  await page.getByTestId("movement-0-arrival-address").fill(ARRIVAL_ADDRESS_QUERY);
  await expect(page.getByRole("option", { name: /Karl Marx street, 10/ })).toBeVisible();
  await page.getByRole("option", { name: /Karl Marx street, 10/ }).click();

  await page.getByTestId("add-movement-btn").click();

  await expect(page.getByTestId("movement-1-arrival-time")).toBeVisible();
  await page.getByTestId("movement-1-arrival-time").locator("input").fill("10:00");
  await page.getByTestId("movement-1-arrival-place").click();
  await page.getByRole("option").first().click();

  await page.getByTestId("submit-btn").click();

  await expect(page.getByTestId("success-screen")).toBeVisible();
  await expect(page.getByTestId("success-title")).toBeVisible();
});
