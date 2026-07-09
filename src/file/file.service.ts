import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { R_OK } from 'constants';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly allowedRoot = path.resolve(process.cwd());

  private isSafeLocalPath(file: string): boolean {
    if (typeof file !== 'string' || file.length === 0) {
      return false;
    }

    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(file) || file.startsWith('//')) {
      return false;
    }

    const normalized = path.normalize(file);
    const resolved = path.resolve(this.allowedRoot, normalized);
    return (
      !normalized.startsWith('..') &&
      !normalized.includes(`..${path.sep}`) &&
      resolved.startsWith(this.allowedRoot + path.sep)
    );
  }

  async getFile(file: string): Promise<Readable> {
    this.logger.log(`Reading file: ${file}`);

    if (!this.isSafeLocalPath(file)) {
      throw new Error('Invalid file path');
    }

    const resolvedFile = path.resolve(this.allowedRoot, path.normalize(file));

    await fs.promises.access(resolvedFile, R_OK);

    return fs.createReadStream(resolvedFile);
  }

  async deleteFile(file: string): Promise<boolean> {
    if (!this.isSafeLocalPath(file)) {
      throw new Error('Invalid file path');
    }

    const resolvedFile = path.resolve(this.allowedRoot, path.normalize(file));
    await fs.promises.unlink(resolvedFile);
    return true;
  }
}
