# PayArt

Plataforma Next.js para artistas publicarem obras e compradores descobrirem e salvarem arte. A autenticação e a persistência usam Firebase Authentication e Cloud Firestore.

## Perfis do PayArt

O cadastro permite escolher entre comprador e artista. Depois de entrar, cada tipo de conta acessa sua área em `/painel`: artistas podem publicar e editar obras e personalizar o perfil com foto e banner; compradores podem manter seu perfil de consumidor e explorar o catálogo.

## Exploração e interação

A galeria mostra obras publicadas por artistas que ainda não foram vendidas, com pesquisa por título, categoria, descrição ou artista e filtros por categoria. Cada obra tem uma página de detalhes com favoritos, carrinho, compra, avaliações e chat com o vendedor. O carrinho permite selecionar várias obras ou selecionar todas, soma os preços selecionados e abre um único checkout em `/checkout`, onde o comprador informa o endereço e pode testar as telas demonstrativas de Pix, cartão e boleto. O checkout é totalmente fictício: não se conecta a bancos ou provedores de pagamento, não processa cobranças e não deve receber dados financeiros reais. Ao confirmar uma simulação, registra um pedido de demonstração para cada obra selecionada e marca as obras como vendidas. Artistas podem entrar com uma conta de comprador existente ou criar uma conta de comprador separada; após autenticar/cadastrar, retornam ao checkout pendente. Com Firestore, catálogo, carrinho, mensagens e pedidos são atualizados em tempo real.

O catálogo e o formulário de publicação oferecem categorias consistentes, incluindo desenho, ilustração, arte digital, escultura e grafite. Artistas informam dimensões e peso da embalagem em cada obra; o checkout usa esses dados para calcular opções fictícias de frete e soma a selecionada ao total demonstrativo. A estimativa é feita pelo próprio PayArt, sem consultar transportadoras, API externa ou credenciais, e não representa preço ou prazo real de entrega. O pagamento continua sendo apenas simulado.

As senhas são gerenciadas pelo Firebase Authentication. Perfis, obras, favoritos, carrinhos, avaliações, conversas e pedidos são persistidos no Firestore. Se o Firestore estiver indisponível, os dados de contas locais ficam somente no navegador e não sincronizam. Compradores podem salvar endereço de entrega no perfil privado; o endereço preenchido também é associado ao pedido e fica visível aos participantes daquele pedido para viabilizar a entrega. Fotos de perfil, banners e obras aceitam JPG, PNG e WebP de até 5 MB; o navegador redimensiona e converte as imagens para WebP antes de salvá-las nos documentos do Firestore. Assim, o upload não depende do Firebase Storage nem de upgrade de plano. Os arquivos compactados respeitam o limite de 1 MiB por documento do Firestore; imagens externas também podem ser informadas por URL. Como os perfis e as obras são públicos, suas imagens também ficam públicas. O checkout é apenas uma simulação; não insira dados reais de cartão, não há cobrança, QR Code Pix válido ou boleto pagável.

## Configuração do Firebase

1. Registre um app Web no projeto Firebase e copie as configurações públicas do SDK.
2. Crie `.env.local` na raiz do projeto com os valores correspondentes a `.env.example`. Não envie esse arquivo ao GitHub.
3. No Firebase Console, ative o provedor **E-mail/senha** em Authentication.
4. O banco Cloud Firestore padrão já está criado em `southamerica-east1` (São Paulo), no plano Spark. Publique as regras atualizadas de `firestore.rules` para ativar a marcação de obras vendidas; o alias `.firebaserc` aponta para `payart-22a91`.
5. O Firebase Storage é opcional. O fluxo de imagem do PayArt usa imagens compactadas nos documentos do Firestore e funciona no plano Spark; habilitar Storage em um projeto novo pode exigir o plano Blaze e uma conta de faturamento.
6. Execute `npm install`, `npm run dev` e teste cadastro, login e persistência.

Depois de alterar as regras do Firestore, publique-as com a Firebase CLI; as regras do catálogo agora também permitem que artistas editem os dados de embalagem das próprias obras.

Para publicar futuras alterações das regras com a Firebase CLI, autentique-se no projeto e execute:

```bash
firebase deploy --only firestore:rules
```

## Desenvolvimento local

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
