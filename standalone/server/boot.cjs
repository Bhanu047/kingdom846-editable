// Select durable PostgreSQL only after Neon DATABASE_URL is configured.
// Until then, retain the existing SQLite test instance without touching 846.
if(process.env.DATABASE_URL){require('./postgres.cjs')}
else{require('./index.cjs')}
