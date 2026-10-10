// Explicit startup flag permits both direct test runs and the hosted boot entrypoint.
process.env.K791_BOOT='1'
if(process.env.DATABASE_URL){require('./postgres.cjs')}
else{require('./index.cjs')}
