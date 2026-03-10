# Como Criar Ícones para PWA

## 📱 Tamanhos Necessários

Você precisa criar **2 ícones**:
- **192x192 pixels** - Para Android
- **512x512 pixels** - Para Android e tela inicial

## 🎨 Como Criar

### **Opção 1: Usar o Logo Existente**
1. Abra o arquivo `logo-nubox.PNG` no Photoshop/GIMP/Canva
2. Redimensione para **192x192** e salve como `icon-192.png`
3. Redimensione para **512x512** e salve como `icon-512.png`
4. Coloque ambos na pasta `public/`

### **Opção 2: Gerador Online**
1. Acesse: https://www.pwabuilder.com/imageGenerator
2. Faça upload do `logo-nubox.PNG`
3. Baixe os ícones gerados
4. Coloque na pasta `public/`

### **Opção 3: Usar Ferramenta de Design**
- **Canva**: Crie design 512x512, exporte também em 192x192
- **Figma**: Exporte em ambos os tamanhos
- **Photoshop**: Redimensione e exporte

## 📁 Estrutura Final

```
public/
  ├── icon-192.png  (192x192 pixels)
  ├── icon-512.png  (512x512 pixels)
  └── logo-nubox.PNG (original)
```

## ✅ Depois de Criar

Depois que criar os ícones, me avise que eu atualizo o `manifest.json` para usar eles!
