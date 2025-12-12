
import 'dotenv/config';
import db from '../server/db';

async function debugUsers() {
  try {
    console.log('--- Debugging Users ---');
    const users = await db('users').select('*');
    
    if (users.length === 0) {
        console.log('No users found in the database.');
    } else {
        users.forEach(user => {
            console.log(`User ID: ${user.id}`);
            console.log(`  Name: ${user.name}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Auth0 ID: ${user.auth0_id}`);
            console.log(`  Org ID: ${user.organization_id}`);
            console.log('---');
        });
    }

    const orgs = await db('organizations').select('*');
    console.log('\n--- Debugging Organizations ---');
    if (orgs.length === 0) {
        console.log('No organizations found.');
    } else {
        orgs.forEach(org => {
            console.log(`Org ID: ${org.id}`);
            console.log(`  Name: ${org.name}`);
            console.log('---');
        });
    }

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await db.destroy();
  }
}

debugUsers();
