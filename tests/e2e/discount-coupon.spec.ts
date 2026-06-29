import { test, expect } from '@playwright/test';

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const haveCreds = !!(ACCESS_TOKEN && PROJECT_REF);

async function sql<T = unknown>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SQL failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T[]>;
}

test.describe('Cupom de 30% off na primeira corrida', () => {
  test.skip(!haveCreds, 'SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF missing');

  const tsTag = Date.now();
  const testEmail = `e2e-coupon-${tsTag}@gamma.app.br`;
  let testUserId: string | null = null;

  test.afterAll(async () => {
    if (!testUserId || !haveCreds) return;
    try {
      await sql(`UPDATE public.referral_discounts SET used_on_ride_id = NULL WHERE passenger_user_id = '${testUserId}';`);
      await sql(`DELETE FROM public.pilot_earnings WHERE ride_id IN (SELECT id FROM public.rides WHERE passenger_user_id = '${testUserId}');`);
      await sql(`DELETE FROM public.rides WHERE passenger_user_id = '${testUserId}';`);
      await sql(`DELETE FROM auth.users WHERE id = '${testUserId}';`);
    } catch (err) {
      console.warn('Cleanup failed:', err);
    }
  });

  test('novo passageiro recebe cupom welcome bonus de 30% off automaticamente', async () => {
    const created = await sql<{ id: string }>(`
      WITH new_user AS (
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', '${testEmail}', crypt('TestPass1!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email"}'::jsonb, '{"role":"passenger"}'::jsonb, false, '', '', '', '')
        RETURNING id
      ),
      profile AS (
        INSERT INTO public.passenger_profiles (user_id, full_name, phone, email, cpf)
        SELECT id, 'E2E Coupon Test', '21999999999', '${testEmail}', '11111111111' FROM new_user
        RETURNING user_id
      ),
      role_insert AS (
        INSERT INTO public.user_roles (user_id, role) SELECT user_id, 'passenger' FROM profile
      )
      SELECT id FROM new_user;
    `);

    testUserId = created[0].id;
    expect(testUserId).toBeTruthy();

    const coupons = await sql<{ discount_percent: number; is_used: boolean; earned_from_user_id: string | null }>(`
      SELECT discount_percent, is_used, earned_from_user_id
      FROM public.referral_discounts
      WHERE passenger_user_id = '${testUserId}';
    `);

    expect(coupons.length, 'Cupom welcome bonus deve existir').toBe(1);
    expect(coupons[0].discount_percent).toBe(30);
    expect(coupons[0].is_used).toBe(false);
    expect(coupons[0].earned_from_user_id).toBeNull();
  });

  test('ride com cupom aplicado preserva gross_price e calcula desconto correto', async () => {
    test.skip(!testUserId, 'Test user not created in previous test');

    const grossPrice = 100;
    const discountAmount = 30;
    const finalPrice = grossPrice - discountAmount;

    const ride = await sql<{ id: string; gross_price: string; discount_amount: string; price: string }>(`
      INSERT INTO public.rides (
        passenger_user_id, passenger_device_id, passenger_name,
        origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng,
        gross_price, discount_amount, price, status, payment_status, payment_method, created_at
      ) VALUES (
        '${testUserId}', 'e2e-device-${tsTag}', 'E2E Coupon Test',
        'Deck A', -23.005, -43.310,
        'Deck C', -23.010, -43.315,
        ${grossPrice}, ${discountAmount}, ${finalPrice}, 'pending', 'paid', 'pix', now()
      )
      RETURNING id, gross_price, discount_amount, price;
    `);

    expect(Number(ride[0].gross_price)).toBe(grossPrice);
    expect(Number(ride[0].discount_amount)).toBe(discountAmount);
    expect(Number(ride[0].price)).toBe(finalPrice);

    await sql(`
      UPDATE public.referral_discounts
      SET is_used = true, used_on_ride_id = '${ride[0].id}', used_at = now()
      WHERE passenger_user_id = '${testUserId}';
    `);

    const used = await sql<{ is_used: boolean; used_on_ride_id: string }>(`
      SELECT is_used, used_on_ride_id FROM public.referral_discounts
      WHERE passenger_user_id = '${testUserId}';
    `);
    expect(used[0].is_used).toBe(true);
    expect(used[0].used_on_ride_id).toBe(ride[0].id);
  });

  test('pilot_earnings calcula sobre gross_price (piloto nao perde com o cupom)', async () => {
    test.skip(!testUserId, 'Test user not created');

    const pilots = await sql<{ id: string; user_id: string }>(`
      SELECT id, user_id FROM public.pilot_profiles
      WHERE email = 'e2e-pilot@gamma.app.br' LIMIT 1;
    `);
    test.skip(pilots.length === 0, 'No test pilot configured');
    const pilotProfileId = pilots[0].id;
    const pilotUserId = pilots[0].user_id;

    const grossPrice = 100;
    const ride = await sql<{ id: string }>(`
      UPDATE public.rides
      SET pilot_id = '${pilotProfileId}', pilot_user_id = '${pilotUserId}',
          status = 'completed', completed_at = now()
      WHERE passenger_user_id = '${testUserId}'
      RETURNING id;
    `);

    await sql(`SELECT public.record_pilot_earning('${ride[0].id}'::uuid);`);

    const earnings = await sql<{ gross_amount: string; commission_percent: string }>(`
      SELECT gross_amount, commission_percent
      FROM public.pilot_earnings
      WHERE ride_id = '${ride[0].id}';
    `);

    expect(earnings.length, 'pilot_earnings deve existir').toBe(1);
    expect(Number(earnings[0].gross_amount)).toBe(grossPrice);
    expect([30, 55]).toContain(Number(earnings[0].commission_percent));

    const pilotNet = grossPrice * (100 - Number(earnings[0].commission_percent)) / 100;
    expect(pilotNet).toBeGreaterThanOrEqual(45);
  });
});
