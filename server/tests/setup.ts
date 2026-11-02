import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Use a test-specific database by creating a temporary schema
const prismaDir = path.resolve(__dirname, '..', 'prisma');
const originalSchema = path.join(prismaDir, 'schema.prisma');
const testSchema = path.join(prismaDir, 'schema.test.prisma');

// Create test schema with test.db
const schemaContent = fs.readFileSync(originalSchema, 'utf-8');
const testSchemaContent = schemaContent.replace(
  'url      = "file:./dev.db"',
  'url      = "file:./test.db"'
);
fs.writeFileSync(testSchema, testSchemaContent);

try {
  execSync(`npx prisma db push --force-reset --accept-data-loss --schema="${testSchema}"`, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  });
  console.log('Test database ready');
} catch (e: any) {
  console.error('Failed to setup test database:', e.stderr?.toString() || e.message);
} finally {
  // Clean up test schema
  if (fs.existsSync(testSchema)) {
    fs.unlinkSync(testSchema);
  }
}