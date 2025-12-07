import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });


async function main() {
  //change to reference a table in your schema
  const val = await prisma.user.findMany({
    take: 10,
  });
  console.log(val);
}

main();