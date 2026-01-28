import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar admin padrão
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { cpf: 'admin' },
    update: {},
    create: {
      cpf: 'admin',
      name: 'Administrador',
      role: 'ADMIN',
      password: adminPassword,
    },
  })
  console.log('✅ Admin criado:', admin.name)
  console.log('🔑 Login: admin / Senha: admin123')

  // Criar categorias
  const categories = [
    { name: 'Bebidas', description: 'Refrigerantes, sucos e águas' },
    { name: 'Snacks', description: 'Salgadinhos e petiscos' },
    { name: 'Doces', description: 'Chocolates e guloseimas' },
    { name: 'Higiene', description: 'Produtos de higiene pessoal' },
    { name: 'Limpeza', description: 'Produtos de limpeza' },
  ]

  const createdCategories = []
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
    createdCategories.push(category)
    console.log('✅ Categoria criada:', category.name)
  }

  // Criar produtos de exemplo
  const products = [
    {
      name: 'Coca-Cola 2L',
      description: 'Refrigerante Coca-Cola 2 litros',
      price: 8.99,
      stock: 24,
      categoryId: createdCategories[0].id,
      imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
    },
    {
      name: 'Água Mineral 500ml',
      description: 'Água mineral sem gás',
      price: 2.50,
      stock: 48,
      categoryId: createdCategories[0].id,
    },
    {
      name: 'Suco de Laranja 1L',
      description: 'Suco natural de laranja',
      price: 6.99,
      stock: 12,
      categoryId: createdCategories[0].id,
    },
    {
      name: 'Doritos 150g',
      description: 'Salgadinho sabor queijo nacho',
      price: 7.99,
      stock: 15,
      categoryId: createdCategories[1].id,
    },
    {
      name: 'Ruffles 96g',
      description: 'Batata frita ondulada',
      price: 6.49,
      stock: 20,
      categoryId: createdCategories[1].id,
    },
    {
      name: 'Chocolate Lacta 90g',
      description: 'Chocolate ao leite',
      price: 5.99,
      stock: 30,
      categoryId: createdCategories[2].id,
    },
    {
      name: 'Bis Xtra 45g',
      description: 'Biscoito wafer coberto com chocolate',
      price: 3.99,
      stock: 25,
      categoryId: createdCategories[2].id,
    },
    {
      name: 'Sabonete Dove 90g',
      description: 'Sabonete em barra hidratante',
      price: 3.49,
      stock: 18,
      categoryId: createdCategories[3].id,
    },
    {
      name: 'Shampoo Pantene 200ml',
      description: 'Shampoo restauração',
      price: 12.99,
      stock: 8,
      categoryId: createdCategories[3].id,
    },
    {
      name: 'Detergente Ypê 500ml',
      description: 'Detergente líquido neutro',
      price: 2.99,
      stock: 15,
      categoryId: createdCategories[4].id,
    },
  ]

  for (const prod of products) {
    const product = await prisma.product.create({
      data: prod,
    })
    console.log('✅ Produto criado:', product.name)
  }

  // Criar condomínios iniciais (apenas Condomínio 1 e Condomínio 2)
  console.log('📍 Cadastrando condomínios...')
  
  // Desativar todos os outros condomínios que não são Condomínio 1 ou 2
  await prisma.neighborhood.updateMany({
    where: {
      name: {
        notIn: ['Condomínio 1', 'Condomínio 2'],
      },
    },
    data: {
      active: false,
    },
  })
  
  const condominio1 = await prisma.neighborhood.upsert({
    where: { name: 'Condomínio 1' },
    update: { active: true }, // Garantir que está ativo
    create: {
      name: 'Condomínio 1',
      deliveryFee: 0, // Não há mais taxa de entrega
      active: true,
      photoUrl: null, // Pode ser adicionada depois pelo admin
    }
  })
  console.log('✅ Condomínio criado:', condominio1.name)

  const condominio2 = await prisma.neighborhood.upsert({
    where: { name: 'Condomínio 2' },
    update: { active: true }, // Garantir que está ativo
    create: {
      name: 'Condomínio 2',
      deliveryFee: 0, // Não há mais taxa de entrega
      active: true,
      photoUrl: null, // Pode ser adicionada depois pelo admin
    }
  })
  console.log('✅ Condomínio criado:', condominio2.name)
  
  console.log('✅ Condomínios cadastrados!')

  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

