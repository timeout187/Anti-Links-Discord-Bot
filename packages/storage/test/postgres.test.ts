import { PostgresStorageAdapter } from '../src/adapters/postgres.js';
import { runStorageAdapterContractTests } from './contract.js';

const connectionString =
  process.env.POSTGRES_TEST_URL ??
  'postgres://postgres:postgres@localhost:5432/antilink_guard_test';

runStorageAdapterContractTests(
  'postgres',
  async () => new PostgresStorageAdapter({ connectionString }),
);
