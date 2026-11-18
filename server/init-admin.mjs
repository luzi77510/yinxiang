import { createStore, randomToken } from './store.mjs';
import { writeFileSync } from 'node:fs';
const store = createStore();
const username = process.env.ADMIN_USERNAME || 'admin';
const supplied = process.env.ADMIN_PASSWORD;
const password = supplied || randomToken().slice(0, 22);
try {
  store.admin(username, password);
  if (!supplied) {
    writeFileSync(
      'first-login.txt',
      `管理地址 http://localhost:${process.env.PORT || 5180}/#/admin\n账号 ${username}\n密码 ${password}\n请保管在本机，勿上传 GitHub。\n`,
      { mode: 0o600 },
    );
    console.log('管理员已创建；随机密码已写入本机 first-login.txt（Git 已忽略）。');
  } else console.log('管理员已创建。');
} finally {
  store.db.close();
}
