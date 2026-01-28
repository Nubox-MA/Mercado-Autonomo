import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Limpando condomínios antigos...')

  // Buscar todos os condomínios
  const allNeighborhoods = await prisma.neighborhood.findMany()
  console.log(`📋 Encontrados ${allNeighborhoods.length} condomínios no banco`)

  // Desativar todos os condomínios que não são "Condomínio 1" ou "Condomínio 2"
  const toDeactivate = allNeighborhoods.filter(
    (n) => n.name !== 'Condomínio 1' && n.name !== 'Condomínio 2'
  )

  if (toDeactivate.length > 0) {
    console.log(`🔒 Desativando ${toDeactivate.length} condomínios antigos...`)
    for (const neighborhood of toDeactivate) {
      await prisma.neighborhood.update({
        where: { id: neighborhood.id },
        data: { active: false },
      })
      console.log(`   - Desativado: ${neighborhood.name}`)
    }
  }

  // Garantir que Condomínio 1 e Condomínio 2 existam e estejam ativos
  const condominio1 = await prisma.neighborhood.upsert({
    where: { name: 'Condomínio 1' },
    update: { active: true },
    create: {
      name: 'Condomínio 1',
      deliveryFee: 0,
      active: true,
      photoUrl: null,
    },
  })
  console.log('✅ Condomínio 1:', condominio1.name, condominio1.active ? '(ativo)' : '(inativo)')

  const condominio2 = await prisma.neighborhood.upsert({
    where: { name: 'Condomínio 2' },
    update: { active: true },
    create: {
      name: 'Condomínio 2',
      deliveryFee: 0,
      active: true,
      photoUrl: null,
    },
  })
  console.log('✅ Condomínio 2:', condominio2.name, condominio2.active ? '(ativo)' : '(inativo)')

  // Listar condomínios ativos
  const activeNeighborhoods = await prisma.neighborhood.findMany({
    where: { active: true },
  })
  console.log(`\n📊 Total de condomínios ativos: ${activeNeighborhoods.length}`)
  activeNeighborhoods.forEach((n) => {
    console.log(`   - ${n.name}`)
  })

  console.log('\n🎉 Limpeza concluída!')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
