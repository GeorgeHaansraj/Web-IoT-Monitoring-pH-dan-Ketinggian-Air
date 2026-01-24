import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with default users...')

  // Create default users
  const defaultUsers = [
    {
      name: 'Pemilik Sawah',
      email: 'sawah_user',
      password: 'password123',
      role: 'sawah',
    },
    {
      name: 'Pemilik Kolam',
      email: 'kolam_user',
      password: 'password123',
      role: 'kolam',
    },
    {
      name: 'Administrator',
      email: 'admin',
      password: 'admin123',
      role: 'admin',
    },
  ]

  for (const userData of defaultUsers) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (existingUser) {
      console.log(`✅ User ${userData.name} already exists`)
      continue
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    })

    console.log(`✅ Created user: ${user.name} (${user.role})`)
  }

  console.log('🎉 Database seeding completed!')
  console.log('\nDefault login credentials:')
  console.log('1. Sawah User - Username: sawah_user, Password: password123')
  console.log('2. Kolam User - Username: kolam_user, Password: password123') 
  console.log('3. Admin User - Username: admin, Password: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })