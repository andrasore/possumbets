import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

export const REPO_ROOT = path.resolve(__dirname, '..');
export const PROJECT = 'betting-e2e';

export const COMPOSE_FILES = [
  '-f', 'docker-compose.yml',
  '-f', 'docker-compose.e2e.yml',
];

export function compose(args: string[]): void {
  const result = spawnSync(
    'docker',
    ['compose', '-p', PROJECT, ...COMPOSE_FILES, ...args],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );
  if (result.status !== 0) {
    throw new Error(`docker compose ${args.join(' ')} exited with ${result.status}`);
  }
}
