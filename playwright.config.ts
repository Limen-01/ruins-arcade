import { defineConfig } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
export default defineConfig({testDir:'tests/browser',outputDir:join(tmpdir(),'ruins-arcade-playwright'),use:{baseURL:'http://127.0.0.1:4173',channel:'chrome',viewport:{width:390,height:844},screenshot:'only-on-failure'}});
