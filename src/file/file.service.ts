import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { R_OK } from 'constants';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly allowedRoot = path.resolve(process.cwd());

  private resolveSafePath(file: string): string {
    if (typeof file !== 'string' || file.length === 0) {
      throw new Error('Invalid file path');
    }

    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(file) || file.startsWith('//') || path.isAbsolute(file)) {
      throw new Error('Invalid file path');
    }

    const normalized = path.normalize(file);
    if (normalized.startsWith('..') || normalized.includes(`..${path.sep}`)) {
      throw new Error('Invalid file path');
    }

    const resolved = path.resolve(this.allowedRoot, normalized);
    if (!resolved.startsWith(this.allowedRoot + path.sep)) {
      throw new Error('Invalid file path');
    }

    return resolved;
  }

  async getFile(file: string): Promise<Readable> {
    const resolvedFile = this.resolveSafePath(file);
    this.logger.log(`Reading file: ${resolvedFile}`);

    await fs.promises.access(resolvedFile, R_OK);

    return fs.createReadStream(resolvedFile);
  }

  async deleteFile(file: string): Promise<boolean> {
    const resolvedFile = this.resolveSafePath(file);
    await fs.promises.unlink(resolvedFile);
    return true;
  }
}
