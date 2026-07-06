import { describe, it } from 'vitest';
import { MysqlStorageAdapter } from '../src/adapters/mysql.js';
import { runStorageAdapterContractTests } from './contract.js';

const uri = process.env.MYSQL_TEST_URL;

if (uri) {
  runStorageAdapterContractTests('mysql', async () => new MysqlStorageAdapter({ uri }));
} else {
  describe('StorageAdapter contract: mysql', () => {
    it.skip('set MYSQL_TEST_URL to a reachable MySQL/MariaDB instance to run these tests', () => {});
  });
}
