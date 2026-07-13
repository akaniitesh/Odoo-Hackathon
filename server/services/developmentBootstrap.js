const bcrypt = require('bcryptjs');
const User = require('../models/User');

const demoUsers = [
  { name: 'Fleet Manager', email: 'manager@transitops.com', role: 'FleetManager' },
  { name: 'Dispatcher', email: 'dispatcher@transitops.com', role: 'Dispatcher' },
  { name: 'Safety Officer', email: 'safety@transitops.com', role: 'SafetyOfficer' },
  { name: 'Financial Analyst', email: 'finance@transitops.com', role: 'FinancialAnalyst' }
];

async function ensureInMemoryDemoUsers() {
  const existingUsers = await User.find({ email: { $in: demoUsers.map((user) => user.email) } })
    .select('email')
    .lean();
  const existingEmails = new Set(existingUsers.map((user) => user.email));
  const missingUsers = demoUsers.filter((user) => !existingEmails.has(user.email));

  if (missingUsers.length === 0) return;

  const passwordHash = await bcrypt.hash('admin123', 10);
  await User.insertMany(missingUsers.map((user) => ({
    ...user,
    passwordHash,
    accountStatus: 'Active'
  })));
  console.log(`Seeded ${missingUsers.length} development demo user(s).`);
}

module.exports = { ensureInMemoryDemoUsers };

