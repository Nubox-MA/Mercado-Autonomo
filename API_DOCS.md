# 🔌 API Documentation - Mercado Autônomo

## Base URL
```
http://localhost:3000/api
```

---

## 🔐 Autenticação

### Login
**POST** `/api/auth/login`

**Body:**
```json
{
  "cpf": "12345678901",
  "name": "João Silva",      // Opcional (apenas moradores)
  "password": "senha123"      // Opcional (apenas admin)
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "cpf": "12345678901",
    "role": "USER"
  }
}
```

**Errors:**
- `400` - CPF inválido
- `401` - Senha incorreta (admin)

---

### Obter Usuário Atual
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "cpf": "12345678901",
    "role": "USER",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Token inválido ou ausente
- `404` - Usuário não encontrado

---

## 📦 Produtos

### Listar Produtos (Público)
**GET** `/api/products`

**Query Params:**
- `search` (string) - Buscar por nome ou descrição
- `categoryId` (string) - Filtrar por categoria
- `activeOnly` (boolean) - Apenas produtos ativos

**Example:**
```
GET /api/products?search=coca&categoryId=uuid&activeOnly=true
```

**Response 200:**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Coca-Cola 2L",
      "description": "Refrigerante Coca-Cola 2 litros",
      "price": 8.99,
      "stock": 24,
      "imageUrl": "/uploads/1234-coca.jpg",
      "active": true,
      "views": 45,
      "categoryId": "uuid",
      "category": {
        "id": "uuid",
        "name": "Bebidas"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Obter Produto por ID (Público)
**GET** `/api/products/{id}`

**Response 200:**
```json
{
  "product": {
    "id": "uuid",
    "name": "Coca-Cola 2L",
    "description": "Refrigerante Coca-Cola 2 litros",
    "price": 8.99,
    "stock": 24,
    "imageUrl": "/uploads/1234-coca.jpg",
    "active": true,
    "views": 46,  // Incrementado automaticamente
    "category": {
      "id": "uuid",
      "name": "Bebidas"
    }
  }
}
```

**Errors:**
- `404` - Produto não encontrado

---

### Criar Produto (Admin)
**POST** `/api/products`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Produto Novo",
  "description": "Descrição opcional",
  "price": 9.99,
  "stock": 50,
  "imageUrl": "/uploads/image.jpg",
  "categoryId": "uuid",
  "active": true
}
```

**Response 201:**
```json
{
  "product": {
    "id": "uuid",
    "name": "Produto Novo",
    // ... outros campos
  }
}
```

**Errors:**
- `401` - Não autorizado
- `400` - Dados inválidos

---

### Atualizar Produto (Admin)
**PUT** `/api/products/{id}`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Nome Atualizado",
  "price": 10.99,
  "stock": 30,
  "active": false
}
```

**Response 200:**
```json
{
  "product": {
    "id": "uuid",
    "name": "Nome Atualizado",
    // ... campos atualizados
  }
}
```

**Errors:**
- `401` - Não autorizado
- `400` - Dados inválidos

---

### Deletar Produto (Admin)
**DELETE** `/api/products/{id}`

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Response 200:**
```json
{
  "message": "Produto deletado com sucesso"
}
```

**Errors:**
- `401` - Não autorizado
- `500` - Erro ao deletar

---

## 🗂️ Categorias

### Listar Categorias (Público)
**GET** `/api/categories`

**Response 200:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Bebidas",
      "description": "Refrigerantes, sucos e águas",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "products": 15
      }
    }
  ]
}
```

---

### Criar Categoria (Admin)
**POST** `/api/categories`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Nova Categoria",
  "description": "Descrição opcional"
}
```

**Response 201:**
```json
{
  "category": {
    "id": "uuid",
    "name": "Nova Categoria",
    "description": "Descrição opcional"
  }
}
```

**Errors:**
- `401` - Não autorizado
- `400` - Nome obrigatório

---

## 📊 Admin - Estatísticas

### Dashboard Stats (Admin)
**GET** `/api/admin/stats`

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Response 200:**
```json
{
  "stats": {
    "totalProducts": 50,
    "activeProducts": 45,
    "lowStockProducts": 8,
    "totalUsers": 120,
    "totalCategories": 5,
    "mostViewedProducts": [
      {
        "id": "uuid",
        "name": "Coca-Cola 2L",
        "views": 234,
        "stock": 24,
        "price": 8.99,
        "category": {
          "id": "uuid",
          "name": "Bebidas"
        }
      }
    ]
  }
}
```

**Errors:**
- `401` - Não autorizado (apenas admin)

---

## 🖼️ Upload de Imagens

### Upload (Admin)
**POST** `/api/upload`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data
```

**Body:**
```
file: (binary)
```

**Response 200:**
```json
{
  "imageUrl": "/uploads/1234567890-produto.jpg"
}
```

**Validações:**
- Tipos aceitos: image/jpeg, image/jpg, image/png, image/webp
- Tamanho máximo: 5MB

**Errors:**
- `401` - Não autorizado
- `400` - Arquivo inválido ou muito grande

---

## 🔒 Autenticação e Autorização

### Headers Obrigatórios
Rotas protegidas requerem:
```
Authorization: Bearer {token}
```

### Níveis de Acesso
- **Público**: Login, listar produtos, obter produto, listar categorias
- **Autenticado (USER)**: Obter perfil
- **Admin (ADMIN)**: CRUD de produtos, categorias, upload, stats

### Token JWT
- Expira em: 7 dias
- Payload:
  ```json
  {
    "userId": "uuid",
    "role": "ADMIN" | "USER"
  }
  ```

---

## ⚠️ Códigos de Erro

- `200` - OK
- `201` - Criado com sucesso
- `400` - Requisição inválida (dados incorretos)
- `401` - Não autorizado (token inválido/ausente)
- `404` - Recurso não encontrado
- `500` - Erro interno do servidor

---

## 📝 Exemplos de Uso

### JavaScript/Fetch
```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    cpf: '12345678901', 
    name: 'João Silva' 
  })
})
const { token, user } = await response.json()

// Listar produtos
const products = await fetch('/api/products?activeOnly=true')
const data = await products.json()

// Criar produto (admin)
const newProduct = await fetch('/api/products', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Novo Produto',
    price: 9.99,
    stock: 50
  })
})
```

### Axios
```javascript
import axios from 'axios'

// Configurar axios com token
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { Authorization: `Bearer ${token}` }
})

// Listar produtos
const { data } = await api.get('/products', {
  params: { search: 'coca', activeOnly: true }
})

// Atualizar produto
await api.put(`/products/${productId}`, {
  stock: 100
})
```

---

## 🧪 Testing

### Testar com cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"00000000000","password":"admin123"}'

# Listar produtos
curl http://localhost:3000/api/products

# Criar produto (substitua TOKEN)
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"Teste","price":9.99,"stock":50}'
```

---

**📚 Para mais detalhes, consulte o código em `/app/api`**

