import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { URL } from 'url';

export interface SafeFileResponse {
  name: string;
  url: string;
  content: string;
}

@Injectable()
export class SafeFilesService {
  async add(name: string, url: string): Promise<SafeFileResponse> {
    this.validateTrustedUrl(url);
    const content = await this.fetchContent(url);
    return { name, url, content };
  }

  private validateTrustedUrl(url: string): void {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      throw new Error('Invalid URL');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Invalid URL');
    }

    const hostname = parsed.hostname.toLowerCase();
    const blockedHosts = new Set([
      'localhost',
      '127.0.0.1',
      '::1',
      '169.254.169.254'
    ]);

    if (blockedHosts.has(hostname) || hostname.endsWith('.local')) {
      throw new Error('Invalid URL');
    }
  }

  private async fetchContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, { responseType: 'text' });
      return typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);
    } catch {
      return '';
    }
  }
}
