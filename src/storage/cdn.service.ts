import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CdnService {
  private readonly logger = new Logger(CdnService.name);
  private readonly domain: string;
  private readonly keyPairId: string;
  private readonly privateKey: string;
  private readonly enabled: boolean;

  constructor() {
    this.domain = process.env.CDN_DOMAIN || '';
    this.keyPairId = process.env.CDN_KEY_PAIR_ID || '';
    this.privateKey = process.env.CDN_PRIVATE_KEY || '';
    this.enabled = !!(this.domain && this.keyPairId && this.privateKey);

    if (this.enabled) {
      this.logger.log(`CDN enabled: ${this.domain}`);
    } else {
      this.logger.log('CDN not configured — serving files directly');
    }
  }

  getSignedUrl(s3Key: string, expiresInSeconds = 900): string {
    if (!this.enabled) return '';

    const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const policy = JSON.stringify({
      Statement: [
        {
          Resource: `https://${this.domain}/${s3Key}`,
          Condition: { DateLessThan: { 'AWS:EpochTime': expiry } },
        },
      ],
    });

    const base64Policy = Buffer.from(policy).toString('base64').replace(/=+$/, '');
    const signer = crypto.createSign('RSA-SHA1');
    signer.update(policy);
    const signature = signer
      .sign(this.privateKey, 'base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `https://${this.domain}/${s3Key}?Expires=${expiry}&Signature=${signature}&Key-Pair-Id=${this.keyPairId}`;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
