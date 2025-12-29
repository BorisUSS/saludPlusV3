import fs from 'fs';
import path from 'path';

export async function runSqlFile(pool, relPath) {
  const p = path.resolve(process.cwd(), relPath);
  const sql = fs.readFileSync(p, 'utf-8');
  await pool.query(sql);
}
