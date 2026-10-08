import { beforeEach, describe, expect, it, vi } from 'vitest';

// Antes dos imports: o env e o cliente do Supabase são lidos uma vez, na carga do módulo.
const fake = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  return {
    bucketExists: false,
    createBucketError: null as { message: string } | null,
    createBucket: vi.fn(),
    sign: vi.fn(),
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      createBucket: fake.createBucket,
      from: () => ({ createSignedUploadUrl: fake.sign }),
    },
  }),
}));

import { signUpload } from './storage.js';

beforeEach(() => {
  fake.bucketExists = false;
  fake.createBucketError = null;
  fake.createBucket.mockReset();
  fake.sign.mockReset();
  fake.createBucket.mockImplementation(async () => {
    if (fake.createBucketError) return { data: null, error: fake.createBucketError };
    fake.bucketExists = true;
    return { data: {}, error: null };
  });
  fake.sign.mockImplementation(async () =>
    fake.bucketExists
      ? { data: { signedUrl: 'https://example.supabase.co/signed?token=t', token: 't' }, error: null }
      : { data: null, error: { message: 'The related resource does not exist' } },
  );
});

describe('envio com Supabase sem o bucket criado', () => {
  it('cria o bucket público sozinho e entrega o link de envio', async () => {
    const result = await signUpload('avatar', 'image/png', 'a.png', 'user-1');

    expect(result.mode).toBe('signed');
    expect(fake.createBucket).toHaveBeenCalledTimes(1);
    expect(fake.createBucket).toHaveBeenCalledWith(expect.any(String), { public: true });
    expect(fake.sign).toHaveBeenCalledTimes(2);
  });

  it('com o bucket já criado não tenta criar de novo', async () => {
    await signUpload('story', 'image/png', 'a.png', 'user-1');
    fake.createBucket.mockClear();

    await signUpload('avatar', 'image/png', 'b.png', 'user-1');
    expect(fake.createBucket).not.toHaveBeenCalled();
  });

  it('se não conseguir criar o bucket, diz o motivo em vez de esconder', async () => {
    fake.createBucketError = { message: 'permission denied' };

    await expect(signUpload('avatar', 'image/png', 'a.png', 'user-1')).rejects.toThrow(/UPLOAD_FAILED.*permission denied/);
  });
});
