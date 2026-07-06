#!/usr/bin/env node
import { Command } from 'commander';
import { registerScanCommand } from './commands/scan.js';
import { registerTestUrlCommand } from './commands/test-url.js';
import { registerInitCommand } from './commands/init.js';
import { registerExportConfigCommand } from './commands/export-config.js';
import { registerImportConfigCommand } from './commands/import-config.js';
import { registerDoctorCommand } from './commands/doctor.js';

export function createProgram(): Command {
  const program = new Command();
  program.name('antilink').description('AntiLink Guard OSS command-line tool').version('0.1.0');

  registerScanCommand(program);
  registerTestUrlCommand(program);
  registerInitCommand(program);
  registerExportConfigCommand(program);
  registerImportConfigCommand(program);
  registerDoctorCommand(program);

  return program;
}

const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  await createProgram().parseAsync(process.argv);
}
