import db from './db.js';
try {
    await db.initializeDbConnection({ migrate: true, allowBalanceMigration: true });
    const appUser = process.env.DB_APP_USER;
    const database = process.env.DB_NAME || 'mugenbunko';
    if (appUser) {
        if (!/^[a-zA-Z0-9_]{1,32}$/.test(appUser) || appUser === 'root') throw new Error('Invalid DB_APP_USER');
        await db.query(`REVOKE ALL PRIVILEGES ON \`${database}\`.* FROM '${appUser}'@'%'`);
        await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${database}\`.* TO '${appUser}'@'%'`);
    }
    console.log('Schema migration completed without sample data or default admin.');
} finally { await db.closeDbConnection(); }
