import crypto from 'node:crypto';
import { Pool, PoolClient } from 'pg';

type ApiKey = {
  apiKey: string;
  keyId: string;
  keyHash: string;
  encryptedKey: string;
};

type GeneratedApiKeys = {
  dev: ApiKey;
  prod: ApiKey;
};

export class ApiKeysRepository {
  constructor(private db: Pool | PoolClient) {}

  generateApiKey(environment: 'dev' | 'prod'): ApiKey {
    const keyId = crypto.randomBytes(6).toString('base64url');
    const secret = crypto.randomBytes(32).toString('base64url');

    const apiKey = `obs_${environment}_${keyId}_${secret}`;

    const keyHash = crypto
      .createHmac('sha256', process.env.API_KEY_PEPPER!)
      .update(apiKey)
      .digest('hex');

    const encryptedKey = this.encryptApiKey(apiKey);

    return {
      apiKey,
      keyId,
      keyHash,
      encryptedKey,
    };
  }

  generateApiKeys(): GeneratedApiKeys {
    return {
      dev: this.generateApiKey('dev'),
      prod: this.generateApiKey('prod'),
    };
  }

  private encryptApiKey(apiKey: string): string {
    const encryptionKeyHex = process.env.API_KEY_ENCRYPTION_KEY;
    if (!encryptionKeyHex) {
      throw new Error('API_KEY_ENCRYPTION_KEY is not set');
    }

    const key = Buffer.from(encryptionKeyHex, 'hex');
    if (key.length !== 32) {
      throw new Error('API_KEY_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([
      cipher.update(apiKey, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      content: encrypted.toString('hex'),
      tag: authTag.toString('hex'),
    });
  }

  decryptApiKey(encryptedKey: string): string {
    const encryptionKeyHex = process.env.API_KEY_ENCRYPTION_KEY;
    if (!encryptionKeyHex) {
      throw new Error('API_KEY_ENCRYPTION_KEY is not set');
    }

    const key = Buffer.from(encryptionKeyHex, 'hex');
    if (key.length !== 32) {
      throw new Error('API_KEY_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    }

    const payload = JSON.parse(encryptedKey) as {
      iv: string;
      content: string;
      tag: string;
    };

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(payload.iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.content, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
