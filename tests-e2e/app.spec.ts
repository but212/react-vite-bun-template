import { expect, test } from '@playwright/test';

// 홈페이지 테스트
test('should display the home page', async ({ page }) => {
  await page.goto('/');

  // "템플릿 페이지"라는 텍스트가 포함된 h1 태그가 있는지 확인
  await expect(page.locator('h1')).toContainText('템플릿 페이지');
});

// GraphQL 페이지 테스트
test('should navigate to the GraphQL page and display launches', async ({ page }) => {
  // GraphQL 요청을 가로채서 모의 응답을 반환합니다.
  await page.route('https://spacex.land/graphql/', async route => {
    const json = {
      data: {
        launches: [
          {
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

  // "GraphQL" 링크를 클릭
  await page.getByRole('link', { name: 'GraphQL' }).click();

  // URL이 /graphql로 변경되었는지 확인
  await expect(page).toHaveURL('/graphql');

  // "SpaceX Launches"라는 텍스트가 포함된 h2 태그가 있는지 확인
  // API 응답 시간을 고려하여 timeout을 15초로 설정
  await expect(page.locator('h2')).toContainText('SpaceX Launches');
});

// 404 페이지 테스트
test('should display not found page for unknown routes', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');

  // "페이지를 찾을 수 없습니다"라는 텍스트가 있는지 확인
  await expect(page.locator('h2')).toContainText('페이지를 찾을 수 없습니다');
});
