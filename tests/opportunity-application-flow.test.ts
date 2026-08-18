import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOpportunitySuccessUrl,
  hasDuplicateOpportunityApplication,
} from '../src/lib/opportunityApplication.ts';

test('blocks duplicate submissions only for the same opportunity and normalized email', () => {
  const applications = [
    { opportunityId: 'opp-1', email: 'student@example.com' },
    { opportunityId: 'opp-2', email: 'Student@Example.com' },
    { opportunityId: 'opp-1', email: 'other@example.com' },
  ];

  assert.equal(hasDuplicateOpportunityApplication(applications, 'opp-1', 'student@example.com'), true);
  assert.equal(hasDuplicateOpportunityApplication(applications, 'opp-1', 'different@example.com'), false);
  assert.equal(hasDuplicateOpportunityApplication(applications, 'opp-2', 'student@example.com'), true);
  assert.equal(hasDuplicateOpportunityApplication(applications, 'opp-3', 'student@example.com'), false);
});

test('uses the current request origin when building the success redirect URL', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

  try {
    const redirect = buildOpportunitySuccessUrl(
      'https://www.awssbgcuup.tech/api/career-applications',
      'opportunity-slug',
    );

    assert.equal(redirect, 'https://www.awssbgcuup.tech/careers/opportunity-slug?submitted=1');
    assert.equal(
      buildOpportunitySuccessUrl('http://localhost:3000/api/career-applications', 'demo-opportunity'),
      'http://localhost:3000/careers/demo-opportunity?submitted=1',
    );
    assert.equal(
      buildOpportunitySuccessUrl(
        'http://localhost:3000/api/career-applications',
        'prod-opportunity',
        new Headers({ host: 'www.awssbgcuup.tech', 'x-forwarded-proto': 'https' }),
      ),
      'https://www.awssbgcuup.tech/careers/prod-opportunity?submitted=1',
    );
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});
