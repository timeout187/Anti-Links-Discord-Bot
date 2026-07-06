import { SqliteStorageAdapter } from '../src/adapters/sqlite.js';
import { runStorageAdapterContractTests } from './contract.js';

runStorageAdapterContractTests(
  'sqlite',
  async () => new SqliteStorageAdapter({ filename: ':memory:' }),
);
