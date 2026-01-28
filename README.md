# 🛒 Mercado Autônomo - Catálogo Digital

Sistema completo de catálogo digital para mercado autônomo em condomínio. Permite que moradores consultem produtos disponíveis, preços e estoque ANTES de ir ao contêiner, além de criar listas de compras.

## 📋 Funcionalidades

### Para Moradores
- ✅ Login simples com CPF e nome (cadastro automático)
- 📱 Catálogo responsivo de produtos com fotos e preços
- 🔍 Busca e filtros por categoria
- 🛒 Lista de compras (carrinho sem reserva)
- 📊 Visualização de estoque disponível
- ⚠️ Avisos sobre disponibilidade

### Para Administradores
- 🔐 Login com CPF e senha
- 📊 Dashboard com estatísticas
- ➕ Adicionar/editar/remover produtos
- 📦 Atualizar estoque manualmente
- 🖼️ Upload de fotos de produtos
- 💰 Editar preços
- 📈 Ver produtos mais consultados
- 🗂️ Gerenciar categorias

## 🚀 Stack Tecnológica

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT (JSON Web Tokens)
- **Upload**: Sistema de upload de imagens
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📦 Instalação

### Pré-requisitos

- Node.js 18+ 
- PostgreSQL
- npm ou yarn

### Passo a Passo

1. **Clone o repositório ou extraia os arquivos**

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o banco de dados**

Crie um arquivo `.env` na raiz do projeto:

```env
# Database
DATABASE_URL="postgresql://usuario:senha@localhost:5432/mercado_autonomo?schema=public"

# JWT Secret (gere uma chave secreta forte)
JWT_SECRET="sua_chave_secreta_muito_segura_aqui"

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

4. **Configure o PostgreSQL**

Certifique-se de que o PostgreSQL está rodando e crie o banco:

```sql
CREATE DATABASE mercado_autonomo;
```

5. **Execute as migrations do Prisma**

```bash
npx prisma migrate dev --name init
```

6. **Popule o banco com dados iniciais (seed)**

```bash
npx prisma db seed
```

Isso criará:
- Admin padrão (CPF: 00000000000, Senha: admin123)
- Categorias de exemplo
- 10 produtos de exemplo

7. **Execute o projeto em desenvolvimento**

```bash
npm run dev
```

8. **Acesse a aplicação**

Abra [http://localhost:3000](http://localhost:3000)

## 👥 Credenciais Padrão

### Administrador
- **CPF**: 00000000000
- **Senha**: admin123

### Moradores
- Qualquer CPF válido (11 dígitos)
- Apenas nome completo
- Cadastro automático no primeiro acesso

## 📁 Estrutura do Projeto

```
MERCADO AUTONOMO/
├── app/
│   ├── api/              # Rotas da API
│   │   ├── auth/         # Autenticação
│   │   ├── products/     # CRUD de produtos
│   │   ├── categories/   # CRUD de categorias
│   │   ├── admin/        # Endpoints admin
│   │   └── upload/       # Upload de imagens
│   ├── admin/            # Painel administrativo
│   ├── cart/             # Página do carrinho
│   ├── login/            # Página de login
│   ├── layout.tsx        # Layout principal
│   ├── page.tsx          # Página inicial (catálogo)
│   └── providers.tsx     # Context providers
├── components/           # Componentes React
│   ├── Navbar.tsx
│   ├── ProductCard.tsx
│   └── SearchBar.tsx
├── contexts/             # React Contexts
│   ├── AuthContext.tsx
│   └── CartContext.tsx
├── lib/                  # Utilitários
│   ├── auth.ts           # Funções de autenticação
│   ├── middleware.ts     # Middleware de autenticação
│   └── prisma.ts         # Cliente Prisma
├── prisma/
│   ├── schema.prisma     # Schema do banco
│   └── seed.ts           # Seed de dados
├── public/
│   └── uploads/          # Imagens enviadas
├── .env                  # Variáveis de ambiente
├── package.json
└── README.md
```

## 🗄️ Schema do Banco de Dados

### Users (Usuários)
- `id`: UUID
- `name`: String (nome completo)
- `cpf`: String (único, 11 dígitos)
- `role`: Enum (ADMIN | USER)
- `password`: String? (opcional, apenas para admin)

### Categories (Categorias)
- `id`: UUID
- `name`: String (único)
- `description`: String?

### Products (Produtos)
- `id`: UUID
- `name`: String
- `description`: String?
- `price`: Float
- `stock`: Int
- `imageUrl`: String?
- `categoryId`: String?
- `views`: Int (contador de visualizações)
- `active`: Boolean

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login de usuário ou admin
- `GET /api/auth/me` - Obter usuário atual (protegido)

### Produtos
- `GET /api/products` - Listar produtos (público)
- `GET /api/products/[id]` - Obter produto específico (público)
- `POST /api/products` - Criar produto (admin)
- `PUT /api/products/[id]` - Atualizar produto (admin)
- `DELETE /api/products/[id]` - Deletar produto (admin)

### Categorias
- `GET /api/categories` - Listar categorias (público)
- `POST /api/categories` - Criar categoria (admin)

### Admin
- `GET /api/admin/stats` - Estatísticas do dashboard (admin)

### Upload
- `POST /api/upload` - Upload de imagem (admin)

## ⚠️ Observações Importantes

1. **Sem Reserva de Produtos**: O carrinho é apenas uma lista de compras. Os produtos NÃO são reservados.

2. **Estoque Sujeito a Disponibilidade**: A aplicação mostra o estoque cadastrado, mas não há garantia de disponibilidade no momento da compra presencial.

3. **Atualização Manual de Estoque**: Por enquanto, o estoque deve ser atualizado manualmente pelo admin. Não há integração automática com a máquina de pagamento.

4. **Sem LocalStorage**: Conforme solicitado, a aplicação usa apenas React state. Ao sair, os dados são perdidos.

5. **Uploads**: As imagens são salvas em `/public/uploads/`. Em produção, considere usar serviços como AWS S3, Cloudinary, etc.

## 🚀 Deploy em Produção

### Recomendações

1. **Vercel** (recomendado para Next.js)
   - Deploy automático a cada push
   - Configure as variáveis de ambiente no dashboard
   - Use um serviço de PostgreSQL em nuvem (Neon, Supabase, Railway)

2. **Banco de Dados**
   - Use PostgreSQL em nuvem
   - Atualize a `DATABASE_URL` no `.env`

3. **Upload de Imagens**
   - Considere usar Cloudinary, AWS S3 ou similar
   - O sistema atual de uploads não funciona bem em serverless

4. **Segurança**
   - Mude o `JWT_SECRET` para uma chave forte
   - Mude a senha do admin padrão

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start

# Prisma Studio (GUI do banco)
npx prisma studio

# Gerar cliente Prisma
npx prisma generate

# Criar migration
npx prisma migrate dev --name nome_da_migration

# Seed do banco
npx prisma db seed
```

## 📝 Próximas Melhorias Sugeridas

- [ ] Integração automática com a máquina de pagamento
- [ ] Histórico de compras dos moradores
- [ ] Sistema de notificações (produtos em falta, novos produtos)
- [ ] Relatórios de vendas
- [ ] Backup automático do banco
- [ ] PWA (Progressive Web App)
- [ ] Sistema de favoritos
- [ ] Modo escuro

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação
2. Confira os logs do console
3. Execute `npx prisma studio` para visualizar o banco

## 📄 Licença

Este projeto foi desenvolvido para uso específico em mercado autônomo de condomínio.

---

**Desenvolvido com ❤️ para facilitar a vida dos moradores**

