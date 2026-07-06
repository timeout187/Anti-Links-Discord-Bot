import { MemoryStorageAdapter } from '../src/adapters/memory.js';
import { runStorageAdapterContractTests } from './contract.js';

runStorageAdapterContractTests('memory', async () => new MemoryStorageAdapter());
