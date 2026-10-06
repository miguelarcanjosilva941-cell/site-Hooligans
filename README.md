# 🍔 Hooligans - Cardápio Digital & Delivery

Cardápio digital moderno, ultra-rápido e responsivo para a hamburgueria **Hooligans**, desenvolvido com **Vite + JavaScript**.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js instalado (v18+)

### 1. Instalar as dependências
```bash
npm install
```

### 2. Rodar em ambiente de desenvolvimento
```bash
npm run dev
```
O Vite iniciará o servidor local e você poderá acessar pelo navegador (geralmente em `http://localhost:3000`).

### 3. Gerar a versão de produção
```bash
npm run build
```
O comando criará a pasta `dist/` pronta para ser publicada no GitHub Pages, Vercel, Netlify ou qualquer hospedagem estática.

---

## 📋 Funcionalidades Implementadas

- **Design Light Moderno:** Inspirado nos melhores apps de delivery (fundo claro, cards brancos, cantos arredondados, sombras suaves e detalhes em vermelho `#dc2626`).
- **Navegação por Categorias:** Categorias com ícones e contadores de itens (*Artesanais, Podrão, Combos, Porções, Bebidas, Sobremesas*).
- **Busca em Tempo Real:** Pesquise por nome, descrição ou categoria com botão rápido de limpar.
- **Customização de Produtos:**
  - Escolha de adicionais com valores somados em tempo real.
  - Opções de remoção de ingredientes (ex: Sem cebola, Sem tomate, Sem molho).
  - Campo de observações (ex: ponto da carne, etc.).
  - Controle de quantidade (+ e -).
- **Sacola / Carrinho Inteligente:**
  - Barra inferior fixa com resumo e contador de itens.
  - Gaveta/modal com detalhamento de todos os itens e adicionais.
  - Persistência no `localStorage` (o cliente não perde os itens ao recarregar).
- **Entrega (Delivery) ou Retirada:**
  - **Entrega:** soma taxa de R$ 6,00 e solicita endereço completo (Rua, Número, Bairro, Complemento, Ponto de Referência).
  - **Retirada:** taxa grátis e solicita dados de contato.
- **Formas de Pagamento:**
  - PIX (com aviso sobre confirmação).
  - Cartão de Crédito.
  - Cartão de Débito.
  - Dinheiro (com campo dinâmico de troco).
- **Integração com WhatsApp:**
  - Gera automaticamente a mensagem completa e formatada com emojis e quebras de linha.
  - Abre diretamente o WhatsApp no link `wa.me/5531998391633`.

---

## 🛠️ Como Adicionar ou Alterar Produtos

Os produtos e informações da loja ficam salvos no arquivo:
👉 `src/data/products.json` (e também em `public/data/products.json`).

Basta editar esse arquivo JSON para adicionar, remover ou modificar preços, fotos e descrições sem precisar alterar o código!
