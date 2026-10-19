import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true, quiet: true });

export const PORT = Number(process.env.PORT) || 5000;
export const rootPath = rootDir;
