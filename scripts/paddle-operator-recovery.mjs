import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { createNodePostgresTransactionManager } from '../server/platform/nodePostgresAdapter.ts';
import { createPaddleOperatorRecovery } from '../server/billing/paddleOperatorRecovery.ts';
import { requirePaddleConfiguration, readPaddleEnvironment } from '../server/billing/paddleConfiguration.ts';
import { createPaddleProvider } from '../server/billing/paddleProvider.ts';

import { readPrivateOperatorFile as privateFile } from '../server/operations/privateOperatorFiles.ts';

const confirmations = Object.freeze({
  'bind-transaction': 'CONFIRM_SUPPORT_BOUND_ORIGINAL_REQUEST',
  'close-absent': 'CONFIRM_SUPPORT_TERMINAL_NO_TRANSACTION',
  'resolve-review': 'CONFIRM_AUTHORITATIVE_SUBSCRIPTION_STATE',
});
export async function runPaddleOperatorRecovery(args, env = process.env) {
  const [mode, inputPath, outputOrEvidencePath, confirmation] = args;
  if (!['prepare','apply'].includes(mode) || args.length !== (mode === 'prepare' ? 3 : 4) || !isAbsolute(outputOrEvidencePath ?? '')) throw Error('INVALID_ARGUMENTS');
  const input = JSON.parse((await privateFile(inputPath, 65536)).toString('utf8'));
  if (mode === 'apply' && (!Object.hasOwn(confirmations, input.action) || confirmation !== confirmations[input.action])) throw Error('CONFIRMATION_REQUIRED');
  const evidence = mode === 'apply' ? await privateFile(outputOrEvidencePath, 1048576) : null;
  const url = new URL(env.PADDLE_RECOVERY_DATABASE_URL ?? '');
  if (!['postgres:','postgresql:'].includes(url.protocol) || !url.hostname || !url.username || url.hash ||
    [...url.searchParams.keys()].some(k => k !== 'sslmode') || url.searchParams.getAll('sslmode').length > 1 ||
    (!['127.0.0.1','localhost','[::1]'].includes(url.hostname) && url.searchParams.get('sslmode') !== 'verify-full')) throw Error('DATABASE_CONFIGURATION_REQUIRED');
  // Lazy and GET-only: absence closure does not pretend that a failed GET proves
  // absence, and does not require provider credentials. Evidence is human reviewed.
  let provider;
  function getProvider() {
    if (!provider) {
      const config = requirePaddleConfiguration(env === process.env ? readPaddleEnvironment() : env);
      if (!config) throw Error('PROVIDER_CONFIGURATION_REQUIRED');
      provider = createPaddleProvider(config);
    }
    return provider;
  }
  const pool = new pg.Pool({connectionString: url.href, max: 1, connectionTimeoutMillis: 10000, statement_timeout: 15000, lock_timeout: 5000});
  try {
    const service = createPaddleOperatorRecovery({transactions: createNodePostgresTransactionManager(pool), provider: {
      getTransaction: (id, plan) => getProvider().getTransaction(id, plan),
      getSubscription: (id, plan) => getProvider().getSubscription(id, plan),
    }});
    if (mode === 'prepare') {
      const proposal = await service.prepare(input);
      await writeFile(outputOrEvidencePath, `${JSON.stringify(proposal, null, 2)}\n`, {flag: 'wx', mode: 0o600});
      return {outcome: 'prepared'};
    }
    return await service.apply(input, createHash('sha256').update(evidence).digest('hex'));
  } finally { await pool.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(`${JSON.stringify(await runPaddleOperatorRecovery(process.argv.slice(2)))}\n`); }
  catch { process.stderr.write('PADDLE_OPERATOR_RECOVERY_BLOCKED: check private input, authority, freshness and provider evidence. No POST is issued.\n'); process.exitCode = 1; }
}
