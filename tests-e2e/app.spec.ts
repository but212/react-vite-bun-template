import { expect, test } from '@playwright/test';

test('should display the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('템플릿 페이지');
});

test('should navigate to the GraphQL page and display launches', async ({ page }) => {
  await page.route('https://spacex.land/graphql/', async route => {
    const json = {
      data: {
        launches: [
          {
            id: '1',
            mission_name: 'Starlink-15 (v1.0)',
            launch_date_local: '2020-10-24T11:31:00-04:00',
            launch_site: {
              site_name_long: 'Cape Canaveral Air Force Station Space Launch Complex 40',
            },
          },
        ],
      },
    };
    await route.fulfill({ json });
  });

  await page.goto('/');

  await page.getByRole('link', { name: 'GraphQL' }).click();

  await expect(page).toHaveURL('/graphql');

  await expect(page.locator('h2')).toContainText('SpaceX Launches');
});

test('should display not found page for unknown routes', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  await expect(page.locator('h2')).toContainText('페이지를 찾을 수 없습니다');
});
